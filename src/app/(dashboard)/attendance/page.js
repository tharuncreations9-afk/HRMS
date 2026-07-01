"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Printer, Search, Clock, Users, UserCheck, UserX, Loader2, Lock, FileEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPagination } from "@/components/ui/list-pagination";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useLookups } from "@/hooks/use-lookups";
import { getLocalDateString } from "@/lib/utils";
import { getLocalTimeString, resolveHalfDayOutTime } from "@/lib/attendance-date";
import { AttendanceCorrectionDialog } from "@/components/attendance/attendance-correction-dialog";

function statusAllowsOutTime(statusValue) {
  return statusValue === "present" || statusValue === "late" || statusValue === "halfDay";
}

function getAutoSaveTimes(statusValue) {
  if (statusValue === "present") {
    return { inTime: getLocalTimeString(), outTime: undefined };
  }
  if (statusValue === "halfDay") {
    // Do not send inTime — server keeps existing arrival time from Present
    return { inTime: undefined, outTime: resolveHalfDayOutTime() };
  }
  if (statusValue === "leave" || statusValue === "absent") {
    return { inTime: undefined, outTime: undefined };
  }
  return { inTime: getLocalTimeString(), outTime: undefined };
}

function getRowStatusClass(statusValue) {
  switch (statusValue) {
    case "present":
      return "bg-emerald-50/70 dark:bg-emerald-950/20";
    case "halfDay":
      return "bg-amber-50/70 dark:bg-amber-950/20";
    case "leave":
    case "absent":
      return "bg-red-50/60 dark:bg-red-950/15";
    default:
      return "";
  }
}

function getStatusBadgeVariant(statusValue) {
  switch (statusValue) {
    case "present":
      return "success";
    case "halfDay":
      return "warning";
    case "leave":
    case "absent":
      return "destructive";
    default:
      return "outline";
  }
}

function formatDisplayTime(value) {
  if (!value || value === "—") return "—";
  return value;
}

function formatLateMinutes(value) {
  if (value == null || value === "") return "—";
  return String(value);
}

function formatRemark(value) {
  if (!value) return "—";
  return value;
}

