import { prisma } from "@/lib/prisma";
import { requirePermission, hashPassword } from "@/lib/auth-server";
import { createAuditLog } from "@/lib/audit";
import { parseEmployeeWorkbook, validateEmployeeRow } from "@/lib/employee-bulk-upload";

export async function POST(request) {
  const { user, error } = await requirePermission(request, "Employee Management");
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return Response.json({ error: "Excel file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseEmployeeWorkbook(buffer);

    const [departments, designations, roles, managers, existingEmployees, leaveTypes, defaultRole] =
      await Promise.all([
        prisma.department.findMany(),
        prisma.designation.findMany(),
        prisma.role.findMany(),
        prisma.employee.findMany({
          where: { status: "Active" },
          select: { id: true, employeeCode: true },
        }),
        prisma.employee.findMany({ select: { employeeCode: true, email: true } }),
        prisma.leaveType.findMany(),
        prisma.role.findUnique({ where: { roleName: "employee" } }),
      ]);

    if (!defaultRole) {
      return Response.json({ error: "Default employee role not found" }, { status: 400 });
    }

    const departmentByName = new Map(
      departments.map((d) => [d.departmentName.toLowerCase(), d])
    );
    const designationByName = new Map(
      designations.map((d) => [d.designationName.toLowerCase(), d])
    );
    const roleByName = new Map(roles.map((r) => [r.roleName.toLowerCase(), r]));
    const managerByCode = new Map(
      managers.map((m) => [m.employeeCode.toLowerCase(), m])
    );
    const existingCodes = new Set(existingEmployees.map((e) => e.employeeCode.toLowerCase()));
    const existingEmails = new Set(existingEmployees.map((e) => e.email.toLowerCase()));
    const seenCodes = new Set();
    const seenEmails = new Set();

    const failures = [];
    const successes = [];
    const year = new Date().getFullYear();

    for (const row of rows) {
      const codeKey = row.employeeCode?.trim().toLowerCase();
      const emailKey = row.email?.trim().toLowerCase();

      const validation = validateEmployeeRow(row, {
        existingCodes,
        existingEmails,
        seenCodes,
        seenEmails,
        departmentByName,
        designationByName,
        roleByName,
        managerByCode,
      });

      if (!validation.valid) {
        failures.push({
          row: row.rowNumber,
          employeeCode: row.employeeCode || "",
          name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
          errors: validation.errors,
        });
        continue;
      }

      const data = validation.data;
      if (codeKey) seenCodes.add(codeKey);
      if (emailKey) seenEmails.add(emailKey);

      try {
        const passwordHash = await hashPassword(data.password);
        const employee = await prisma.employee.create({
          data: {
            employeeCode: data.employeeCode,
            camAttendanceId: data.employeeCode,
            firstName: data.firstName,
            lastName: data.lastName || "",
            fullName: data.fullName,
            dob: data.dob,
            gender: data.gender,
            bloodGroup: data.bloodGroup,
            mobile: data.mobile,
            alternateMobile: data.alternateMobile,
            email: data.email,
            passwordHash,
            roleId: data.roleId || defaultRole.id,
            address: data.address,
            departmentId: data.departmentId,
            designationId: data.designationId,
            reportingManagerId: data.reportingManagerId,
            joiningDate: data.joiningDate,
            employmentType: data.employmentType,
            status: data.status,
            emergencyContact: data.emergencyContact,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            pan: data.pan,
            aadhaar: data.aadhaar,
            createdBy: user.id,
          },
        });

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

        existingCodes.add(data.employeeCode.toLowerCase());
        existingEmails.add(data.email.toLowerCase());
        managerByCode.set(data.employeeCode.toLowerCase(), {
          id: employee.id,
          employeeCode: employee.employeeCode,
        });

        successes.push({
          row: row.rowNumber,
          employeeCode: employee.employeeCode,
          name: employee.fullName,
        });
      } catch (err) {
        failures.push({
          row: row.rowNumber,
          employeeCode: data.employeeCode,
          name: data.fullName,
          errors: [err.code === "P2002" ? "Duplicate record in database" : err.message || "Failed to save"],
        });
      }
    }

    if (successes.length) {
      try {
        await createAuditLog({
          userId: user.id,
          moduleName: "Employee Management",
          actionType: "CREATE",
          newValue: {
            bulkUpload: true,
            uploaded: successes.length,
            failed: failures.length,
            employees: successes.map((s) => s.employeeCode),
          },
        });
      } catch (auditErr) {
        console.error("Bulk upload audit log failed:", auditErr);
      }
    }

    return Response.json({
      summary: {
        total: rows.length,
        success: successes.length,
        failed: failures.length,
      },
      successes,
      failures,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    return Response.json({ error: err.message || "Bulk upload failed" }, { status: 400 });
  }
}
