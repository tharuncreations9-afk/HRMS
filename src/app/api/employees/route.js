import { prisma } from "@/lib/prisma";
import { requireAuth, requirePermission, hashPassword } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { createNotification, getUsersByRole, notifyUsers } from "@/lib/notifications";

function mapEmployee(emp) {
  return {
    id: String(emp.id),
    employeeCode: emp.employeeCode,
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
    reportingManager: emp.reportingManager?.fullName || null,
    reportingManagerId: emp.reportingManagerId,
    joiningDate: emp.joiningDate?.toISOString().split("T")[0],
    employmentType: emp.employmentType?.replace("_", " "),
    status: emp.status?.replace("_", " "),
    emergencyContact: emp.emergencyContact,
    bankName: emp.bankName,
    accountNumber: emp.accountNumber,
    pan: emp.pan,
    aadhaar: emp.aadhaar,
  };
}

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const department = searchParams.get("department");
  const designation = searchParams.get("designation");
  const status = searchParams.get("status");

  const where = { AND: [] };

  if (search) {
    where.AND.push({
      OR: [
        { employeeCode: { contains: search } },
        { fullName: { contains: search } },
        { mobile: { contains: search } },
        { department: { departmentName: { contains: search } } },
      ],
    });
  }
  if (department && department !== "all") {
    where.AND.push({ department: { departmentName: department } });
  }
  if (designation && designation !== "all") {
    where.AND.push({ designation: { designationName: designation } });
  }
  if (status && status !== "all") {
    where.AND.push({ status: status.replace(" ", "_") });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
  const skip = (page - 1) * limit;
  const whereClause = where.AND.length ? where : undefined;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: whereClause,
      include: {
        department: true,
        designation: true,
        reportingManager: true,
      },
      orderBy: { employeeCode: "asc" },
      skip,
      take: limit,
    }),
    prisma.employee.count({ where: whereClause }),
  ]);

  return Response.json({
    employees: employees.map(mapEmployee),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      hasMore: skip + employees.length < total,
    },
  });
}

export async function POST(request) {
  const { user, error } = await requirePermission(request, "Employee Management");
  if (error) return error;

  try {
    const body = await request.json();
    const fullName = `${body.firstName || ""} ${body.lastName || ""}`.trim() || body.fullName;

    const missing = [];
    if (!body.employeeCode?.trim()) missing.push("Employee Code");
    if (!body.firstName?.trim() && !body.lastName?.trim() && !fullName) missing.push("Name");
    if (!body.mobile?.trim()) missing.push("Mobile");
    if (!body.email?.trim()) missing.push("Email");
    if (!body.departmentId) missing.push("Department");
    if (!body.designationId) missing.push("Designation");
    if (!body.joiningDate) missing.push("Joining Date");
    if (missing.length) {
      return Response.json({ error: `Required fields missing: ${missing.join(", ")}` }, { status: 400 });
    }

    if (!body.password || body.password.length < 6) {
      return Response.json({ error: "Password is required (minimum 6 characters)" }, { status: 400 });
    }

    const employeeRole = await prisma.role.findUnique({ where: { roleName: "employee" } });
    if (!employeeRole) {
      return Response.json({ error: "Default employee role not found" }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);

    const employee = await prisma.employee.create({
      data: {
        employeeCode: body.employeeCode.trim(),
        camAttendanceId: body.employeeCode.trim(),
        firstName: body.firstName || fullName.split(" ")[0],
        lastName: body.lastName || fullName.split(" ").slice(1).join(" ") || "",
        fullName,
        profilePhoto: body.profilePhoto,
        dob: body.dob ? new Date(body.dob) : null,
        gender: body.gender,
        bloodGroup: body.bloodGroup,
        mobile: body.mobile,
        alternateMobile: body.alternateMobile,
        email: body.email,
        passwordHash,
        roleId: body.roleId ? parseInt(body.roleId, 10) : employeeRole.id,
        address: body.address,
        departmentId: parseInt(body.departmentId, 10),
        designationId: parseInt(body.designationId, 10),
        reportingManagerId: body.reportingManagerId ? parseInt(body.reportingManagerId, 10) : null,
        joiningDate: new Date(body.joiningDate),
        employmentType: body.employmentType || "Full_Time",
        status: body.status || "Active",
        emergencyContact: body.emergencyContact,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        pan: body.pan,
        aadhaar: body.aadhaar,
        createdBy: user.id,
      },
      include: { department: true, designation: true },
    });

    const year = new Date().getFullYear();
    const leaveTypes = await prisma.leaveType.findMany();
    if (leaveTypes.length) {
      await prisma.leaveBalance.createMany({
        data: leaveTypes.map((lt) => ({
          employeeId: employee.id,
          leaveTypeId: lt.id,
          totalLeave: lt.yearlyLimit,
          usedLeave: 0,
          remainingLeave: lt.yearlyLimit,
          year,
        })),
      });
    }

    await createAuditLog({
      userId: user.id,
      moduleName: "Employee Management",
      actionType: "CREATE",
      newValue: { employeeCode: employee.employeeCode, name: employee.fullName },
    });

    const hrUsers = await getUsersByRole("hr");
    const adminUsers = await getUsersByRole("admin");
    const superAdminUsers = await getUsersByRole("super_admin");
    await notifyUsers([...hrUsers, ...adminUsers, ...superAdminUsers], {
      title: "Employee Added",
      message: `New employee ${employee.fullName} (${employee.employeeCode}) has been added.`,
      module: "Employee Management",
    });

    return Response.json({ employee: mapEmployee(employee) }, { status: 201 });
  } catch (err) {
    console.error("Create employee error:", err);
    if (err.code === "P2002") {
      const target = (err.meta?.target || []).join(", ");
      if (target.includes("email")) return Response.json({ error: "Email already exists" }, { status: 400 });
      if (target.includes("employee_code")) return Response.json({ error: "Employee Code already exists" }, { status: 400 });
      if (target.includes("cam_attendance_id")) return Response.json({ error: "Employee ID already exists" }, { status: 400 });
      return Response.json({ error: "Duplicate value — record already exists" }, { status: 400 });
    }
    return Response.json({ error: err.message || "Failed to create employee" }, { status: 400 });
  }
}
