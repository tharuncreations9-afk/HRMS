import { prisma } from "@/lib/prisma";
import { requireOrgManagement } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { parsePagination, buildListPagination } from "@/lib/pagination";
import { formatEmployeeId } from "@/lib/employee-id";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);
  const departmentId = searchParams.get("departmentId");

  const where = {};
  if (departmentId && departmentId !== "all") {
    const id = parseInt(departmentId, 10);
    if (!Number.isNaN(id)) where.departmentId = id;
  }

  const [designations, total] = await Promise.all([
    prisma.designation.findMany({
      where,
      orderBy: [{ department: { departmentName: "asc" } }, { designationName: "asc" }],
      include: {
        department: true,
        _count: { select: { employees: true } },
      },
      skip,
      take: limit,
    }),
    prisma.designation.count({ where }),
  ]);

  return Response.json({
    designations: designations.map((d) => ({
      ...d,
      idFormatPreview: formatEmployeeId(d.designationCode, d.sequenceStart, d.sequenceStart),
    })),
    pagination: buildListPagination({ page, limit, total }),
  });
}

export async function POST(request) {
  const { user, error } = await requireOrgManagement(request);
  if (error) return error;

  const body = await request.json();
  const designationName = body.designationName?.trim();
  const designationCode = body.designationCode?.trim().toUpperCase();
  const departmentId = parseInt(body.departmentId, 10);
  const sequenceStart = parseInt(body.sequenceStart, 10);

  if (!designationName) {
    return Response.json({ error: "Designation name is required" }, { status: 400 });
  }
  if (!designationCode || !/^[A-Z0-9]{1,10}$/.test(designationCode)) {
    return Response.json({ error: "Valid designation code is required (e.g. AC, IT)" }, { status: 400 });
  }
  if (Number.isNaN(departmentId)) {
    return Response.json({ error: "Department is required" }, { status: 400 });
  }
  if (Number.isNaN(sequenceStart) || sequenceStart < 1) {
    return Response.json({ error: "Sequence start must be a positive number" }, { status: 400 });
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!department) {
    return Response.json({ error: "Department not found" }, { status: 400 });
  }

  try {
    const designation = await prisma.designation.create({
      data: {
        designationName,
        designationCode,
        departmentId,
        sequenceStart,
        lastSequence: null,
        releasedSequences: [],
        createdBy: user.id,
      },
      include: { department: true, _count: { select: { employees: true } } },
    });

    try {
      await createAuditLog({
        userId: user.id,
        moduleName: "Department Management",
        actionType: "CREATE",
        newValue: designation,
      });
    } catch (auditErr) {
      console.error("Designation audit log failed:", auditErr);
    }

    return Response.json(
      {
        designation: {
          ...designation,
          idFormatPreview: formatEmployeeId(designation.designationCode, sequenceStart, sequenceStart),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ error: "Designation code or name already exists in this department" }, { status: 400 });
    }
    throw err;
  }
}
