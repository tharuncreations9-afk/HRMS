import { prisma } from "@/lib/prisma";

import { requireAuth } from "@/lib/auth-server";



function getTodayRange() {

  const now = new Date();

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };

}



export async function GET(request) {

  const { user, error } = await requireAuth(request);

  if (error) return error;



  const { start: today, end: tomorrow } = getTodayRange();



  const [totalEmployees, todayAttendance, recentAudits] = await Promise.all([

    prisma.employee.count({ where: { status: "Active" } }),

    prisma.attendance.findMany({

      where: { attendanceDate: { gte: today, lt: tomorrow } },

    }),

    prisma.auditLog.findMany({

      orderBy: { actionDate: "desc" },

      take: 5,

      include: { employee: true },

    }),

  ]);



  const presentToday = todayAttendance.filter((a) =>

    ["Present", "Late", "Half_Day"].includes(a.attendanceStatus)

  ).length;

  const onLeave = todayAttendance.filter((a) => a.attendanceStatus === "Leave").length;

  const markedAbsent = todayAttendance.filter((a) => a.attendanceStatus === "Absent").length;

  const notMarked = Math.max(0, totalEmployees - todayAttendance.length);

  const absentToday = markedAbsent + notMarked;



  const weeklyAttendance = [];

  for (let i = 5; i >= 0; i--) {

    const d = new Date(today);

    d.setUTCDate(d.getUTCDate() - i);

    const next = new Date(d);

    next.setUTCDate(next.getUTCDate() + 1);

    const dayRecords = await prisma.attendance.findMany({

      where: { attendanceDate: { gte: d, lt: next } },

    });

    weeklyAttendance.push({

      day: d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),

      present: dayRecords.filter((r) => ["Present", "Late", "Half_Day"].includes(r.attendanceStatus)).length,

      absent: dayRecords.filter((r) => r.attendanceStatus === "Absent").length,

      leave: dayRecords.filter((r) => r.attendanceStatus === "Leave").length,

    });

  }



  const departments = await prisma.department.findMany();

  const departmentAttendance = await Promise.all(

    departments.map(async (dept) => {

      const empCount = await prisma.employee.count({

        where: { departmentId: dept.id, status: "Active" },

      });

      const present = await prisma.attendance.count({

        where: {

          attendanceDate: { gte: today, lt: tomorrow },

          attendanceStatus: { in: ["Present", "Late", "Half_Day"] },

          employee: { departmentId: dept.id },

        },

      });

      return {

        department: dept.departmentName,

        percentage: empCount ? Math.round((present / empCount) * 100) : 0,

      };

    })

  );



  const monthlyTrend = [];

  const now = new Date();

  for (let i = 5; i >= 0; i--) {

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));

    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));

    const [total, present] = await Promise.all([

      prisma.attendance.count({ where: { attendanceDate: { gte: monthStart, lt: monthEnd } } }),

      prisma.attendance.count({

        where: {

          attendanceDate: { gte: monthStart, lt: monthEnd },

          attendanceStatus: { in: ["Present", "Late", "Half_Day"] },

        },

      }),

    ]);

    monthlyTrend.push({

      month: monthStart.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),

      attendance: total ? Math.round((present / total) * 100) : 0,

    });

  }



  const recentActivities = recentAudits.map((log) => ({

    id: log.id,

    type: log.actionType.toLowerCase(),

    message: `${log.moduleName}: ${log.actionType}`,

    time: log.actionDate.toISOString(),

    icon: log.actionType === "CREATE" ? "user-plus" : log.actionType === "APPROVE" ? "check" : "edit",

  }));



  return Response.json({

    stats: {

      totalEmployees,

      presentToday,

      absentToday,

      onLeave,

      notMarked,

    },

    weeklyAttendance,

    departmentAttendance,

    monthlyTrend,

    recentActivities,

    user: { name: user.name },

  });

}

