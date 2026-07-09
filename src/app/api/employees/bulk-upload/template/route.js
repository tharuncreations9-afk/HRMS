import { requirePermission } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { buildTemplateWorkbook } from "@/lib/employee-bulk-upload";

export async function GET(request) {
  const { error } = await requirePermission(request, "Employee Management");
  if (error) return error;

  const [departments, designations] = await Promise.all([
    prisma.department.findMany({ orderBy: { departmentName: "asc" } }),
    prisma.designation.findMany({ orderBy: { designationName: "asc" } }),
  ]);
  const buffer = buildTemplateWorkbook(departments, designations);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="employee-bulk-upload-template.xlsx"',
    },
  });
}
