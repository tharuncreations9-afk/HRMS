import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-server";
import { BRAND } from "@/lib/brand";
export async function GET(request) {
  const { error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department");

  const where = department && department !== "All Departments"
    ? { department: { departmentName: department } }
    : {};

  const employees = await prisma.employee.findMany({
    where: { ...where, status: "Active" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeCode: true, department: { select: { departmentName: true } } },
  });

  return Response.json({
    employees: employees.map((e) => ({
      id: String(e.id),
      name: e.fullName,
      employeeCode: e.employeeCode,
      department: e.department.departmentName,
    })),
    companyName: BRAND.legalName,  });
}
