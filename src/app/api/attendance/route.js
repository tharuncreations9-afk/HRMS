import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canMarkAttendance,
  canViewAttendance,
  forbiddenResponse,
  canEditAttendanceForDate,
  canRequestAttendanceCorrection,
  canApproveAttendanceCorrection,
} from "@/lib/auth-server";
import { isDateBeforeToday } from "@/lib/utils";
import { getAttendanceDayRange } from "@/lib/attendance-date";
import {
  getAttendanceMarkStatuses,
  getAttendanceListFilters,
  resolveFilterStatusToDb,
  getMarkedStatusDbEnums,
} from "@/lib/attendance-status-server";
import { buildDepartmentFilterOptions } from "@/lib/lookups";
import { parsePagination, buildListPagination } from "@/lib/pagination";
import { mapAttendanceRecords, markEmployeeAttendance, buildAbsentMarkRow } from "@/lib/attendance-mark";

function buildEmployeeSearchWhere(search) {
  const q = (search || "").trim();
  if (!q) return {};
  return {
    OR: [
      { employeeCode: { contains: q } },
      { fullName: { contains: q } },
      { department: { departmentName: { contains: q } } },
    ],
  };
}

function buildAttendanceSearchWhere(search) {
  const q = (search || "").trim();
  if (!q) return {};
  return {
    OR: [
      { employeeCode: { contains: q } },
      { employee: { fullName: { contains: q } } },
      { employee: { department: { departmentName: { contains: q } } } },
    ],
  };
}

async function getAttendanceCounts(prisma, start, end, markedDbEnums) {
  const [markedCount, activeCount] = await Promise.all([
    prisma.attendance.count({
      where: {
        attendanceDate: { gte: start, lt: end },
        attendanceStatus: { in: markedDbEnums },
      },
    }),
    prisma.employee.count({ where: { status: "Active" } }),
  ]);
  return { markedCount, absentCount: Math.max(0, activeCount - markedCount) };
}

async function fetchMarkedAttendancePage(prisma, { start, end, department, status, search, skip, limit, markedDbEnums }) {
  const where = {
    attendanceDate: { gte: start, lt: end },
    attendanceStatus: { in: markedDbEnums },
  };

  const enumStatus = await resolveFilterStatusToDb(prisma, status);
  if (enumStatus) where.attendanceStatus = enumStatus;

  if (department && department !== "all") {
    where.employee = { department: { departmentName: department } };
  }

  const searchWhere = buildAttendanceSearchWhere(search);
  if (searchWhere.OR) {
    where.AND = [searchWhere];
  }

  const [rows, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { include: { department: true } } },
      orderBy: [{ inTime: "asc" }, { employee: { fullName: "asc" } }],
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    records: await mapAttendanceRecords(rows, prisma),
    total,
  };
}

async function fetchAbsentAttendancePage(prisma, { start, end, department, search, skip, limit, markedDbEnums }) {
  const markedRows = await prisma.attendance.findMany({
    where: {
      attendanceDate: { gte: start, lt: end },
      attendanceStatus: { in: markedDbEnums },
    },
    select: { employeeId: true },
  });
  const markedIds = markedRows.map((row) => row.employeeId);

  const where = {
    status: "Active",
    ...(markedIds.length ? { id: { notIn: markedIds } } : {}),
    ...(department && department !== "all"
      ? { department: { departmentName: department } }
      : {}),
    ...buildEmployeeSearchWhere(search),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true },
      orderBy: { fullName: "asc" },
      skip,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    records: employees.map(buildAbsentMarkRow),
    total,
  };
}

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  if (!canViewAttendance(user)) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const department = searchParams.get("department") || "all";
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const { page, limit, skip } = parsePagination(searchParams);
  const { start, end } = getAttendanceDayRange(dateStr);

  const [departmentRows, markedDbEnums, statusFilters, markStatuses] = await Promise.all([
    prisma.department.findMany({ orderBy: { departmentName: "asc" } }),
    getMarkedStatusDbEnums(prisma),
    getAttendanceListFilters(prisma),
    getAttendanceMarkStatuses(prisma),
  ]);

  const counts = await getAttendanceCounts(prisma, start, end, markedDbEnums);

  const departmentOptions = departmentRows.map((d) => ({
    id: d.id,
    value: d.departmentName,
    label: d.departmentName,
    departmentName: d.departmentName,
  }));

  const pageResult =
    status === "Absent"
      ? await fetchAbsentAttendancePage(prisma, { start, end, department, search, skip, limit, markedDbEnums })
      : await fetchMarkedAttendancePage(prisma, {
          start,
          end,
          department,
          status,
          search,
          skip,
          limit,
          markedDbEnums,
        });

  return Response.json({
    records: pageResult.records,
    absentCount: counts.absentCount,
    markedCount: counts.markedCount,
    statusFilters,
    departmentFilters: buildDepartmentFilterOptions(departmentOptions),
    markStatuses,
    date: dateStr,
    pagination: buildListPagination({ page, limit, total: pageResult.total }),
    employees: [],
  });
}

export async function POST(request) {
  const { user: authUser, error } = await requireAuth(request);
  if (error) return error;
  if (!canMarkAttendance(authUser)) return forbiddenResponse();

  try {
    const body = await request.json();
    const { date, employeeCode, status: statusApi, present, halfDay, leave, inTime, outTime } = body;

    if (!date || !employeeCode) {
      return Response.json({ error: "Date and employee are required" }, { status: 400 });
    }

    let statusApiValue = statusApi;
    if (!statusApiValue) {
      if (present) statusApiValue = "present";
      else if (halfDay) statusApiValue = "halfDay";
      else if (leave) statusApiValue = "leave";
    }

    const canEditPast = canEditAttendanceForDate(authUser, date);
    if (isDateBeforeToday(date) && !canEditPast) {
      return Response.json(
        { error: "Previous date attendance is locked. Submit a correction request for approval." },
        { status: 403 }
      );
    }

    const record = await markEmployeeAttendance(prisma, authUser, {
      date,
      employeeCode,
      statusApi: statusApiValue,
      inTime,
      outTime,
    });

    return Response.json({ success: true, record });
  } catch (err) {
    console.error("Mark attendance error:", err);
    return Response.json({ error: err.message || "Failed to mark attendance" }, { status: 500 });
  }
}
