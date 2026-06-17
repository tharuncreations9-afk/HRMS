const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const total = await p.employee.count();
  const all = await p.employee.findMany({ take: 5, select: { id: true, status: true } });
  console.log("total", total, "sample", all);
}

main()
  .catch((e) => console.error("ERR", e.message))
  .finally(() => p.$disconnect());