export default function DailyAttendancePage() {
  const { user, hasPermission } = useAuth();
  const { lookups } = useLookups();
  const canMark =
    hasPermission("Mark Attendance") ||
    hasPermission("Full System Access") ||
    user?.role === "security" ||
    user?.role === "super_admin";

  const [rows, setRows] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [departmentFilters, setDepartmentFilters] = useState([]);
  const [markedCount, setMarkedCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(null);
  const today = getLocalDateString();
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState(null);
  const [printRows, setPrintRows] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [canRequestCorrection, setCanRequestCorrection] = useState(false);
  const [correctionReasons, setCorrectionReasons] = useState([]);
  const [correctionRow, setCorrectionRow] = useState(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  useEffect(() => {
    if (lookups?.pagination?.defaultLimit && limit === null) {
      setLimit(lookups.pagination.defaultLimit);
    }
  }, [lookups, limit]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [date, departmentFilter, statusFilter, debouncedSearch, limit]);

  const loadMarkSheet = useCallback(() => {
    if (!limit) return;
    setLoading(true);
    api
      .attendanceMarkSheet({
        date,
        page: String(page),
        limit: String(limit),
        department: departmentFilter,
        status: statusFilter,
        search: debouncedSearch,
      })
      .then((data) => {
        setRows(data.rows || []);
        setStatuses(data.statuses || lookups?.attendanceMarkStatuses || []);
        setStatusFilters(data.statusFilters || lookups?.attendanceStatusFilters || []);
        setDepartmentFilters(data.departmentFilters || lookups?.attendanceDepartmentFilters || []);
        setMarkedCount(data.markedCount || 0);
        setAbsentCount(data.absentCount || 0);
        setPagination(data.pagination || null);
        setIsLocked(Boolean(data.isLocked));
        setCanEdit(Boolean(data.canEdit));
        setCanRequestCorrection(Boolean(data.canRequestCorrection));
        setCorrectionReasons(data.correctionReasons || []);
      })
      .catch((err) => toast.error(err.message || "Failed to load attendance"))
      .finally(() => setLoading(false));
  }, [date, page, limit, departmentFilter, statusFilter, debouncedSearch, lookups]);

  useEffect(() => {
    loadMarkSheet();
  }, [loadMarkSheet]);

  const statusByValue = useMemo(() => new Map(statuses.map((s) => [s.value, s])), [statuses]);

  const canEditDate = canEdit;
  const datePickerMax = today;

  const handleDateChange = (value) => {
    if (value > today) {
      toast.error("Cannot select a future date");
      return;
    }
    setDate(value);
  };

  const openCorrectionDialog = (row) => {
    setCorrectionRow(row);
    setCorrectionOpen(true);
  };

  const updateRowAfterSave = (employeeCode, record, statusValue) => {
    setRows((prev) =>
      prev.map((row) =>
        row.employeeCode === employeeCode
          ? {
              ...row,
              markStatusValue: statusValue,
              statusLabel: statusByValue.get(statusValue)?.label || record.status,
              status: record.status,
              inTime: record.inTime,
              inTimeInput: record.inTimeInput || "",
              outTime: record.outTime,
              outTimeInput: record.outTimeInput || "",
              shiftTime: record.shiftTime ?? row.shiftTime,
              lateMinutes: record.lateMinutes ?? null,
              attendanceRemark: record.attendanceRemark ?? null,
              badgeVariant: getStatusBadgeVariant(statusValue),
              isAbsent: false,
            }
          : row
      )
    );
  };

  const handleStatusChange = async (row, statusValue) => {
    if (!canEditDate || savingCode) return;
    if (row.markStatusValue === statusValue) return;

    const { inTime, outTime } = getAutoSaveTimes(statusValue);
    const label = statusByValue.get(statusValue)?.label || statusValue;

    setSavingCode(row.employeeCode);
    setRows((prev) =>
      prev.map((r) =>
        r.employeeCode === row.employeeCode
          ? {
              ...r,
              markStatusValue: statusValue,
              statusLabel: label,
              badgeVariant: getStatusBadgeVariant(statusValue),
            }
          : r
      )
    );

    try {
      const result = await api.markAttendance({
        date,
        employeeCode: row.employeeCode,
        status: statusValue,
        inTime,
        outTime,
      });
      updateRowAfterSave(row.employeeCode, result.record, statusValue);
      setMarkedCount((c) => (row.markStatusValue ? c : c + 1));
      if (!row.markStatusValue) setAbsentCount((c) => Math.max(0, c - 1));
      toast.success(`${row.employeeName} — ${label} saved`);
    } catch (err) {
      loadMarkSheet();
      toast.error(err.message || "Failed to save attendance");
    }
    setSavingCode(null);
  };

  const handleOutTimeChange = async (row, outTimeValue) => {
    if (!canEditDate || savingCode || !row.markStatusValue) return;
    if (!statusAllowsOutTime(row.markStatusValue)) return;

    setSavingCode(row.employeeCode);
    try {
      const result = await api.markAttendance({
        date,
        employeeCode: row.employeeCode,
        status: row.markStatusValue,
        inTime: row.inTimeInput || undefined,
        outTime: outTimeValue || undefined,
      });
      updateRowAfterSave(row.employeeCode, result.record, row.markStatusValue);
      toast.success(`${row.employeeName} — out time saved`);
    } catch (err) {
      loadMarkSheet();
      toast.error(err.message || "Failed to save out time");
    }
    setSavingCode(null);
  };

  const markOutNow = (row) => {
    handleOutTimeChange(row, getLocalTimeString());
  };

  const handlePrint = async () => {
    try {
      const data = await api.attendanceMarkSheet({
        date,
        page: "1",
        limit: "500",
        department: departmentFilter,
        status: statusFilter,
        search: debouncedSearch,
      });
      setPrintRows(data.rows || []);
      setTimeout(() => window.print(), 100);
    } catch (err) {
      toast.error(err.message || "Failed to prepare print");
    }
  };

  const dateLabel = new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const rowsForPrint = printRows.length ? printRows : rows;

  const renderStatusBadge = (row) => {
    const label = row.statusLabel || row.status || "Not Marked";
    const variant = row.markStatusValue
      ? getStatusBadgeVariant(row.markStatusValue)
      : row.badgeVariant || "outline";
    return <Badge variant={variant}>{label}</Badge>;
  };

  const renderCorrectionAction = (row) => {
    if (!isLocked || !canRequestCorrection) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => openCorrectionDialog(row)}
      >
        <FileEdit className="h-3.5 w-3.5" /> Correct
      </Button>
    );
  };

  const renderCorrectionReason = (row) => {
    if (!row.correctionReason) return null;
    return (
      <p className="mt-1 max-w-[200px] truncate text-[11px] text-muted-foreground" title={row.correctionNote}>
        {row.correctionReason}
      </p>
    );
  };

  const renderOutTimeEditor = (row) => {
    const noTimes = row.markStatusValue === "leave" || row.markStatusValue === "absent";
    const canSetOut = canEditDate && statusAllowsOutTime(row.markStatusValue);
    const isSaving = savingCode === row.employeeCode;

    if (noTimes) {
      return <span className="text-muted-foreground">—</span>;
    }
    if (!canSetOut) {
      return <span className="text-muted-foreground">{formatDisplayTime(row.outTime) || "—"}</span>;
    }

    return (
      <div className="flex items-center gap-1">
        <Input
          type="time"
          className="h-9 w-[120px]"
          value={row.outTimeInput || ""}
          disabled={isSaving}
          onChange={(e) => {
            const v = e.target.value;
            setRows((prev) =>
              prev.map((r) =>
                r.employeeCode === row.employeeCode ? { ...r, outTimeInput: v } : r
              )
            );
            if (v) handleOutTimeChange({ ...row, outTimeInput: v }, v);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 shrink-0 px-2 text-xs"
          disabled={isSaving}
          onClick={() => markOutNow(row)}
          title="Set out time to now"
        >
          Now
        </Button>
      </div>
    );
  };

  const renderTimeCells = (row) => {
    const noTimes = row.markStatusValue === "leave" || row.markStatusValue === "absent";

    return (
      <>
        <td className="px-4 py-3 text-muted-foreground">
          {noTimes ? "—" : formatDisplayTime(row.inTime) || "—"}
        </td>
        <td className="px-4 py-3">{renderOutTimeEditor(row)}</td>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between no-print">
        <div>
          <h1 className="font-display text-2xl font-bold lg:text-3xl">Daily Attendance</h1>
          <p className="text-muted-foreground">
            {canMark
              ? "Mark Present on arrival; Half Day sets out to 2 PM without changing in time"
              : "View attendance for the selected date"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Input
            type="date"
            value={date}
            max={datePickerMax}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full sm:w-auto"
          />
          <Button variant="outline" className="w-full sm:w-auto" onClick={handlePrint} disabled={!rows.length}>
            <Printer className="h-4 w-4" /> Print List
          </Button>
        </div>
      </div>

      {isLocked && (
        <div className="no-print flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Previous date attendance is locked. Use Correct to update with a reason — no approval needed.
          </p>
        </div>
      )}

      {isLocked && correctionReasons.length > 0 && (
        <div className="no-print rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Correction reasons</p>
          <ul className="max-h-24 space-y-1 overflow-y-auto text-xs">
            {correctionReasons.map((item) => (
              <li key={item.id} className="truncate text-foreground/80">
                <span className="font-mono text-muted-foreground">{item.employeeCode}</span>
                {" · "}
                {item.requestedStatus}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 no-print">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-champagne" />
            <div>
              <p className="text-xs text-muted-foreground">Total Active</p>
              <p className="text-xl font-bold">{markedCount + absentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <UserCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Marked Today</p>
              <p className="text-xl font-bold">{markedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <UserX className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Not Marked</p>
              <p className="text-xl font-bold">{absentCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card no-print">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-champagne" />
                {canMark ? "Mark Attendance" : "Attendance List"} — {dateLabel}
              </CardTitle>
              <CardDescription>
                {isLocked
                  ? "Read-only — use Correct to update with reason"
                  : canMark
                    ? "Status changes save instantly to the database"
                    : `${markedCount} marked · ${absentCount} not marked`}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {pagination?.total ?? 0} employees
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departmentFilters.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
              ))}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">#</th>
                      <th className="px-4 py-3 text-left font-medium">Employee Code</th>
                      <th className="px-4 py-3 text-left font-medium">Employee Name</th>
                      <th className="px-4 py-3 text-left font-medium">Department</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Shift</th>
                      <th className="px-4 py-3 text-left font-medium">In Time</th>
                      <th className="px-4 py-3 text-left font-medium">Out Time</th>
                      <th className="px-4 py-3 text-left font-medium">Late Min</th>
                      <th className="px-4 py-3 text-left font-medium">Remark</th>
                      {isLocked && canRequestCorrection && (
                        <th className="px-4 py-3 text-left font-medium">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={isLocked && canRequestCorrection ? 12 : 11} className="px-4 py-10 text-center text-muted-foreground">
                          No employees match the selected filters
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => {
                        const isSaving = savingCode === row.employeeCode;
                        const rowClass = getRowStatusClass(row.markStatusValue);
                        return (
                          <tr
                            key={row.employeeCode}
                            className={`border-b transition-colors hover:bg-muted/20 ${rowClass}`}
                          >
                            <td className="px-4 py-3 text-muted-foreground">{(pagination?.from || 0) + index}</td>
                            <td className="px-4 py-3 font-mono text-xs">{row.employeeCode}</td>
                            <td className="px-4 py-3 font-medium">{row.employeeName}</td>
                            <td className="px-4 py-3">{row.department}</td>
                            <td className="px-4 py-3">
                              {canEditDate ? (
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={row.markStatusValue || ""}
                                    onValueChange={(v) => handleStatusChange(row, v)}
                                    disabled={isSaving}
                                  >
                                    <SelectTrigger className="h-9 w-[140px]">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {statuses.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                              ) : (
                                <div>
                                  {renderStatusBadge(row)}
                                  {renderCorrectionReason(row)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{row.shiftTime || "—"}</td>
                            {renderTimeCells(row)}
                            <td className="px-4 py-3 text-muted-foreground">{formatLateMinutes(row.lateMinutes)}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatRemark(row.attendanceRemark)}</td>
                            {isLocked && canRequestCorrection && (
                              <td className="px-4 py-3">{renderCorrectionAction(row)}</td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {rows.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">No employees match the selected filters</p>
                ) : (
                  rows.map((row) => {
                    const isSaving = savingCode === row.employeeCode;
                    const rowClass = getRowStatusClass(row.markStatusValue);
                    const noTimes = row.markStatusValue === "leave" || row.markStatusValue === "absent";
                    return (
                      <div
                        key={row.employeeCode}
                        className={`rounded-lg border p-4 space-y-3 ${rowClass}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{row.employeeName}</p>
                            <p className="text-xs font-mono text-muted-foreground">{row.employeeCode}</p>
                            <p className="text-xs text-muted-foreground">{row.department}</p>
                          </div>
                          {!canEditDate && (
                            <div>
                              {renderStatusBadge(row)}
                              {renderCorrectionReason(row)}
                            </div>
                          )}
                        </div>
                        {canEditDate && (
                          <div className="flex items-center gap-2">
                            <Select
                              value={row.markStatusValue || ""}
                              onValueChange={(v) => handleStatusChange(row, v)}
                              disabled={isSaving}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                {statuses.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                          </div>
                        )}
                        {row.markStatusValue && (
                          <div className="space-y-2 text-xs">
                            <div className="flex flex-wrap gap-4 text-muted-foreground">
                              <span>Shift: {row.shiftTime || "—"}</span>
                              <span>In: {noTimes ? "—" : formatDisplayTime(row.inTime)}</span>
                              <span>Late: {formatLateMinutes(row.lateMinutes)}</span>
                              <span>Remark: {formatRemark(row.attendanceRemark)}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-muted-foreground">Out:</span>
                              {renderOutTimeEditor(row)}
                            </div>
                          </div>
                        )}
                        {isLocked && renderCorrectionAction(row)}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          <ListPagination
            page={pagination?.page || page}
            totalPages={pagination?.totalPages || 0}
            total={pagination?.total || 0}
            from={pagination?.from || 0}
            to={pagination?.to || 0}
            limit={pagination?.limit || limit}
            pageSizeOptions={pagination?.pageSizeOptions || lookups?.pagination?.pageSizeOptions || []}
            loading={loading}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </CardContent>
      </Card>

      <div className="print-area hidden print:block">
        <div className="flex min-h-[calc(100vh-2rem)] flex-col bg-white p-6 text-black">
          <h2 className="mb-1 text-center text-base font-semibold">Daily Attendance List</h2>
          <p className="mb-4 text-center text-sm text-gray-700">{dateLabel}</p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-1.5 text-left">Employee Code</th>
                <th className="border border-black px-2 py-1.5 text-left">Employee Name</th>
                <th className="border border-black px-2 py-1.5 text-left">Status</th>
                <th className="border border-black px-2 py-1.5 text-left">In Time</th>
                <th className="border border-black px-2 py-1.5 text-left">Out Time</th>
              </tr>
            </thead>
            <tbody>
              {rowsForPrint.map((r) => {
                const noTimes = r.markStatusValue === "leave" || r.markStatusValue === "absent";
                return (
                  <tr key={r.employeeCode}>
                    <td className="border border-black px-2 py-2">{r.employeeCode}</td>
                    <td className="border border-black px-2 py-2">{r.employeeName}</td>
                    <td className="border border-black px-2 py-2">{r.statusLabel || r.status || "Not Marked"}</td>
                    <td className="border border-black px-2 py-2">{noTimes ? "—" : formatDisplayTime(r.inTime)}</td>
                    <td className="border border-black px-2 py-2">{noTimes ? "—" : formatDisplayTime(r.outTime)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-auto pt-16 text-right text-sm text-gray-800">
            <div className="ml-auto inline-block min-w-[220px] text-center">
              <div className="mb-1 border-b border-black" />
              <p>Proprietor Signature</p>
            </div>
          </div>
        </div>
      </div>

      <AttendanceCorrectionDialog
        open={correctionOpen}
        onOpenChange={setCorrectionOpen}
        row={correctionRow}
        date={date}
        statuses={statuses}
        onSuccess={loadMarkSheet}
      />
    </div>
  );
}
