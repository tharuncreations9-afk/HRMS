import { prisma } from "@/lib/prisma";



export async function createAuditLog({

  employeeId,

  userId,

  moduleName,

  actionType,

  oldValue = null,

  newValue = null,

}) {

  return prisma.auditLog.create({

    data: {

      employeeId: employeeId ?? userId,

      moduleName,

      actionType,

      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,

      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,

    },

  });

}

