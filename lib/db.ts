import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: any;
  schemaInitialized: boolean;
};

function getSanitizedDbUrl(): string {
  const candidates = [
    process.env.database_DATABASE_URL,
    process.env.database_POSTGRES_URL,
    process.env.database_PRISMA_DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ];

  for (const c of candidates) {
    if (
      c &&
      (c.startsWith("postgres://") ||
        c.startsWith("postgresql://") ||
        c.startsWith("prisma+postgres://") ||
        c.startsWith("prisma://"))
    ) {
      return c.trim().replace(/^["']|["']$/g, "");
    }
  }

  return (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
}

let rawUrl = getSanitizedDbUrl();

// Ensure protocol is postgresql:// for Prisma engine
if (rawUrl.startsWith("prisma+postgres://")) {
  rawUrl = rawUrl.replace("prisma+postgres://", "postgresql://");
} else if (rawUrl.startsWith("prisma://")) {
  rawUrl = rawUrl.replace("prisma://", "postgresql://");
}

if (rawUrl) {
  process.env.DATABASE_URL = rawUrl;
}

function createPrismaClient() {
  return new PrismaClient({
    ...(rawUrl ? { datasourceUrl: rawUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Auto-create any missing tables silently without throwing
export async function ensureDbSchema() {
  if (globalForPrisma.schemaInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OretaHygieneEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "day" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "areaChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OretaEquipmentEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "equipmentChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OretaFridgeEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "supervisedBy" TEXT NOT NULL DEFAULT '',
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "fridgeChecks" TEXT NOT NULL,
        "hygiene" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OretaGlassEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "locationChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "OretaMonthlyEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "month" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "taskChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    globalForPrisma.schemaInitialized = true;
  } catch (err) {
    console.error("Auto schema init check error:", err);
  }
}
