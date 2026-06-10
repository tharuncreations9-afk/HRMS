export const LEAVE_TYPE_KEYS = {
  "Casual Leave": "casualLeave",
  "Sick Leave": "sickLeave",
  "Earned Leave": "earnedLeave",
  "Optional Holiday": "optionalHoliday",
  "Comp Off": "compOff",
};

/** Used/pending come from leave requests — single source of truth with the table below. */
export function buildLeaveBalancesFromRows(
  balanceRows,
  approvedByTypeId = {},
  pendingByTypeId = {}
) {
  const leaveBalances = Object.fromEntries(
    Object.values(LEAVE_TYPE_KEYS).map((key) => [
      key,
      { total: 0, used: 0, remaining: 0, pending: 0, available: 0 },
    ])
  );

  const leaveTypeBalances = {};

  balanceRows.forEach((b) => {
    const name = b.leaveType.leaveName;
    const camelKey = LEAVE_TYPE_KEYS[name];
    if (!camelKey) return;

    const total = Number(b.totalLeave);
    const used = Number(approvedByTypeId[b.leaveTypeId] || 0);
    const pending = Number(pendingByTypeId[b.leaveTypeId] || 0);
    const remaining = Math.max(0, total - used);
    const available = Math.max(0, remaining - pending);

    const entry = { total, used, remaining, pending, available };
    leaveBalances[camelKey] = entry;
    leaveTypeBalances[name] = entry;
  });

  return { leaveBalances, leaveTypeBalances };
}

export function countLeaveDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return 0;
  }
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
}
