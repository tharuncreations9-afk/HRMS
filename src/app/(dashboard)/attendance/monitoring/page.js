"use client";

import { useState } from "react";
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
import { employees } from "@/lib/mock-data";
import { DEPARTMENTS } from "@/lib/utils";

const monitoringData = employees.map((emp, i) => ({
  ...emp,
  status: i % 5 === 0 ? "Absent" : i % 7 === 0 ? "Late" : i % 11 === 0 ? "Leave" : "Present",
  inTime: i % 5 === 0 ? "-" : i % 7 === 0 ? "09:45" : "09:02",
  outTime: i % 5 === 0 ? "-" : "18:15",
}));

const statCards = [
  { label: "Present Employees", count: 215, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Absent Employees", count: 18, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
  { label: "Late Employees", count: 8, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  { label: "Leave Employees", count: 12, icon: CalendarOff, color: "text-blue-500", bg: "bg-blue-500/10" },
];

export default function AttendanceMonitoringPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [department, setDepartment] = useState("all");

  const filtered = monitoringData.filter(
    (emp) => department === "all" || emp.department === department
  );

  const statusVariant = (s) => {
    if (s === "Present") return "success";
    if (s === "Late") return "warning";
    if (s === "Leave") return "info";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">Attendance Monitoring</h1>
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
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                {filtered.map((emp) => (
                  <tr key={emp.employeeCode} className="border-b hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                    <td className="px-4 py-3 font-medium">{emp.name}</td>
                    <td className="px-4 py-3">{emp.department}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(emp.status)}>{emp.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{emp.inTime}</td>
                    <td className="px-4 py-3">{emp.outTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
