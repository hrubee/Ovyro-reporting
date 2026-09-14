import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // 1. Automatically create PostgreSQL tables if they don't exist yet
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "passwordHash" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SheetAccess" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "sheet" TEXT NOT NULL,
        "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SheetAccess_userId_sheet_key" UNIQUE ("userId", "sheet")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HygieneEntry" (
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
      CREATE TABLE IF NOT EXISTS "GlassEntry" (
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
      CREATE TABLE IF NOT EXISTS "FridgeEntry" (
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
      CREATE TABLE IF NOT EXISTS "KitchenEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "equipmentChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "workerName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProductionEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "equipmentChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "workerName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PuffRoomEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "equipmentChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "workerName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "CakeRoomEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TEXT NOT NULL,
        "submittedById" TEXT NOT NULL REFERENCES "User"("id"),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "equipmentChecks" TEXT NOT NULL,
        "supervisorName" TEXT NOT NULL DEFAULT '',
        "workerName" TEXT NOT NULL DEFAULT '',
        "comments" TEXT NOT NULL DEFAULT '',
        "correctiveAction" TEXT NOT NULL DEFAULT ''
      );
    `);

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

    // 2. Always ensure admin and staff exist
    const defaultPassword = await bcrypt.hash("Pnr@123", 12);
    const adminPassword = await bcrypt.hash("Admin@123", 12);

    await prisma.user.upsert({
      where: { email: "admin@pnr.com" },
      update: { passwordHash: adminPassword, isActive: true },
      create: { name: "Admin", email: "admin@pnr.com", passwordHash: adminPassword, role: "ADMIN" },
    });

    await prisma.user.upsert({
      where: { email: "aboli@pnr.com" },
      update: { passwordHash: defaultPassword, isActive: true },
      create: { name: "Aboli Wagh", email: "aboli@pnr.com", passwordHash: defaultPassword, role: "ADMIN" },
    });

    await prisma.user.upsert({
      where: { email: "sandeep@pnr.com" },
      update: { passwordHash: defaultPassword, isActive: true },
      create: { name: "Sandeep Gargate", email: "sandeep@pnr.com", passwordHash: defaultPassword, role: "ADMIN" },
    });

    const staffList = [
      { name: "Shridhar Jadhav", email: "shridhar@pnr.com", sheets: ["HYGIENE_REPORT"] },
      { name: "Pravin Jadhav", email: "pravin@pnr.com", sheets: ["HYGIENE_REPORT", "PRODUCTION", "KITCHEN"] },
      { name: "Mavshi", email: "mavshi@pnr.com", sheets: ["HYGIENE_REPORT", "PRODUCTION", "KITCHEN"] },
      { name: "Sanjay Jadhav", email: "sanjay@pnr.com", sheets: ["GLASS_REPORT"] },
      { name: "Suresh", email: "suresh@pnr.com", sheets: ["GLASS_REPORT", "KITCHEN"] },
      { name: "Sagar Yadav", email: "sagar@pnr.com", sheets: ["PRODUCTION", "KITCHEN"] },
      { name: "Dilip", email: "dilip@pnr.com", sheets: ["PUFF_ROOM"] },
      { name: "Meraj Khan", email: "meraj@pnr.com", sheets: ["CAKE_ROOM"] },
      { name: "Jaseen Siddique", email: "jaseen@pnr.com", sheets: ["CAKE_ROOM"] },
      { name: "Nadeem Faruqi", email: "nadeem@pnr.com", sheets: ["CAKE_ROOM"] },
      { name: "Rameshwar", email: "rameshwar@pnr.com", sheets: ["ORETA_HYGIENE"] },
      { name: "Bharti", email: "bharti@pnr.com", sheets: ["ORETA_HYGIENE"] },
      { name: "Mangla", email: "mangla@pnr.com", sheets: ["ORETA_HYGIENE"] },
      { name: "Arzaaan", email: "arzaaan@pnr.com", sheets: ["ORETA_HYGIENE"] },
    ];

    for (const s of staffList) {
      const u = await prisma.user.upsert({
        where: { email: s.email },
        update: { name: s.name, passwordHash: defaultPassword, isActive: true },
        create: { name: s.name, email: s.email, passwordHash: defaultPassword, role: "EMPLOYEE" },
      });
      for (const sheet of s.sheets) {
        await prisma.sheetAccess.upsert({
          where: { userId_sheet: { userId: u.id, sheet } },
          update: {},
          create: { userId: u.id, sheet },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "✅ Database tables created and seeded successfully! You can now log in.",
      users: ["admin@pnr.com", "aboli@pnr.com", "sandeep@pnr.com", ...staffList.map((s) => s.email)],
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to seed database",
    }, { status: 500 });
  }
}
