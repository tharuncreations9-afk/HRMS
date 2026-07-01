"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { UserCheck, UserX, Clock, CalendarOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api } from "@/lib/api-client";
import { getLocalDateString } from "@/lib/utils";
import { useLookups } from "@/hooks/use-lookups";

export default function AttendanceMonitoringPage() {
  const [date, setDate] = useState(getLocalDateString());
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [records, setRecords] = useState([]);
  const [markedCount, setMarkedCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lookups } = useLookups();

  const departmentFilters = lookups?.attendanceDepartmentFilters || [];
  const statusFilters = lookups?.attendanceStatusFilters || [];

  useEffect(() => {
    if (lookups?.pagination?.defaultLimit && limit === null) {
      setLimit(lookups.pagination.defaultLimit);
    }
  }, [lookups, limit]);

  useEffect(() => {
    setPage(1);
  }, [date, department, status, limit]);

  const loadData = useCallback(() => {
    if (!limit) return;
    setLoading(true);
    api
      .attendance({
        date,
        page: String(page),
        limit: String(limit),
        department,
        status,
      })
      .then((data) => {
        setRecords(data.records || []);
        setMarkedCount(data.markedCount || 0);
        setAbsentCount(data.absentCount || 0);
        setPagination(data.pagination || null);
      })
      .catch(() => {
        setRecords([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  }, [date, page, limit, department, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = [
    { label: "Marked Today", count: markedCount, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Absent Employees", count: absentCount, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Late Employees", count: 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Leave Employees", count: 0, icon: CalendarOff, color: "text-champagne", bg: "bg-champagne/10" },
  ];

  const statusVariant = (s) => {
    if (s === "Present") return "success";
    if (s === "Late") return "warning";
    if (s === "Leave") return "info";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">Attendance Monitoring</h1>
        <p className="text-muted-foreground">Real-time attendance overview and tracking</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg p-3 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Attendance Details</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full sm:w-auto" />
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departmentFilters.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
          ) : (
            <div className="max-h-[min(32rem,55vh)] overflow-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left">Employee ID</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">In Time</th>
                    <th className="px-4 py-3 text-left">Out Time</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((emp) => (
                    <tr key={emp.employeeCode} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                      <td className="px-4 py-3 font-medium">{emp.employeeName}</td>
                      <td className="px-4 py-3">{emp.department}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(emp.status)}>{emp.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{emp.inTime || "—"}</td>
                      <td className="px-4 py-3">{emp.outTime || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
}
