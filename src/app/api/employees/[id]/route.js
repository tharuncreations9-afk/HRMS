import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

function mapEmployee(emp) {
  return {
    id: String(emp.id),
    employeeCode: emp.employeeCode,
    firstName: emp.firstName,
    lastName: emp.lastName,
    name: emp.fullName,
    photo: emp.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp.employeeCode}`,
    dob: emp.dob?.toISOString().split("T")[0],
    gender: emp.gender,
    bloodGroup: emp.bloodGroup,
    mobile: emp.mobile,
    alternateMobile: emp.alternateMobile,
    email: emp.email,
    address: emp.address,
    department: emp.department?.departmentName,
    departmentId: emp.departmentId,
    designation: emp.designation?.designationName,
    designationId: emp.designationId,
    reportingManager: emp.reportingManager?.fullName,
    reportingManagerId: emp.reportingManagerId,
    roleId: emp.roleId,
    roleName: emp.role?.roleName?.replace("_", " "),
    joiningDate: emp.joiningDate?.toISOString().split("T")[0],
    employmentType: emp.employmentType?.replace("_", " "),
    employmentTypeValue: emp.employmentType,
    status: emp.status?.replace("_", " "),
    statusValue: emp.status,
    emergencyContact: emp.emergencyContact,
    bankName: emp.bankName,
    accountNumber: emp.accountNumber,
    pan: emp.pan,
    aadhaar: emp.aadhaar,
  };
}

function canEditEmployee(user, employeeId) {
  const isOwn = user.employeeId === employeeId;
  return (
    user.permissions.includes("Employee Management") ||
    user.permissions.includes("Full System Access") ||
    (isOwn && user.permissions.includes("Edit Profile"))
  );
}

export async function GET(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const id = parseInt(params.id, 10);
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { department: true, designation: true, reportingManager: true, role: true },
  });

  if (!employee) return Response.json({ error: "Not found" }, { status: 404 });

  const canEdit = canEditEmployee(user, id);
  let lookups = null;
  if (canEdit) {
    const [departments, designations, roles, managers] = await Promise.all([
      prisma.department.findMany({ orderBy: { departmentName: "asc" } }),
      prisma.designation.findMany({ orderBy: { designationName: "asc" } }),
      prisma.role.findMany({ orderBy: { roleName: "asc" } }),
      prisma.employee.findMany({
        where: { status: "Active", id: { not: id } },
        select: { id: true, fullName: true, employeeCode: true },
        orderBy: { fullName: "asc" },
      }),
    ]);
    lookups = {
      departments,
      designations,
      roles: roles.map((r) => ({
        id: r.id,
        roleName: r.roleName,
        label: r.roleName.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
      managers,
    };
  }

  const [attendance, leaves, documents, activityLogs] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: id },
      orderBy: { attendanceDate: "desc" },
      take: 10,
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: id },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.employeeDocument.findMany({ where: { employeeId: id } }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { newValue: { path: "$.employeeCode", equals: employee.employeeCode } },
          { moduleName: "Employee Management" },
        ],
      },
      orderBy: { actionDate: "desc" },
      take: 10,
    }),
  ]);

  return Response.json({
    employee: mapEmployee(employee),
    lookups,
    attendance: attendance.map((a) => ({
      date: a.attendanceDate.toISOString().split("T")[0],
      status: a.attendanceStatus.replace("_", " "),
      inTime: a.inTime ? a.inTime.toISOString().slice(11, 16) : "-",
      outTime: a.outTime ? a.outTime.toISOString().slice(11, 16) : "-",
    })),
    leaves: leaves.map((l) => ({
      type: l.leaveType.leaveName,
      from: l.fromDate.toISOString().split("T")[0],
      to: l.toDate.toISOString().split("T")[0],
      days: Number(l.totalDays),
      status: l.finalStatus,
    })),
    documents: documents.map((d) => ({
      name: d.documentType.replace(/_/g, " "),
      fileName: d.fileName,
      url: d.filePath,
    })),
    activityLogs: activityLogs.map((log) => ({
      action: `${log.moduleName} ${log.actionType}`,
      by: "System",
      date: log.actionDate.toISOString().split("T")[0],
      details: log.newValue ? JSON.stringify(log.newValue) : "",
    })),
  });
}

export async function PATCH(request, { params }) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const id = parseInt(params.id, 10);
  const isOwn = user.employeeId === id;
  const canEdit =
    user.permissions.includes("Employee Management") ||
    user.permissions.includes("Full System Access") ||
    (isOwn && user.permissions.includes("Edit Profile"));

  if (!canEdit) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updateData = {};

  const fields = [
    "firstName", "lastName", "gender", "bloodGroup", "mobile", "alternateMobile",
    "email", "address", "emergencyContact", "bankName", "accountNumber", "pan", "aadhaar", "profilePhoto",
  ];
  fields.forEach((f) => { if (body[f] !== undefined) updateData[f] = body[f]; });
  if (body.dob) updateData.dob = new Date(body.dob);
  if (body.departmentId) updateData.departmentId = parseInt(body.departmentId, 10);
  if (body.designationId) updateData.designationId = parseInt(body.designationId, 10);
  if (body.roleId) updateData.roleId = parseInt(body.roleId, 10);
  if (body.joiningDate) updateData.joiningDate = new Date(body.joiningDate);
  if (body.employmentType) {
    updateData.employmentType = String(body.employmentType).replace(/ /g, "_");
  }
  if (body.status) updateData.status = String(body.status).replace(/ /g, "_");
  if (body.reportingManagerId === null || body.reportingManagerId === "") {
    updateData.reportingManagerId = null;
  } else if (body.reportingManagerId !== undefined) {
    updateData.reportingManagerId = parseInt(body.reportingManagerId, 10);
  }
  if (body.employeeCode?.trim() && body.employeeCode.trim() !== existing.employeeCode) {
    updateData.employeeCode = body.employeeCode.trim();
    updateData.camAttendanceId = body.employeeCode.trim();
  }
  if (body.firstName !== undefined || body.lastName !== undefined) {
    updateData.firstName = body.firstName ?? existing.firstName;
    updateData.lastName = body.lastName ?? existing.lastName;
    updateData.fullName = `${updateData.firstName} ${updateData.lastName}`.trim();
  }
  updateData.updatedBy = user.id;

  const employee = await prisma.employee.update({
    where: { id },
    data: updateData,
    include: { department: true, designation: true, reportingManager: true, role: true },
  });

  await createAuditLog({
    userId: user.id,
    moduleName: "Employee Management",
    actionType: "UPDATE",
    oldValue: { employeeCode: existing.employeeCode, ...existing },
    newValue: updateData,
  });

  await createNotification({
    employeeId: id,
    title: "Profile Updated",
    message: "Your employee profile has been updated.",
    module: "Employee Self-Service",
  });

  return Response.json({ employee: mapEmployee(employee) });
}
