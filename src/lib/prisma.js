import { PrismaClient, AuditActionType } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { parseDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const adapter = new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL));
  return new PrismaClient({
    adapter,
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
