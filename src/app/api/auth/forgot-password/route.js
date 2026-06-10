import crypto from "crypto";

import { prisma } from "@/lib/prisma";

import { createAuditLog } from "@/lib/audit";



export async function POST(request) {

  try {

    const { employeeCode, email } = await request.json();

    const identifier = (employeeCode || email || "").trim();



    if (!identifier) {

      return Response.json({ error: "Employee Code or Email is required" }, { status: 400 });

    }



    const employee = await prisma.employee.findFirst({

      where: {

        OR: [{ employeeCode: identifier }, { email: identifier }],

        status: "Active",

      },

    });



    const successMessage = "If the account exists, a reset link has been sent to the registered email.";



    if (!employee) {

      return Response.json({ message: successMessage });

    }



    const token = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);



    await prisma.passwordResetToken.create({

      data: {

        employeeId: employee.id,

        token,

        expiresAt,

      },

    });



    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const resetUrl = `${appUrl}/reset-password?token=${token}`;



    console.log(`[Password Reset] ${employee.email} → ${resetUrl}`);



    await createAuditLog({

      employeeId: employee.id,

      moduleName: "Authentication",

      actionType: "CREATE",

      newValue: { action: "Password Reset Requested", email: employee.email },

    });



    return Response.json({

      message: successMessage,

      ...(process.env.NODE_ENV === "development" && { devResetUrl: resetUrl }),

    });

  } catch (error) {

    console.error("Forgot password error:", error);

    return Response.json({ error: "Request failed" }, { status: 500 });

  }

}

