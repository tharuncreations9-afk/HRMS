import { PrismaClient, AuditActionType } from "@prisma/client";

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function shouldRefreshClient() {
  const hasCorrectionActions = Object.values(AuditActionType).includes("CORRECTION_REQUEST");
  return globalForPrisma.prismaSchemaRevision !== hasCorrectionActions;
}

if (process.env.NODE_ENV !== "production" && globalForPrisma.prisma && shouldRefreshClient()) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaRevision = Object.values(AuditActionType).includes(
    "CORRECTION_REQUEST"
  );
}
