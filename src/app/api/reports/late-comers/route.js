import { prisma } from "@/lib/prisma";
import { requireAuth, canViewAttendance, forbiddenResponse, canManageEmployees } from "@/lib/auth-server";
import { getAttendanceDayRange, toTimeInputValue } from "@/lib/attendance-date";
import { parsePagination, buildListPagination } from "@/lib/pagination";
import {
  getActiveShiftsByDepartmentIds,
  formatShiftTimeShort,
  resolveAttendanceShiftDisplay,
} from "@/lib/shift-server";

function buildEmployeeWhere(department, search) {
  const q = (search || "").trim();
  return {
    status: "Active",
    ...(department && department !== "all"
      ? { department: { departmentName: department } }
      : {}),
    ...(q
      ? {
          OR: [
            { employeeCode: { contains: q } },
            { fullName: { contains: q } },
            { department: { departmentName: { contains: q } } },
          ],
        }
      : {}),
  };
}

function formatInTime(value) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  if (!canViewAttendance(user) && !canManageEmployees(user) && !user.permissions?.includes("Generate Reports") && !user.permissions?.includes("View Team Reports")) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const month = searchParams.get("month");
  const year = searchParams.get("year") || String(new Date().getFullYear());
  const department = searchParams.get("department") || "all";
  const search = searchParams.get("search") || "";
  const lateOnly = searchParams.get("lateOnly") === "true";
  const { page, limit, skip } = parsePagination(searchParams);

  let rangeStart;
  let rangeEnd;

  if (dateStr) {
    const { start, end } = getAttendanceDayRange(dateStr);
    rangeStart = start;
    rangeEnd = end;
  } else if (month) {
    const m = Number(month);
    const y = Number(year);
    if (Number.isNaN(m) || Number.isNaN(y) || m < 1 || m > 12) {
      return Response.json({ error: "Valid month and year are required when date is not provided" }, { status: 400 });
    }
    rangeStart = new Date(y, m - 1, 1);
    rangeEnd = new Date(y, m, 1);
  } else {
    return Response.json({ error: "Date or month filter is required" }, { status: 400 });
  }

  const employeeWhere = buildEmployeeWhere(department, search);

  const [employees, totalEmployees, attendanceRows, departmentRows] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      include: { department: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.employee.count({ where: employeeWhere }),
    prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: rangeStart, lt: rangeEnd },
        employee: employeeWhere,
      },
      include: { employee: { include: { department: true } } },
    }),
    prisma.department.findMany({ orderBy: { departmentName: "asc" } }),
  ]);

  const shiftMap = await getActiveShiftsByDepartmentIds(
    prisma,
    employees.map((emp) => emp.departmentId)
  );

  const attendanceByEmployeeDate = new Map();
  for (const row of attendanceRows) {
    const key = `${row.employeeId}:${new Date(row.attendanceDate).toISOString().slice(0, 10)}`;
    attendanceByEmployeeDate.set(key, row);
  }

  const reportRows = [];

  if (dateStr) {
    for (const emp of employees) {
      const att = attendanceByEmployeeDate.get(`${emp.id}:${dateStr}`);
      const shift = shiftMap.get(emp.departmentId) || null;
      const shiftDisplay = att
        ? resolveAttendanceShiftDisplay(shift, att)
        : { shiftTime: shift ? formatShiftTimeShort(shift.startTime) : "—", lateMinutes: null, remark: null };

      const row = {
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        department: emp.department?.departmentName || "—",
        shiftTime: shiftDisplay.shiftTime,
        inTime: att?.inTime ? formatInTime(att.inTime) : "—",
        inTimeInput: att?.inTime ? toTimeInputValue(att.inTime) : "",
        lateMinutes: shiftDisplay.lateMinutes ?? 0,
        remark: shiftDisplay.remark || (att ? "—" : "Absent"),
        attendanceStatus: att?.attendanceStatus || "Absent",
        attendanceDate: dateStr,
      };

      if (lateOnly && !(row.lateMinutes > 0)) continue;
      reportRows.push(row);
    }
  } else {
    for (const att of attendanceRows) {
      const emp = att.employee;
      if (!emp) continue;
      const shift = shiftMap.get(emp.departmentId) || null;
      const shiftDisplay = resolveAttendanceShiftDisplay(shift, att);
      const attDate = new Date(att.attendanceDate).toISOString().slice(0, 10);

      const row = {
        employeeCode: emp.employeeCode,
        employeeName: emp.fullName,
        department: emp.department?.departmentName || "—",
        shiftTime: shiftDisplay.shiftTime,
        inTime: att.inTime ? formatInTime(att.inTime) : "—",
        inTimeInput: att.inTime ? toTimeInputValue(att.inTime) : "",
        lateMinutes: shiftDisplay.lateMinutes ?? 0,
        remark: shiftDisplay.remark || "—",
        attendanceStatus: att.attendanceStatus,
        attendanceDate: attDate,
      };

      if (lateOnly && !(row.lateMinutes > 0)) continue;
      reportRows.push(row);
    }
    reportRows.sort((a, b) => {
      const dateCmp = b.attendanceDate.localeCompare(a.attendanceDate);
      if (dateCmp !== 0) return dateCmp;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }

  const pagedRows = reportRows.slice(skip, skip + limit);

  const markedStatuses = new Set(["Present", "Late", "Half_Day"]);
  let onTimeEmployees = 0;
  let lateComers = 0;
  let absentEmployees = 0;

  if (dateStr) {
    for (const emp of employees) {
      const att = attendanceByEmployeeDate.get(`${emp.id}:${dateStr}`);
      if (!att || att.attendanceStatus === "Absent") {
        absentEmployees += 1;
        continue;
      }
      if (!markedStatuses.has(att.attendanceStatus) || !att.inTime) {
        continue;
      }
      const shift = shiftMap.get(emp.departmentId) || null;
      const metrics = resolveAttendanceShiftDisplay(shift, att);
      if ((metrics.lateMinutes ?? 0) > 0) lateComers += 1;
      else onTimeEmployees += 1;
    }
  } else {
    const seen = new Set();
    for (const row of reportRows) {
      const key = `${row.employeeCode}:${row.attendanceDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (row.attendanceStatus === "Absent" || row.inTime === "—") {
        absentEmployees += 1;
      } else if ((row.lateMinutes ?? 0) > 0) {
        lateComers += 1;
      } else if (markedStatuses.has(row.attendanceStatus)) {
        onTimeEmployees += 1;
      }
    }
  }

  return Response.json({
    date: dateStr || null,
    month: month ? Number(month) : null,
    year: Number(year),
    rows: pagedRows,
    summary: {
      totalEmployees: dateStr ? employees.length : totalEmployees,
      onTimeEmployees,
      lateComers,
      absentEmployees,
    },
    departmentFilters: departmentRows.map((d) => ({
      value: d.departmentName,
      label: d.departmentName,
    })),
    pagination: buildListPagination({ page, limit, total: reportRows.length }),
  });
}
