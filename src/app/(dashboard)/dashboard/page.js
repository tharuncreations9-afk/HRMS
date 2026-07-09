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
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api-client";
import { getTimeOfDayGreeting } from "@/lib/utils";

const statCards = [
  { key: "totalEmployees", label: "Total Employees", hint: "Active employees", icon: Users, color: "from-champagne to-gold", bg: "bg-champagne/10" },
  { key: "presentToday", label: "Present Today", hint: "Came to office today", icon: UserCheck, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/10" },
  { key: "onLeave", label: "On Leave Today", hint: "Approved / marked leave", icon: CalendarOff, color: "from-amber-500 to-amber-600", bg: "bg-amber-500/10" },
  { key: "absentToday", label: "Absent Today", hint: "Not present (includes not marked yet)", icon: UserX, color: "from-red-500 to-red-600", bg: "bg-red-500/10" },
];

const quickActions = [
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

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [greeting, setGreeting] = useState("Welcome");
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0, onLeave: 0 });
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [departmentAttendance, setDepartmentAttendance] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);

  const showOrgDashboard = canViewOrgDashboard(hasPermission);
  const visibleQuickActions = quickActions.filter((action) =>
    canSeeQuickAction(action, hasPermission, user?.role)
  );

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting());
  }, []);

  useEffect(() => {
    if (!showOrgDashboard) return;
    api.dashboard().then((data) => {
      setStats(data.stats);
      setWeeklyAttendance(data.weeklyAttendance);
      setDepartmentAttendance(data.departmentAttendance);
      setMonthlyTrend(data.monthlyTrend);
    }).catch(() => {});
  }, [showOrgDashboard]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold lg:text-3xl">
          {greeting}, <span className="gradient-text">{user?.name?.split(" ")[0]}</span>
        </h1>
        <p className="text-muted-foreground">
          {showOrgDashboard
            ? "Here's what's happening with your workforce today."
            : "Welcome back. Use the quick actions below for your daily tasks."}
        </p>
      </motion.div>

      {showOrgDashboard && (
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
      )}

      {showOrgDashboard && (
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
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {showOrgDashboard && (
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
        )}

        {visibleQuickActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={showOrgDashboard ? "" : "lg:col-span-3"}
          >
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used actions</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleQuickActions.map((action) => (
                  <Link key={action.label} href={action.href}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/50">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color} text-white`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-center">{action.label}</span>
                    </motion.div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
