import { prisma } from "@/lib/prisma";
import { requireAuth, canManageRoles, forbiddenResponse } from "@/lib/auth-server";

const roleColors = {
  employee: "from-blue-500 to-blue-600",
  manager: "from-emerald-500 to-emerald-600",
  security: "from-cyan-500 to-cyan-600",
  hr: "from-purple-500 to-purple-600",
  admin: "from-amber-500 to-amber-600",
  super_admin: "from-red-500 to-red-600",
};

export async function GET(request) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  if (!canManageRoles(user)) return forbiddenResponse();

  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { employees: true } },
    },
    orderBy: { id: "asc" },
  });

  return Response.json({
    roles: roles.map((role) => ({
      id: role.id,
      roleName: role.roleName,
      name: role.roleName.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      color: roleColors[role.roleName] || "from-gray-500 to-gray-600",
      permissionCount: role.rolePermissions.length,
      permissions: role.rolePermissions.map((rp) => rp.permission.permissionName),
      permissionDetails: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.permissionName,
        module: rp.permission.moduleName,
      })),
      userCount: role._count.employees,
      lastUpdated: role.updatedAt.toISOString(),
    })),
    canManage: canManageRoles(user),
  });
}
