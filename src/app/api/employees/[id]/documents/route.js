import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-server";

const ALLOWED_TYPES = ["PAN", "Aadhaar", "Bank_Passbook", "Offer_Letter", "Agreement", "Other"];
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

export async function POST(request, { params }) {
  const { user, error } = await requirePermission(request, "Employee Management");
  if (error) return error;

  const employeeId = parseInt(params.id, 10);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const documentType = String(formData.get("documentType") || "");

  if (!file || typeof file === "string") {
    return Response.json({ error: "File is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(documentType)) {
    return Response.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File must be under 2MB" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return Response.json({ error: "Only JPG, PNG, and PDF files are allowed" }, { status: 400 });
  }

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const storedName = `${documentType}_${Date.now()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "employees", String(employeeId));
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, storedName), buffer);

  const publicPath = `/uploads/employees/${employeeId}/${storedName}`;

  const existing = await prisma.employeeDocument.findFirst({
    where: { employeeId, documentType },
  });

  const doc = existing
    ? await prisma.employeeDocument.update({
        where: { id: existing.id },
        data: { fileName: file.name, filePath: publicPath, updatedBy: user.id },
      })
    : await prisma.employeeDocument.create({
        data: {
          employeeId,
          documentType,
          fileName: file.name,
          filePath: publicPath,
          createdBy: user.id,
        },
      });

  return Response.json({
    document: {
      id: doc.id,
      name: doc.documentType.replace(/_/g, " "),
      fileName: doc.fileName,
      url: doc.filePath,
    },
  });
}
