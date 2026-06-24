import { prisma } from "@/lib/prisma";
import {
  requireAuth,
  canManageEmployees,
  hasFullAccess,
  forbiddenResponse,
} from "@/lib/auth-server";
import { mapEmployee } from "@/lib/employee-mapper";
import { getEmployeeIdsOnLeaveToday } from "@/lib/employee-status";
import {
  profilePhotoToDataUri,
  validateProfilePhotoFile,
} from "@/lib/profile-photo";

function canManagePhoto(user, employeeId) {
  if (canManageEmployees(user) || hasFullAccess(user)) return true;
  const isOwn = user.id === employeeId || user.employeeId === employeeId;
  return isOwn && user.permissions?.includes("Edit Profile");
}

export async function POST(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const employeeId = parseInt(params.id, 10);
  if (Number.isNaN(employeeId)) {
    return Response.json({ error: "Invalid employee id" }, { status: 400 });
  }

  if (!canManagePhoto(user, employeeId)) {
    return forbiddenResponse();
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  const validation = validateProfilePhotoFile(file);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      profilePhoto: buffer,
      updatedBy: user.id,
    },
    include: { department: true, designation: true, reportingManager: true, role: true },
  });

  const profile_photo = profilePhotoToDataUri(updated.profilePhoto, file.type);

  return Response.json({
    profile_photo,
    employee: mapEmployee(updated, await getEmployeeIdsOnLeaveToday(prisma)),
  });
}

export async function DELETE(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const employeeId = parseInt(params.id, 10);
  if (Number.isNaN(employeeId)) {
    return Response.json({ error: "Invalid employee id" }, { status: 400 });
  }

  if (!canManagePhoto(user, employeeId)) {
    return forbiddenResponse();
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return Response.json({ error: "Employee not found" }, { status: 404 });
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      profilePhoto: null,
      updatedBy: user.id,
    },
    include: { department: true, designation: true, reportingManager: true, role: true },
  });

  return Response.json({
    profile_photo: null,
    employee: mapEmployee(updated, await getEmployeeIdsOnLeaveToday(prisma)),
  });
}
