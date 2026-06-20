import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { createNotification, getUsersByRole, notifyUsers } from "@/lib/notifications";
import { countLeaveDays } from "@/lib/leave-balance";
import { buildLeaveTypeMeta, LEAVE_REQUEST_STATUS_FILTERS } from "@/lib/lookups";
import { isDateBeforeToday } from "@/lib/utils";
import { parsePagination, buildListPagination } from "@/lib/pagination";
import {
  getPaginatedEmployeesLeaveBalances,
  getAvailableLeaveDays,
  getEmployeeLeaveBalanceSummary,
} from "@/lib/leave-balance-server";

function isSuperAdmin(user) {
  return user.role === "super_admin";
}

function canUserApplyLeave(user) {
  if (isSuperAdmin(user) || !user.employeeId) return false;
  return user.permissions.includes("Apply Leave");
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const statusFilter = searchParams.get("status") || "all";
  const balancePage = Math.max(1, parseInt(searchParams.get("balancePage") || "1", 10));
  const balanceLimit = Math.min(100, Math.max(1, parseInt(searchParams.get("balanceLimit") || "25", 10)));
  const balanceSkip = (balancePage - 1) * balanceLimit;

  const year = new Date().getFullYear();
  const superAdmin = isSuperAdmin(user);

  const [leaveTypes, requestData, holidays, balanceSummary, balancePageData] =
    await Promise.all([
      prisma.leaveType.findMany(),
      getLeaveRequestsForUser(user, { statusFilter, skip, limit }),
      prisma.holiday.findMany({ orderBy: { holidayDate: "asc" } }),
      !superAdmin && user.employeeId
        ? getEmployeeLeaveBalanceSummary(prisma, user.employeeId, year)
        : Promise.resolve({ leaveBalances: {}, leaveTypeBalances: {} }),
      superAdmin
        ? getPaginatedEmployeesLeaveBalances(prisma, year, balanceSkip, balanceLimit)
        : Promise.resolve({ rows: [], total: 0 }),
    ]);

  const { leaveBalances, leaveTypeBalances } = balanceSummary;
  const employeeLeaveBalances = balancePageData.rows;

  return Response.json({
    viewMode: superAdmin ? "all" : "self",
    canApply: canUserApplyLeave(user),
    leaveBalances,
    leaveTypeBalances,
    employeeLeaveBalances,
    balancePagination: buildListPagination({
      page: balancePage,
      limit: balanceLimit,
      total: balancePageData.total,
    }),
    leaveRequests: requestData.rows,
    leaveRequestPagination: requestData.pagination,
    leaveRequestStatusFilters: LEAVE_REQUEST_STATUS_FILTERS,
    holidays: holidays.map((h) => ({
      date: h.holidayDate.toISOString().split("T")[0],
      name: h.holidayName,
    })),
    leaveTypes: leaveTypes.map((t) => t.leaveName),
    leaveTypeMeta: buildLeaveTypeMeta(leaveTypes),
    leaveTypeOptions: leaveTypes.map((t) => ({
      id: t.id,
      leaveName: t.leaveName,
      yearlyLimit: t.yearlyLimit,
    })),
  });
}

