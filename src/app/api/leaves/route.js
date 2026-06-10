import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { createNotification, getUsersByRole, notifyUsers } from "@/lib/notifications";
import { countLeaveDays } from "@/lib/leave-balance";
import { isDateBeforeToday } from "@/lib/utils";
import {
  getAllEmployeesLeaveBalances,
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

  const year = new Date().getFullYear();

  const superAdmin = isSuperAdmin(user);

  const [leaveTypes, requests, holidays, balanceSummary, employeeLeaveBalances] =
    await Promise.all([
      prisma.leaveType.findMany(),
      getLeaveRequestsForUser(user),
      prisma.holiday.findMany({ orderBy: { holidayDate: "asc" } }),
      !superAdmin && user.employeeId
        ? getEmployeeLeaveBalanceSummary(prisma, user.employeeId, year)
        : Promise.resolve({ leaveBalances: {}, leaveTypeBalances: {} }),
      superAdmin
        ? getAllEmployeesLeaveBalances(prisma, year)
        : Promise.resolve([]),
    ]);

  const { leaveBalances, leaveTypeBalances } = balanceSummary;

  return Response.json({
    viewMode: superAdmin ? "all" : "self",
    canApply: canUserApplyLeave(user),
    leaveBalances,
    leaveTypeBalances,
    employeeLeaveBalances,
    leaveRequests: requests,
    holidays: holidays.map((h) => ({
      date: h.holidayDate.toISOString().split("T")[0],
      name: h.holidayName,
    })),
    leaveTypes: leaveTypes.map((t) => t.leaveName),
  });
}

async function getLeaveRequestsForUser(user) {
  const include = {
    employee: { include: { department: true } },
    leaveType: true,
  };

  if (
    user.permissions.includes("Full System Access") ||
    user.permissions.includes("All Permissions") ||
    user.permissions.includes("Approve Any Leave")
  ) {
    const rows = await prisma.leaveRequest.findMany({ include, orderBy: { createdAt: "desc" } });
    return rows.map(mapLeaveRequest);
  }

  if (user.permissions.includes("View Team Leave Requests") && user.employeeId) {
    const team = await prisma.employee.findMany({
      where: { reportingManagerId: user.employeeId },
      select: { id: true },
    });
    const teamIds = team.map((t) => t.id);
    const rows = await prisma.leaveRequest.findMany({
      where: { employeeId: { in: teamIds } },
      include,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapLeaveRequest);
  }

  if (
    user.permissions.includes("View Leave Requests") ||
    user.permissions.includes("Final Leave Approval") ||
    user.role === "hr"
  ) {
    const rows = await prisma.leaveRequest.findMany({ include, orderBy: { createdAt: "desc" } });
    return rows.map(mapLeaveRequest);
  }

  if (user.employeeId) {
    const rows = await prisma.leaveRequest.findMany({
      where: { employeeId: user.employeeId },
      include,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapLeaveRequest);
  }

  return [];
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
