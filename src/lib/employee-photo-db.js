/**
 * Load profile_photo via raw SQL so legacy VARCHAR paths do not crash Prisma Bytes mapping.
 */

export function normalizeDbProfilePhoto(raw) {
  if (raw == null) return null;
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/")
    ) {
      return null;
    }
    return Buffer.from(trimmed, "binary");
  }
  return null;
}

export async function loadEmployeeProfilePhoto(prismaClient, employeeId) {
  if (!employeeId) return null;
  const rows = await prismaClient.$queryRaw`
    SELECT profile_photo FROM employees WHERE id = ${employeeId}
  `;
  return normalizeDbProfilePhoto(rows[0]?.profile_photo);
}

export async function loadEmployeeProfilePhotos(prismaClient, employeeIds) {
  const map = new Map();
  if (!employeeIds?.length) return map;

  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];
  if (!uniqueIds.length) return map;

  const { Prisma } = await import("@/generated/prisma");
  const rows = await prismaClient.$queryRaw`
    SELECT id, profile_photo FROM employees WHERE id IN (${Prisma.join(uniqueIds)})
  `;

  for (const row of rows) {
    map.set(Number(row.id), normalizeDbProfilePhoto(row.profile_photo));
  }
  return map;
}

function shouldOmitProfilePhoto(args) {
  return !args.select;
}

function withPhotoOmit(args) {
  if (!shouldOmitProfilePhoto(args)) return args;
  return {
    ...args,
    omit: { ...(args.omit || {}), profilePhoto: true },
  };
}

/** Prisma client extension — safe reads/writes for profile_photo LONGBLOB + legacy paths. */
export function employeeProfilePhotoExtension(baseClient) {
  return {
    query: {
      employee: {
        async findUnique({ args, query }) {
          const result = await query(withPhotoOmit(args));
          if (!result?.id || args.select) return result;
          const profilePhoto = await loadEmployeeProfilePhoto(baseClient, result.id);
          return { ...result, profilePhoto };
        },
        async findFirst({ args, query }) {
          const result = await query(withPhotoOmit(args));
          if (!result?.id || args.select) return result;
          const profilePhoto = await loadEmployeeProfilePhoto(baseClient, result.id);
          return { ...result, profilePhoto };
        },
        async findMany({ args, query }) {
          const result = await query(withPhotoOmit(args));
          if (!result?.length || args.select) return result;
          const photoMap = await loadEmployeeProfilePhotos(
            baseClient,
            result.map((row) => row.id)
          );
          return result.map((row) => ({
            ...row,
            profilePhoto: photoMap.get(row.id) ?? null,
          }));
        },
        async create({ args, query }) {
          const result = await query(withPhotoOmit(args));
          if (!result?.id || args.select) return result;
          const profilePhoto = await loadEmployeeProfilePhoto(baseClient, result.id);
          return { ...result, profilePhoto };
        },
        async update({ args, query }) {
          const result = await query(withPhotoOmit(args));
          if (!result?.id || args.select) return result;
          const profilePhoto = await loadEmployeeProfilePhoto(baseClient, result.id);
          return { ...result, profilePhoto };
        },
      },
    },
  };
}
