import { prisma } from "@/lib/prisma";

import {
  requireAuth,
  canMarkAttendance,
  canViewAttendance,
  forbiddenResponse,
  hasFullAccess,
} from "@/lib/auth-server";

import { createAuditLog } from "@/lib/audit";

import { isDateBeforeToday } from "@/lib/utils";



const STATUS_MAP = {

  present: "Present",

  halfDay: "Half_Day",

  leave: "Leave",

};



function toAttendanceDate(dateStr) {

  const [year, month, day] = String(dateStr).split("T")[0].split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));

}



function getDateRange(dateStr) {

  const start = toAttendanceDate(dateStr);

  const end = new Date(start);

  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };

}



export async function GET(request) {

  const { user, error } = await requireAuth(request);

  if (error) return error;

  if (!canViewAttendance(user)) return forbiddenResponse();

  const { searchParams } = new URL(request.url);

  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const { start, end } = getDateRange(dateStr);



  const employees = await prisma.employee.findMany({

    where: { status: "Active" },

    include: { department: true },

    orderBy: { employeeCode: "asc" },

  });



  const existing = await prisma.attendance.findMany({

    where: { attendanceDate: { gte: start, lt: end } },

  });

  const byEmployee = Object.fromEntries(existing.map((a) => [a.employeeId, a]));



  const records = employees.map((emp) => {

    const att = byEmployee[emp.id];

    return {

      employeeCode: emp.employeeCode,

      employeeName: emp.fullName,

      department: emp.department.departmentName,

      present: att?.attendanceStatus === "Present",

      halfDay: att?.attendanceStatus === "Half_Day",

      leave: att?.attendanceStatus === "Leave",

      remarks: "",

    };

  });



  return Response.json({ records, date: dateStr });

}



export async function POST(request) {

  const { user: authUser, error } = await requireAuth(request);

  if (error) return error;

  if (!canMarkAttendance(authUser)) return forbiddenResponse();

  try {

    const body = await request.json();

    const { date, records } = body;



    if (!date || !Array.isArray(records)) {

      return Response.json({ error: "Date and records are required" }, { status: 400 });

    }

    const canEditPast =
      authUser.role === "super_admin" || hasFullAccess(authUser);

    if (isDateBeforeToday(date) && !canEditPast) {

      return Response.json({ error: "Cannot mark attendance for past dates" }, { status: 400 });

    }



    const attendanceDate = toAttendanceDate(date);

    const { start, end } = getDateRange(date);



    let saved = 0;



    for (const record of records) {

      const employee = await prisma.employee.findFirst({

        where: { employeeCode: record.employeeCode },

      });

      if (!employee) continue;



      let status = "Absent";

      if (record.present) status = STATUS_MAP.present;

      else if (record.halfDay) status = STATUS_MAP.halfDay;

      else if (record.leave) status = STATUS_MAP.leave;



      const existing = await prisma.attendance.findFirst({

        where: {

          employeeId: employee.id,

          attendanceDate: { gte: start, lt: end },

        },

      });



      if (existing) {

        await prisma.attendance.update({

          where: { id: existing.id },

          data: {

            attendanceStatus: status,

            employeeCode: employee.employeeCode,

            camAttendanceId: employee.employeeCode,

            updatedBy: authUser.id,

          },

        });

      } else {

        await prisma.attendance.create({

          data: {

            employeeId: employee.id,

            employeeCode: employee.employeeCode,

            camAttendanceId: employee.employeeCode,

            attendanceDate,

            attendanceStatus: status,

            createdBy: authUser.id,

          },

        });

      }



      saved++;

    }



    await createAuditLog({

      employeeId: authUser.id,

      moduleName: "Attendance",

      actionType: "UPDATE",

      newValue: { date, recordsSaved: saved },

    });



    return Response.json({ success: true, saved });

  } catch (err) {

    console.error("Save attendance error:", err);

    return Response.json({ error: err.message || "Failed to save attendance" }, { status: 500 });

  }

}

