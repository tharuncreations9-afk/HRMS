import { prisma } from "@/lib/prisma";
import { requireAuth, canViewAttendance, forbiddenResponse, canManageEmployees } from "@/lib/auth-server";
import {
  computeMonthlyAttendanceStats,
  formatAttendanceReportHeader,
  getMonthIndexFromName,
} from "@/lib/attendance-monthly-report";

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

function canAccessReport(user) {
  return (
    canViewAttendance(user) ||
    canManageEmployees(user) ||
    user.permissions?.includes("Generate Reports") ||
    user.permissions?.includes("View Team Reports") ||
    user.permissions?.includes("Full System Access") ||
    user.permissions?.includes("All Permissions")
  );
}

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  if (!canAccessReport(user)) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const monthName = searchParams.get("month");
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const department = searchParams.get("department") || "all";
  const search = searchParams.get("search") || "";

  const monthIndex = getMonthIndexFromName(monthName);
  if (!monthName || !monthIndex) {
    return Response.json({ error: "Valid month is required" }, { status: 400 });
  }
  if (Number.isNaN(year)) {
    return Response.json({ error: "Valid year is required" }, { status: 400 });
  }

  const rangeStart = new Date(year, monthIndex - 1, 1);
  const rangeEnd = new Date(year, monthIndex, 1);
  const employeeWhere = buildEmployeeWhere(department, search);

  const [employees, attendanceRows, departmentRows] = await Promise.all([
    prisma.employee.findMany({
      where: employeeWhere,
      include: { department: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        attendanceDate: { gte: rangeStart, lt: rangeEnd },
        employee: employeeWhere,
      },
      select: {
        employeeId: true,
        attendanceDate: true,
        attendanceStatus: true,
        lateMinutes: true,
      },
    }),
    prisma.department.findMany({ orderBy: { departmentName: "asc" } }),
  ]);

  const attendanceByEmployee = new Map();
  for (const row of attendanceRows) {
    if (!attendanceByEmployee.has(row.employeeId)) {
      attendanceByEmployee.set(row.employeeId, []);
    }
    attendanceByEmployee.get(row.employeeId).push(row);
  }

  const rows = employees.map((emp, index) => {
    const records = attendanceByEmployee.get(emp.id) || [];
    const stats = computeMonthlyAttendanceStats(records, year, monthIndex);

    return {
      sno: index + 1,
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      department: emp.department?.departmentName || "—",
      ...stats,
    };
  });

  return Response.json({
    month: monthName,
    year,
    headerTitle: formatAttendanceReportHeader(monthName, year),
    department,
    search,
    rows,
    departmentFilters: departmentRows.map((d) => ({
      value: d.departmentName,
      label: d.departmentName,
    })),
  });
}
