"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  UserX,
  CalendarOff,
  Plus,
  ClipboardCheck,
  FileBarChart,
  ThumbsUp,
  CalendarDays,
  User,
  Clock,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { formatDate, getTimeOfDayGreeting } from "@/lib/utils";

const statCards = [
  { key: "totalEmployees", label: "Total Employees", hint: "Active employees", icon: Users, color: "from-champagne to-gold", bg: "bg-champagne/10" },
  { key: "presentToday", label: "Present Today", hint: "Came to office today", icon: UserCheck, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/10" },
  { key: "onLeave", label: "On Leave Today", hint: "Approved / marked leave", icon: CalendarOff, color: "from-amber-500 to-amber-600", bg: "bg-amber-500/10" },
  { key: "absentToday", label: "Absent Today", hint: "Not present (includes not marked yet)", icon: UserX, color: "from-red-500 to-red-600", bg: "bg-red-500/10" },
];

const quickActions = [
  { label: "My Profile", href: null, icon: User, color: "bg-slate-600", perms: ["View Profile", "Edit Profile"], useProfileHref: true },
  { label: "Add Employee", href: "/employees/add", icon: Plus, color: "bg-champagne", perms: ["Employee Management"] },
  { label: "Mark Attendance", href: "/attendance", icon: ClipboardCheck, color: "bg-emerald-500", perms: ["Mark Attendance", "Attendance Monitoring"] },
  { label: "Generate Report", href: "/reports", icon: FileBarChart, color: "bg-amber-500", perms: ["Generate Reports", "View Team Reports"] },
  {
    label: "Approve Leave",
    href: "/leaves",
    icon: ThumbsUp,
    color: "bg-purple-500",
    perms: ["Final Leave Approval", "Leave Approval", "View Leave Requests", "View Team Leave Requests"],
  },
  { label: "Apply Leave", href: "/leaves", icon: CalendarDays, color: "bg-gold", perms: ["Apply Leave"], hideForRoles: ["super_admin"] },
  { label: "View Attendance", href: "/attendance", icon: ClipboardCheck, color: "bg-teal-500", perms: ["View Attendance", "View Team Attendance"] },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function canSeeQuickAction(action, hasPermission, userRole) {
  if (action.hideForRoles?.includes(userRole)) return false;
  if (!action.perms?.length) return true;
  return action.perms.some((p) => hasPermission(p));
}

function canViewOrgDashboard(hasPermission) {
  return [
    "Employee Management",
    "User Management",
    "Attendance Monitoring",
    "Generate Reports",
    "Full System Access",
    "All Permissions",
  ].some((p) => hasPermission(p));
}

function statusBadgeVariant(status) {
  if (status === "Present") return "success";
  if (status === "Late" || status === "Half Day") return "warning";
  if (status === "Not Marked") return "secondary";
  return "destructive";
}

function EmployeeSelfDashboard({ self, visibleQuickActions, userId }) {
  if (!self) {
    return (
      <Card className="glass-card">
        <CardContent className="py-10 text-center text-muted-foreground">
          Unable to load your dashboard data.
        </CardContent>
      </Card>
    );
  }

  const { profile, monthStats, leaveBalances, pendingLeaves, recentAttendance, shift } = self;

  return (
    <div className="space-y-6">
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Today&apos;s Status</p>
              <div className="mt-2">
                <Badge variant={statusBadgeVariant(self.todayStatus)}>{self.todayStatus}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                In {self.todayInTime} · Out {self.todayOutTime}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Shift Today
              </div>
              {shift ? (
                <>
                  <p className="mt-2 text-lg font-semibold">{shift.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.startTime} – {shift.endTime}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No shift assigned</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">This Month</p>
              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {(monthStats?.present || 0) + (monthStats?.late || 0) + (monthStats?.halfDay || 0)}
              </p>
              <p className="text-xs text-muted-foreground">Present days</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Late {monthStats?.late || 0} · Absent {monthStats?.absent || 0} · Leave {monthStats?.leave || 0}
              </p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">Profile</p>
              <p className="mt-2 truncate text-sm font-semibold">{profile?.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{profile?.employeeCode}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {profile?.designation} · {profile?.department}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Leave Balance</CardTitle>
            <CardDescription>Current year remaining leaves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaveBalances?.length ? (
              leaveBalances.map((bal) => (
                <div key={bal.name} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{bal.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Used {bal.used} · Pending {bal.pending}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{bal.remaining}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No leave balances found</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Pending Leave Requests</CardTitle>
            <CardDescription>Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLeaves?.length ? (
              pendingLeaves.map((leave) => (
                <div key={leave.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{leave.type}</p>
                    <Badge variant="warning">{leave.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(leave.from)} – {formatDate(leave.to)} ({leave.days} days)
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No pending leave requests</p>
            )}
            <Link href="/leaves" className="inline-flex items-center gap-1 text-xs text-champagne hover:underline">
              <Calendar className="h-3 w-3" /> Go to Leave Management
            </Link>
          </CardContent>
        </Card>

        {visibleQuickActions.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used actions</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {visibleQuickActions.map((action) => {
                const href = action.useProfileHref ? `/employees/${userId}` : action.href;
                return (
                  <Link key={action.label} href={href}>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-center text-xs font-medium">{action.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription>Your last 10 attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">In Time</th>
                  <th className="px-4 py-3 text-left">Out Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance?.length ? (
                  recentAttendance.map((record) => (
                    <tr key={record.date} className="border-b">
                      <td className="px-4 py-3">{formatDate(record.date)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(record.status)}>{record.status}</Badge>
                      </td>
                      <td className="px-4 py-3">{record.inTime}</td>
                      <td className="px-4 py-3">{record.outTime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No attendance records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [greeting, setGreeting] = useState("Welcome");
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0, onLeave: 0 });
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [departmentAttendance, setDepartmentAttendance] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [self, setSelf] = useState(null);
  const [loading, setLoading] = useState(true);

  const showOrgDashboard = canViewOrgDashboard(hasPermission);
  const visibleQuickActions = quickActions.filter((action) =>
    canSeeQuickAction(action, hasPermission, user?.role)
  );

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting());
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .dashboard()
      .then((data) => {
        setSelf(data.self || null);
        if (data.mode === "org" || data.stats) {
          setStats(data.stats || { totalEmployees: 0, presentToday: 0, absentToday: 0, onLeave: 0 });
          setWeeklyAttendance(data.weeklyAttendance || []);
          setDepartmentAttendance(data.departmentAttendance || []);
          setMonthlyTrend(data.monthlyTrend || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">
          {greeting}, <span className="gradient-text">{user?.name?.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground">
          {showOrgDashboard
            ? "Here's what's happening with your workforce today."
            : "Your attendance, leave balance, and daily shortcuts."}
        </p>
      </motion.div>

      {!showOrgDashboard && !loading && (
        <EmployeeSelfDashboard
          self={self}
          visibleQuickActions={visibleQuickActions}
          userId={user?.id}
        />
      )}

      {showOrgDashboard && (
        <>
          <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <motion.div key={stat.key} variants={item}>
                <Card className="glass-card overflow-hidden transition-shadow hover:shadow-glow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className={`rounded-lg p-2 ${stat.bg}`}>
                        <stat.icon className={`h-5 w-5 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold">
                      {stats[stat.key] ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-[10px] text-muted-foreground/70">{stat.hint}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Weekly Attendance</CardTitle>
                  <CardDescription>Present vs Absent vs Leave this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={weeklyAttendance} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="present" fill="#B8956A" radius={[4, 4, 0, 0]} name="Present" />
                      <Bar dataKey="absent" fill="#EF4444" radius={[4, 4, 0, 0]} name="Absent" />
                      <Bar dataKey="leave" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Leave" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Department Wise Attendance</CardTitle>
                  <CardDescription>Attendance percentage by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={departmentAttendance} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis dataKey="department" type="category" width={72} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="percentage" fill="#B8956A" radius={[0, 4, 4, 0]} name="Attendance %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Monthly Attendance Trend</CardTitle>
                  <CardDescription>6-month attendance overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#B8956A" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#B8956A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        formatter={(value) => [`${value}%`, "Attendance %"]}
                      />
                      <Area type="monotone" dataKey="attendance" stroke="#B8956A" fill="url(#colorAtt)" name="Attendance %" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {visibleQuickActions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="glass-card h-full">
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used actions</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {visibleQuickActions.map((action) => {
                      const href = action.useProfileHref ? `/employees/${user?.id}` : action.href;
                      return (
                        <Link key={action.label} href={href}>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white`}>
                              <action.icon className="h-5 w-5" />
                            </div>
                            <span className="text-center text-xs font-medium">{action.label}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
