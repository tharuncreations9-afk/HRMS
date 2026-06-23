/**
 * Ensures Prisma Client is generated before dev/build/start.
 * On Synology NAS, postinstall may fail silently — this script re-runs generate when needed.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const clientIndex = path.join(root, "node_modules", ".prisma", "client", "index.js");
const clientDir = path.join(root, "node_modules", ".prisma", "client");

function isClientGenerated() {
  try {
    const indexStat = fs.statSync(clientIndex);
    // Ungenerated stub is tiny; a real client is much larger.
    if (indexStat.size < 50000) return false;

    const files = fs.readdirSync(clientDir);
    return files.some((name) => name.includes("wasm") || name === "index.js");
  } catch {
    return false;
  }
}

function generateClient() {
  console.log("→ Prisma Client not found. Running prisma generate...");
  execSync("npx prisma generate", {
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
     npx prisma generate

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
  } catch (err) {
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
