import { prisma } from "@/lib/prisma";
import { requireShiftManagement } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { parsePagination, buildListPagination } from "@/lib/pagination";
import { mapShiftRecord, validateShiftPayload, assertSingleActiveShift } from "@/lib/shift-server";

export async function GET(request) {
  const { error } = await requireShiftManagement(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const departmentId = searchParams.get("departmentId");
  const status = searchParams.get("status");

  const where = {
    ...(departmentId && departmentId !== "all"
      ? { departmentId: Number(departmentId) }
      : {}),
    ...(status === "Active" || status === "Inactive" ? { status } : {}),
  };

  const [shifts, total] = await Promise.all([
    prisma.departmentShift.findMany({
      where,
      include: { department: true },
      orderBy: [{ status: "asc" }, { department: { departmentName: "asc" } }],
      skip,
      take: limit,
    }),
    prisma.departmentShift.count({ where }),
  ]);

  return Response.json({
    shifts: shifts.map(mapShiftRecord),
    pagination: buildListPagination({ page, limit, total }),
  });
}

export async function POST(request) {
  const { user, error } = await requireShiftManagement(request);
  if (error) return error;

  const body = await request.json();
  const { errors, data } = validateShiftPayload(body);
  if (errors.length) {
    return Response.json({ error: errors[0] }, { status: 400 });
  }

  const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!department) {
    return Response.json({ error: "Department not found" }, { status: 404 });
  }

  if (data.status === "Active") {
    try {
      await assertSingleActiveShift(prisma, data.departmentId);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }
  }

  try {
    const shift = await prisma.departmentShift.create({
      data: {
        departmentId: data.departmentId,
        shiftName: data.shiftName,
        startTime: data.startTime,
        endTime: data.endTime,
        graceMinutes: data.graceMinutes,
        status: data.status,
        createdBy: user.id,
      },
      include: { department: true },
    });

    try {
      await createAuditLog({
        employeeId: user.id,
        moduleName: "Shift Management",
        actionType: "CREATE",
        newValue: mapShiftRecord(shift),
      });
    } catch (auditErr) {
      console.error("Shift audit log failed:", auditErr);
    }

    return Response.json({ shift: mapShiftRecord(shift) }, { status: 201 });
  } catch (err) {
    console.error("Create shift failed:", err);
    throw err;
  }
}
