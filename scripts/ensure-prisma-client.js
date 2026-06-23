/**
 * Ensures Prisma Client is generated before dev/build/start.
 * Uses node directly (no npx) for Synology NAS and minimal Docker images.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.join(__dirname, "..");
const clientIndex = path.join(root, "node_modules", ".prisma", "client", "index.js");
const clientDir = path.join(root, "node_modules", ".prisma", "client");

function isClientGenerated() {
  try {
    const indexStat = fs.statSync(clientIndex);
    if (indexStat.size < 50000) return false;

    const files = fs.readdirSync(clientDir);
    return files.some((name) => name.includes("wasm") || name === "index.js");
  } catch {
    return false;
  }
}

function getPrismaCliPath() {
  const candidates = [
    path.join(root, "node_modules", "prisma", "build", "index.js"),
    path.join(root, "node_modules", "prisma", "cli", "build", "index.js"),
    path.join(root, "node_modules", ".bin", "prisma"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error("Prisma CLI not found. Run npm install first.");
}

function generateClient() {
  const prismaCli = getPrismaCliPath();
  console.log("→ Prisma Client not found. Running prisma generate...");

  if (prismaCli.endsWith(".js")) {
    execFileSync(process.execPath, [prismaCli, "generate"], {
      stdio: "inherit",
      cwd: root,
      env: process.env,
    });
    return;
  }

  execFileSync(prismaCli, ["generate"], {
    stdio: "inherit",
    cwd: root,
    env: process.env,
  });
}

function printNasHelp() {
  console.error(`
❌ Prisma Client could not be generated on this machine.

If you see "Segmentation fault" on Synology NAS, generate on your laptop instead:

  1. On laptop (in project folder):
     npm run db:generate

  2. Copy these folders to the server:
     node_modules/.prisma/
     node_modules/@prisma/client/

  3. Then on server:
     npm run dev
`);
}

function main() {
  if (isClientGenerated()) {
    console.log("✔ Prisma Client ready");
    return;
  }

  try {
    generateClient();
  } catch {
    printNasHelp();
    process.exit(1);
  }

  if (!isClientGenerated()) {
    printNasHelp();
    process.exit(1);
  }

  console.log("✔ Prisma Client generated successfully");
}

main();
