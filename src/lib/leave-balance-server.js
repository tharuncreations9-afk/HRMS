import { buildLeaveBalancesFromRows } from "@/lib/leave-balance";

function yearBounds(year) {
  return {
    start: new Date(`${year}-01-01T00:00:00.000Z`),
    end: new Date(`${year}-12-31T23:59:59.999Z`),
  };
}

export async function getApprovedAndPendingByType(prisma, employeeId, year) {
  const { start, end } = yearBounds(year);
  const baseWhere = {
    employeeId,
    fromDate: { gte: start, lte: end },
  };

  const [approvedRows, pendingRows] = await Promise.all([
    prisma.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      where: { ...baseWhere, finalStatus: "Approved" },
      _sum: { totalDays: true },
    }),
    prisma.leaveRequest.groupBy({
      by: ["leaveTypeId"],
      where: { ...baseWhere, finalStatus: "Pending" },
      _sum: { totalDays: true },
    }),
  ]);

  return {
    approvedByTypeId: Object.fromEntries(
      approvedRows.map((row) => [row.leaveTypeId, Number(row._sum.totalDays || 0)])
    ),
    pendingByTypeId: Object.fromEntries(
      pendingRows.map((row) => [row.leaveTypeId, Number(row._sum.totalDays || 0)])
    ),
  };
}

export async function syncLeaveBalances(prisma, employeeId, year) {
  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
  });

  const { approvedByTypeId } = await getApprovedAndPendingByType(prisma, employeeId, year);

  await Promise.all(
    balances.map((balance) => {
      const used = approvedByTypeId[balance.leaveTypeId] || 0;
      const total = Number(balance.totalLeave);
      const remaining = Math.max(0, total - used);

      return prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { usedLeave: used, remainingLeave: remaining },
      });
    })
  );

  return balances;
}

export async function getEmployeeLeaveBalanceSummary(prisma, employeeId, year) {
  await syncLeaveBalances(prisma, employeeId, year);

  const [balances, { approvedByTypeId, pendingByTypeId }] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    }),
    getApprovedAndPendingByType(prisma, employeeId, year),
  ]);

  return buildLeaveBalancesFromRows(balances, approvedByTypeId, pendingByTypeId);
}

export async function getAllEmployeesLeaveBalances(prisma, year) {
  const employees = await prisma.employee.findMany({
    where: { status: "Active" },
    include: { department: true },
    orderBy: { fullName: "asc" },
  });

  const rows = [];
  for (const emp of employees) {
    const { leaveBalances } = await getEmployeeLeaveBalanceSummary(prisma, emp.id, year);
    rows.push({
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      department: emp.department?.departmentName || "",
      balances: leaveBalances,
    });
  }
  return rows;
}

export async function getAvailableLeaveDays(prisma, employeeId, leaveTypeId, year) {
  const { leaveTypeBalances } = await getEmployeeLeaveBalanceSummary(prisma, employeeId, year);
  const balance = await prisma.leaveBalance.findFirst({
    where: { employeeId, leaveTypeId, year },
    include: { leaveType: true },
  });

  if (!balance) return { available: 0, total: 0, used: 0, pending: 0 };

  const summary = leaveTypeBalances[balance.leaveType.leaveName];
  return summary || { available: 0, total: 0, used: 0, pending: 0 };
}
