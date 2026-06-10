import { prisma } from "@/lib/prisma";

import { verifyPassword, signToken } from "@/lib/auth-server";

import { getEmployeePermissions } from "@/lib/permissions-server";

import { createAuditLog } from "@/lib/audit";



export async function POST(request) {

  try {

    const { email, password } = await request.json();



    if (!email || !password) {

      return Response.json({ error: "Email and Password are required" }, { status: 400 });

    }



    const employee = await prisma.employee.findFirst({

      where: {

        email: email.trim().toLowerCase(),

        status: "Active",

      },

      include: {

        role: true,

        department: true,

        designation: true,

      },

    });



    if (!employee) {

      return Response.json({ error: "Invalid email or password" }, { status: 401 });

    }



    const valid = await verifyPassword(password, employee.passwordHash);

    if (!valid) {

      return Response.json({ error: "Invalid credentials" }, { status: 401 });

    }



    await prisma.employee.update({

      where: { id: employee.id },

      data: { lastLogin: new Date() },

    });



    const permissions = await getEmployeePermissions(employee.id, employee.roleId);



    const token = signToken({ employeeId: employee.id });



    await createAuditLog({

      employeeId: employee.id,

      moduleName: "Authentication",

      actionType: "LOGIN",

      newValue: { email: employee.email, employeeCode: employee.employeeCode },

    });



    return Response.json({

      token,

      user: {

        id: employee.id,

        employeeId: employee.id,

        name: employee.fullName,

        email: employee.email,

        role: employee.role.roleName,

        roleId: employee.roleId,

        employeeCode: employee.employeeCode,

        avatar: employee.profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${employee.employeeCode}`,

        department: employee.department.departmentName,

        designation: employee.designation.designationName,

        permissions,

      },

    });

  } catch (error) {

    console.error("Login error:", error);

    return Response.json({ error: "Login failed" }, { status: 500 });

  }

}

