/**
 * Shared Prisma client factory (CommonJS) for seed/scripts.
 * Uses driver adapter — no Rust query engine binary (Synology/NAS compatible).
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 10,
  };
}

function createPrismaClient(options = {}) {
  const adapter = new PrismaMariaDb(parseDatabaseUrl(process.env.DATABASE_URL));
  return new PrismaClient({
    adapter,
    log: options.log || (process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]),
  });
}

module.exports = { createPrismaClient, parseDatabaseUrl };
