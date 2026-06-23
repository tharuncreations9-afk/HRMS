export function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const url = new URL(databaseUrl);
  let host = url.hostname;
  // Avoid IPv6 localhost issues on Synology/Docker hosts.
  if (host === "localhost") host = "127.0.0.1";

  return {
    host,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 10,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    // Required for MySQL 8+/9 with caching_sha2_password (Docker mysql-hrms).
    allowPublicKeyRetrieval: true,
  };
}