async function getLeaveRequestsForUser(user, { statusFilter = "all", skip = 0, limit = 25 } = {}) {
  const include = {
    employee: { include: { department: true } },
    leaveType: true,
  };

  const statusWhere =
    statusFilter && statusFilter !== "all"
      ? { finalStatus: statusFilter }
      : {};

  let where = statusWhere;

  if (
    user.permissions.includes("Full System Access") ||
    user.permissions.includes("All Permissions") ||
    user.permissions.includes("Approve Any Leave")
  ) {
    // all requests
  } else if (user.permissions.includes("View Team Leave Requests") && user.employeeId) {
    const team = await prisma.employee.findMany({
      where: { reportingManagerId: user.employeeId },
      select: { id: true },
    });
    const teamIds = team.map((t) => t.id);
    where = { ...statusWhere, employeeId: { in: teamIds } };
  } else if (
    user.permissions.includes("View Leave Requests") ||
    user.permissions.includes("Final Leave Approval") ||
    user.role === "hr"
  ) {
    // all requests
  } else if (user.employeeId) {
    where = { ...statusWhere, employeeId: user.employeeId };
  } else {
    return { rows: [], pagination: buildListPagination({ page: 1, limit, total: 0 }) };
  }

  const [rows, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return {
    rows: rows.map(mapLeaveRequest),
    pagination: buildListPagination({ page: Math.floor(skip / limit) + 1, limit, total }),
  };
}

function mapLeaveRequest(r) {
  return {
    id: r.id,
    employeeCode: r.employee.employeeCode,
    employeeName: r.employee.fullName,
    department: r.employee.department.departmentName,
    leaveType: r.leaveType.leaveName,
    from: r.fromDate.toISOString().split("T")[0],
    to: r.toDate.toISOString().split("T")[0],
    days: Number(r.totalDays),
    reason: r.reason,
    status: r.finalStatus,
    managerStatus: r.managerStatus,
    hrStatus: r.hrStatus,
  };
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!canUserApplyLeave(user)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const leaveType = await prisma.leaveType.findFirst({
    where: { leaveName: body.leaveType },
  });
  if (!leaveType) return Response.json({ error: "Invalid leave type" }, { status: 400 });

  if (!body.fromDate || !body.toDate) {
    return Response.json({ error: "From date and to date are required" }, { status: 400 });
  }

  if (isDateBeforeToday(body.fromDate) || isDateBeforeToday(body.toDate)) {
    return Response.json({ error: "Cannot apply leave for past dates" }, { status: 400 });
  }

  if (body.toDate < body.fromDate) {
    return Response.json({ error: "To date cannot be before from date" }, { status: 400 });
  }

  const from = new Date(body.fromDate);
  const to = new Date(body.toDate);
  const days = countLeaveDays(body.fromDate, body.toDate);

  if (days <= 0) {
    return Response.json({ error: "Invalid date range" }, { status: 400 });
  }

  const year = new Date().getFullYear();

  const existingBalance = await prisma.leaveBalance.findFirst({
    where: { employeeId: user.employeeId, leaveTypeId: leaveType.id, year },
  });

  if (!existingBalance) {
    await prisma.leaveBalance.create({
      data: {
        employeeId: user.employeeId,
        leaveTypeId: leaveType.id,
        totalLeave: leaveType.yearlyLimit,
        usedLeave: 0,
        remainingLeave: leaveType.yearlyLimit,
        year,
      },
    });
  }

  const { available, used, total, pending } = await getAvailableLeaveDays(
    prisma,
    user.employeeId,
    leaveType.id,
    year
  );

  if (available <= 0) {
    return Response.json(
      { error: `No ${body.leaveType} balance left. Used: ${used}, Total: ${total}` },
      { status: 400 }
    );
  }

  if (days > available) {
    return Response.json(
      {
        error: `Only ${available} day(s) available for ${body.leaveType} (${pending} day(s) already pending)`,
      },
      { status: 400 }
    );
  }

  const request_ = await prisma.leaveRequest.create({
    data: {
      employeeId: user.employeeId,
      leaveTypeId: leaveType.id,
      fromDate: from,
      toDate: to,
      totalDays: days,
      reason: body.reason,
      createdBy: user.id,
    },
    include: { employee: true, leaveType: true },
  });

  await createAuditLog({
    userId: user.id,
    moduleName: "Leave Management",
    actionType: "CREATE",
    newValue: { leaveType: body.leaveType, from: body.fromDate, to: body.toDate },
  });

  const manager = await prisma.employee.findUnique({
    where: { id: user.employeeId },
    select: { reportingManagerId: true },
  });
  if (manager?.reportingManagerId) {
    await createNotification({
      employeeId: manager.reportingManagerId,
      title: "Team Leave Request",
      message: `${user.name} applied for ${body.leaveType} (${days} days).`,
      module: "Leave Management",
    });
  }

  const applicantName = request_.employee.fullName || user.name;
  const leaveMessage = `${applicantName} applied for ${body.leaveType} (${days} day(s)). Review and approve.`;

  const hrUsers = await getUsersByRole("hr");
  await notifyUsers(hrUsers, {
    title: "Leave Approval Required",
    message: leaveMessage,
    module: "Leave Management",
  });

  const superAdmins = await getUsersByRole("super_admin");
  await notifyUsers(superAdmins, {
    title: "Leave Approval Required",
    message: leaveMessage,
    module: "Leave Management",
  });

  return Response.json({ request: mapLeaveRequest({ ...request_, employee: { ...request_.employee, department: { departmentName: "" } } }) });
}
