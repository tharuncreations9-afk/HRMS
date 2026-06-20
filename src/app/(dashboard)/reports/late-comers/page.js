"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Users, UserCheck, UserX, Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPagination } from "@/components/ui/list-pagination";
import { api } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { useLookups } from "@/hooks/use-lookups";
import { getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";

function canAccessReport(hasPermission) {
  return (
    hasPermission("Generate Reports") ||
    hasPermission("View Team Reports") ||
    hasPermission("Full System Access") ||
    hasPermission("All Permissions")
  );
}

export default function LateComersReportPage() {
  const router = useRouter();
  const { user, isLoading, hasPermission } = useAuth();
  const { lookups } = useLookups();
  const canView = canAccessReport(hasPermission);

  const [date, setDate] = useState(getLocalDateString());
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [department, setDepartment] = useState("all");
  const [mode, setMode] = useState("date");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [departmentFilters, setDepartmentFilters] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const months = lookups?.months || [];
  const years = lookups?.reportYears || [];

  useEffect(() => {
    if (!isLoading && user && !canView) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router, canView]);

  useEffect(() => {
    if (lookups?.pagination?.defaultLimit && limit === null) {
      setLimit(lookups.pagination.defaultLimit);
    }
  }, [lookups, limit]);

  const loadReport = useCallback(() => {
    if (!limit) return;
    setLoading(true);

    const params = {
      page: String(page),
      limit: String(limit),
      department,
    };

    if (mode === "date") {
      params.date = date;
    } else {
      if (!month) {
        setLoading(false);
        toast.error("Select a month");
        return;
      }
      params.month = month;
      params.year = year;
    }

    api
      .lateComersReport(params)
      .then((data) => {
        setRows(data.rows || []);
        setSummary(data.summary || null);
        setDepartmentFilters(data.departmentFilters || []);
        setPagination(data.pagination || null);
        setGenerated(true);
      })
      .catch((err) => toast.error(err.message || "Failed to load report"))
      .finally(() => setLoading(false));
  }, [page, limit, department, date, month, year, mode]);

  useEffect(() => {
    if (!generated || !user || !canView || !limit) return;
    loadReport();
  }, [page, limit, generated, user, canView, loadReport]);

  const handleGenerate = () => {
    setPage(1);
    setGenerated(true);
  };

  const summaryCards = [
    { label: "Total Employees", value: summary?.totalEmployees ?? 0, icon: Users },
    { label: "On Time Employees", value: summary?.onTimeEmployees ?? 0, icon: UserCheck },
    { label: "Late Comers", value: summary?.lateComers ?? 0, icon: Clock3 },
    { label: "Absent Employees", value: summary?.absentEmployees ?? 0, icon: UserX },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">Late Comers Report</h1>
        <p className="text-muted-foreground">
          Late minutes are calculated automatically from department shift start time and grace period.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlarmClock className="h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label>Report Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="month">By Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mode === "date" ? (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y.value} value={String(y.value)}>
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {(departmentFilters.length
                    ? departmentFilters
                    : (lookups?.reportDepartmentOptions || []).filter(
                        (opt) => opt.value !== "All Departments" && opt.value !== "all"
                      )
                  ).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? "Loading..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {generated && summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <card.icon className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {generated && (
        <Card>
          <CardHeader>
            <CardTitle>Late Comers</CardTitle>
            <CardDescription>
              {mode === "date"
                ? `Attendance late analysis for ${date}`
                : `Attendance late analysis for selected month`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {mode === "month" && <th className="px-4 py-3 text-left font-medium">Date</th>}
                    <th className="px-4 py-3 text-left font-medium">Employee Code</th>
                    <th className="px-4 py-3 text-left font-medium">Employee Name</th>
                    <th className="px-4 py-3 text-left font-medium">Department</th>
                    <th className="px-4 py-3 text-left font-medium">Shift Time</th>
                    <th className="px-4 py-3 text-left font-medium">In Time</th>
                    <th className="px-4 py-3 text-left font-medium">Late Minutes</th>
                    <th className="px-4 py-3 text-left font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={mode === "month" ? 8 : 7} className="px-4 py-10 text-center text-muted-foreground">
                        No records found for the selected filters
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={`${row.employeeCode}-${row.attendanceDate}-${index}`} className="border-b hover:bg-muted/20">
                        {mode === "month" && <td className="px-4 py-3">{row.attendanceDate}</td>}
                        <td className="px-4 py-3 font-mono text-xs">{row.employeeCode}</td>
                        <td className="px-4 py-3">{row.employeeName}</td>
                        <td className="px-4 py-3">{row.department}</td>
                        <td className="px-4 py-3">{row.shiftTime}</td>
                        <td className="px-4 py-3">{row.inTime}</td>
                        <td className="px-4 py-3">{row.lateMinutes ?? 0}</td>
                        <td className="px-4 py-3">{row.remark}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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
      )}
    </div>
  );
}
