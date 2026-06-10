import { prisma } from "@/lib/prisma";
import { requireOrgManagement } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(request, { params }) {
  const { user, error } = await requireOrgManagement(request);
  if (error) return error;

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) {
    return Response.json({ error: "Invalid designation id" }, { status: 400 });
  }

  const existing = await prisma.designation.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Designation not found" }, { status: 404 });
  }

  const body = await request.json();
  const designationName = body.designationName?.trim();

  if (!designationName) {
    return Response.json({ error: "Designation name is required" }, { status: 400 });
  }

  try {
    const designation = await prisma.designation.update({
      where: { id },
      data: {
        designationName,
        updatedBy: user.id,
      },
    });

    try {
      await createAuditLog({
        userId: user.id,
        moduleName: "Department Management",
        actionType: "UPDATE",
        oldValue: existing,
        newValue: designation,
      });
    } catch (auditErr) {
      console.error("Designation audit log failed:", auditErr);
    }

    return Response.json({ designation });
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ error: "Designation name already exists" }, { status: 400 });
    }
    throw err;
  }
}
