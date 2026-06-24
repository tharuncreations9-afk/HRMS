/**
 * Clears legacy profile_photo paths/URLs and converts column to LONGBLOB.
 * Run: npm run db:fix-profile-photos
 */
const fs = require("fs");
const path = require("path");
const mariadb = require("mariadb");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found at", envPath);
    process.exit(1);
  }

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  let host = url.hostname;
  if (host === "localhost") host = "127.0.0.1";

  return {
    host,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectTimeout: 15000,
    allowPublicKeyRetrieval: true,
  };
}

async function main() {
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const config = parseDatabaseUrl(process.env.DATABASE_URL);
  const pool = mariadb.createPool(config);

  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL");

    const [{ cnt: legacyCount }] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM employees
       WHERE profile_photo IS NOT NULL
         AND (
           profile_photo LIKE '/%'
           OR profile_photo LIKE 'http%'
         )`
    );

    if (legacyCount > 0) {
      const cleared = await conn.query(
        `UPDATE employees
         SET profile_photo = NULL
         WHERE profile_photo IS NOT NULL
           AND (
             profile_photo LIKE '/%'
             OR profile_photo LIKE 'http%'
           )`
      );
      console.log(`🧹 Cleared ${cleared.affectedRows ?? legacyCount} legacy profile_photo path(s)`);
    } else {
      console.log("ℹ️  No legacy profile_photo paths found");
    }

    await conn.query("ALTER TABLE employees MODIFY COLUMN profile_photo LONGBLOB NULL");
    console.log("✅ profile_photo column is now LONGBLOB");

    conn.release();
    console.log("Done. Restart the app and log in again.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
