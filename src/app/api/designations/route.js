import { prisma } from "@/lib/prisma";
import { requireOrgManagement } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { parsePagination, buildListPagination } from "@/lib/pagination";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  const [designations, total] = await Promise.all([
    prisma.designation.findMany({
      orderBy: { designationName: "asc" },
      include: { _count: { select: { employees: true } } },
      skip,
      take: limit,
    }),
    prisma.designation.count(),
  ]);

  return Response.json({
    designations,
    pagination: buildListPagination({ page, limit, total }),
  });
}

export async function POST(request) {
  const { user, error } = await requireOrgManagement(request);
  if (error) return error;

  const body = await request.json();
  const designationName = body.designationName?.trim();

  if (!designationName) {
    return Response.json({ error: "Designation name is required" }, { status: 400 });
  }

  try {
    const designation = await prisma.designation.create({
      data: {
        designationName,
        createdBy: user.id,
      },
      include: { _count: { select: { employees: true } } },
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

    return Response.json({ designation }, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ error: "Designation name already exists" }, { status: 400 });
    }
    throw err;
  }
}
