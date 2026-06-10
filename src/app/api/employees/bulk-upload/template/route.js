import { requirePermission } from "@/lib/auth-server";
import { buildTemplateWorkbook } from "@/lib/employee-bulk-upload";

export async function GET(request) {
  const { error } = await requirePermission(request, "Employee Management");
  if (error) return error;

  const buffer = buildTemplateWorkbook();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="employee-bulk-upload-template.xlsx"',
    },
  });
}
