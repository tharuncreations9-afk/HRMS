import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canManageEmployees,
  hasFullAccess,
  forbiddenResponse,
} from "@/lib/auth-server";

const ALLOWED_TYPES = [
  "PAN",
  "Aadhaar",
  "Bank_Passbook",
  "Offer_Letter",
  "Agreement",
  "Experience_Letter",
  "Relieving_Letter",
  "Payslip",
  "Other",
];
const MAX_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const PHOTO_MIME = ["image/jpeg", "image/jpg", "image/png"];

function canUploadDocument(user, employeeId, documentType) {
  if (canManageEmployees(user) || hasFullAccess(user)) return true;
  const isOwn = user.id === employeeId || user.employeeId === employeeId;
  if (!isOwn || !user.permissions?.includes("Edit Profile")) return false;
  return documentType === "Other";
}

export async function POST(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const employeeId = parseInt(params.id, 10);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const documentType = String(formData.get("documentType") || "");

  if (!canUploadDocument(user, employeeId, documentType)) {
    return forbiddenResponse();
  }

  if (!file || typeof file === "string") {
    return Response.json({ error: "File is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(documentType)) {
    return Response.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: "File must be under 2MB" }, { status: 400 });
  }

  const isPhotoUpload = documentType === "Other";
  if (isPhotoUpload && !PHOTO_MIME.includes(file.type)) {
    return Response.json({ error: "Profile photo must be JPG or PNG" }, { status: 400 });
  }
  if (!isPhotoUpload && !ALLOWED_MIME.includes(file.type)) {
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

  const employeeUpdate = {};
  if (documentType === "Experience_Letter") {
    employeeUpdate.experienceLetterUrl = publicPath;
  } else if (documentType === "Relieving_Letter") {
    employeeUpdate.relievingLetterUrl = publicPath;
  } else if (documentType === "Payslip") {
    const current = Array.isArray(employee.payslipUrls) ? employee.payslipUrls : [];
    employeeUpdate.payslipUrls = [...current, publicPath].slice(-3);
  } else if (documentType === "Other" && !canManageEmployees(user) && !hasFullAccess(user)) {
    employeeUpdate.profilePhoto = publicPath;
  }

  if (Object.keys(employeeUpdate).length) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: employeeUpdate,
    });
  }

  return Response.json({
    document: {
      id: doc.id,
      name: doc.documentType.replace(/_/g, " "),
      fileName: doc.fileName,
      url: doc.filePath,
    },
    employeeUrls: employeeUpdate,
    profilePhoto: employeeUpdate.profilePhoto || undefined,
  });
}
