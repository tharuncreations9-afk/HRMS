import { toAttendanceDate, getAttendanceDayRange, combineDateAndTime, toTimeInputValue, HALF_DAY_DEFAULT_OUT_TIME, resolveHalfDayOutTime } from "@/lib/attendance-date";
import { adjustLeaveForWorkAttendance } from "@/lib/leave-attendance-sync";
import { createAuditLog } from "@/lib/audit";
import {
  resolveMarkStatusToDb,
  dbStatusRequiresInTime,
  resolveDisplayStatusToMarkApi,
} from "@/lib/attendance-status-server";
import { formatEnumLabel } from "@/lib/lookups";
import { getActiveShiftForDepartment, buildLateMetricsForSave, resolveAttendanceShiftDisplay, formatShiftTimeShort } from "@/lib/shift-server";

function formatTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export async function mapAttendanceRecord(att, prisma, shift = null) {
  const emp = att.employee;
  const displayStatus = att.attendanceStatus.replace("_", " ");
  const activeShift = shift ?? (emp?.departmentId ? await getActiveShiftForDepartment(prisma, emp.departmentId) : null);
  const shiftDisplay = resolveAttendanceShiftDisplay(activeShift, att);

  return {
    id: att.id,
    employeeCode: att.employeeCode,
    employeeName: emp?.fullName || att.employeeCode,
    department: emp?.department?.departmentName || "—",
    status: displayStatus,
    statusLabel: displayStatus,
    markStatusValue: await resolveDisplayStatusToMarkApi(prisma, displayStatus),
    inTime: formatTime(att.inTime),
    inTimeInput: toTimeInputValue(att.inTime),
    inTimeSort: att.inTime ? new Date(att.inTime).getTime() : Number.MAX_SAFE_INTEGER,
    outTime: formatTime(att.outTime) || "—",
    outTimeInput: toTimeInputValue(att.outTime),
    shiftTime: shiftDisplay.shiftTime,
    lateMinutes: shiftDisplay.lateMinutes,
    attendanceRemark: shiftDisplay.remark,
  };
}

export async function mapAttendanceRecords(rows, prisma) {
  return Promise.all(rows.map((row) => mapAttendanceRecord(row, prisma)));
}

export async function markEmployeeAttendance(
  prisma,
  authUser,
  { date, employeeCode, statusApi, inTime, outTime, now = new Date() }
) {
  if (!date || !employeeCode) {
    throw new Error("Date and employee are required");
  }

  const status = await resolveMarkStatusToDb(prisma, statusApi);
  if (!status) {
    throw new Error("Select a valid attendance status");
  }

  const employee = await prisma.employee.findFirst({
    where: { employeeCode: String(employeeCode).trim(), status: "Active" },
    include: { department: true },
  });
  if (!employee) {
    throw new Error(`Employee ${employeeCode} not found`);
  }

  const attendanceDate = toAttendanceDate(date);
  const { start, end } = getAttendanceDayRange(date);

  const existing = await prisma.attendance.findFirst({
    where: {
      employeeId: employee.id,
      attendanceDate: { gte: start, lt: end },
    },
  });

  const requiresInTime = await dbStatusRequiresInTime(prisma, status);
  const parsedInTime = inTime ? combineDateAndTime(date, inTime) : null;
  const parsedOutTime = outTime ? combineDateAndTime(date, outTime) : null;

  let finalInTime = null;
  let finalOutTime = null;

  if (status === "Present" || status === "Late") {
    finalInTime = parsedInTime ?? existing?.inTime ?? now;
    if (outTime !== undefined) {
      finalOutTime = outTime ? parsedOutTime : null;
    } else {
      finalOutTime = existing?.outTime ?? null;
    }
  } else if (status === "Half_Day") {
    // Keep original arrival in time; half-day only adjusts out time
    finalInTime = existing?.inTime ?? parsedInTime ?? now;

    const defaultHalfDayOut = combineDateAndTime(date, HALF_DAY_DEFAULT_OUT_TIME);

    if (outTime !== undefined) {
      finalOutTime = outTime ? parsedOutTime : existing?.outTime ?? defaultHalfDayOut;
    } else {
      finalOutTime =
        existing?.outTime ?? combineDateAndTime(date, resolveHalfDayOutTime(now));
    }

    if (finalInTime && finalOutTime && finalOutTime <= finalInTime) {
      finalOutTime = now > finalInTime ? now : defaultHalfDayOut;
    }
  } else if (status === "Leave" || status === "Absent") {
    finalInTime = null;
    finalOutTime = null;
  } else if (requiresInTime) {
    finalInTime = parsedInTime ?? existing?.inTime ?? now;
    finalOutTime = parsedOutTime ?? null;
  } else {
    finalInTime = parsedInTime ?? null;
    finalOutTime = parsedOutTime ?? null;
  }

  if (finalInTime && finalOutTime && finalOutTime <= finalInTime) {
    throw new Error("Out time must be after in time");
  }

  const departmentShift = await getActiveShiftForDepartment(prisma, employee.departmentId);
  const { lateMinutes, attendanceRemark } = buildLateMetricsForSave(
    departmentShift,
    finalInTime,
    status
  );

  let savedRecord;
  if (existing) {
    savedRecord = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        attendanceStatus: status,
        employeeCode: employee.employeeCode,
        camAttendanceId: employee.employeeCode,
        inTime: finalInTime,
        outTime: finalOutTime,
        lateMinutes,
        attendanceRemark,
        updatedBy: authUser.id,
      },
      include: { employee: { include: { department: true } } },
    });
  } else {
    savedRecord = await prisma.attendance.create({
      data: {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        camAttendanceId: employee.employeeCode,
        attendanceDate,
        attendanceStatus: status,
        inTime: finalInTime,
        outTime: finalOutTime,
        lateMinutes,
        attendanceRemark,
        createdBy: authUser.id,
      },
      include: { employee: { include: { department: true } } },
    });
  }

  if (requiresInTime) {
    await adjustLeaveForWorkAttendance(prisma, employee.id, date, authUser.id);
  }

  await createAuditLog({
    employeeId: authUser.id,
    moduleName: "Attendance",
    actionType: existing ? "UPDATE" : "CREATE",
    newValue: {
      date,
      employeeCode: employee.employeeCode,
      status,
      inTime: finalInTime?.toISOString(),
      outTime: finalOutTime?.toISOString(),
    },
  });

  return mapAttendanceRecord(savedRecord, prisma, departmentShift);
}

export function buildAbsentMarkRow(emp, shift = null) {
  return {
    id: `absent-${emp.id}`,
    employeeId: emp.id,
    employeeCode: emp.employeeCode,
    employeeName: emp.fullName,
    department: emp.department?.departmentName || "—",
    status: "Absent",
    statusLabel: "Not Marked",
    markStatusValue: null,
    inTime: null,
    inTimeInput: "",
    outTime: "—",
    outTimeInput: "",
    shiftTime: shift ? formatShiftTimeShort(shift.startTime) : "—",
    lateMinutes: null,
    attendanceRemark: null,
    isAbsent: true,
  };
}

export function statusLabelFromDbEnum(dbEnum) {
  return formatEnumLabel(dbEnum);
}
