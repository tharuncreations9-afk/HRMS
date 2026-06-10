import { prisma } from "@/lib/prisma";
import { requireOrgManagement } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const departments = await prisma.department.findMany({
    orderBy: { departmentName: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return Response.json({ departments });
}

export async function POST(request) {
  const { user, error } = await requireOrgManagement(request);
  if (error) return error;

  const body = await request.json();
  const departmentName = body.departmentName?.trim();
  const departmentCode = body.departmentCode?.trim().toUpperCase();

  if (!departmentName) {
    return Response.json({ error: "Department name is required" }, { status: 400 });
  }
  if (!departmentCode) {
    return Response.json({ error: "Department code is required" }, { status: 400 });
  }

  try {
    const department = await prisma.department.create({
      data: {
        departmentName,
        departmentCode,
        createdBy: user.id,
      },
      include: { _count: { select: { employees: true } } },
    });

    try {
      await createAuditLog({
        userId: user.id,
        moduleName: "Department Management",
        actionType: "CREATE",
        newValue: department,
      });
    } catch (auditErr) {
      console.error("Department audit log failed:", auditErr);
    }

    return Response.json({ department }, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ error: "Department code already exists" }, { status: 400 });
    }
    throw err;
  }
}
