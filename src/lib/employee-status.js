import { getEmployeeIdsOnLeaveToday } from "@/lib/leave-attendance-sync";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_LIST_STATUS_FILTERS as LOOKUP_STATUS_FILTERS,
} from "@/lib/lookups";

export { getEmployeeIdsOnLeaveToday };

export const EMPLOYEE_DB_STATUSES = EMPLOYEE_STATUSES.map((s) => s.value);

export const EMPLOYEE_FORM_STATUS_OPTIONS = EMPLOYEE_STATUSES;

export const EMPLOYEE_LIST_STATUS_FILTERS = LOOKUP_STATUS_FILTERS;

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
