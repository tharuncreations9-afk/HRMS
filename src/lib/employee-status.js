import { getEmployeeIdsOnLeaveToday } from "@/lib/leave-attendance-sync";

export { getEmployeeIdsOnLeaveToday };

export const EMPLOYEE_DB_STATUSES = ["Active", "Inactive", "On_Hold", "Terminated"];

export const EMPLOYEE_FORM_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "On_Hold", label: "On Hold" },
  { value: "Terminated", label: "Terminated" },
];

export const EMPLOYEE_LIST_STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  ...EMPLOYEE_FORM_STATUS_OPTIONS,
  { value: "On Leave", label: "On Leave" },
];

export const ON_LEAVE_FILTER = "On Leave";

export function formatDbStatus(status) {
  if (!status) return "";
  return String(status).replace(/_/g, " ");
}

export function parseStatusInput(value) {
  if (!value) return null;
  const normalized = String(value).trim().replace(/\s+/g, "_");
  return EMPLOYEE_DB_STATUSES.includes(normalized) ? normalized : null;
}

export function isValidDbStatus(value) {
  return parseStatusInput(value) !== null;
}

export function computeDisplayStatus(dbStatus, isOnLeaveToday) {
  if (dbStatus === "Active" && isOnLeaveToday) return ON_LEAVE_FILTER;
  return formatDbStatus(dbStatus);
}

export function applyStatusFilter(where, statusFilter, onLeaveIds) {
  if (!statusFilter || statusFilter === "all") return;

  if (statusFilter === ON_LEAVE_FILTER) {
    where.AND.push({ status: "Active" });
    const ids = [...onLeaveIds];
    where.AND.push(ids.length ? { id: { in: ids } } : { id: -1 });
    return;
  }

  if (statusFilter === "Active") {
    where.AND.push({ status: "Active" });
    const ids = [...onLeaveIds];
    if (ids.length) {
      where.AND.push({ id: { notIn: ids } });
    }
    return;
  }

  const dbStatus = parseStatusInput(statusFilter);
  if (dbStatus) {
    where.AND.push({ status: dbStatus });
  }
}
