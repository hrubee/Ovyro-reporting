import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { hasSheetAccess, SheetId } from "@/lib/permissions";

const SHEET_MAP: Record<string, SheetId> = {
  hygiene: "HYGIENE_REPORT",
  glass: "GLASS_REPORT",
  fridge: "FRIDGE_REPORT",
  kitchen: "KITCHEN",
  production: "PRODUCTION",
  "puff-room": "PUFF_ROOM",
  "cake-room": "CAKE_ROOM",
  "oreta-shop-cleaning": "ORETA_SHOP_CLEANING",
  "oreta-hygiene": "ORETA_SHOP_CLEANING",
  "oreta-equipment": "ORETA_EQUIPMENT",
  "oreta-fridge": "ORETA_FRIDGE",
  "oreta-glass": "ORETA_GLASS",
  "oreta-monthly": "ORETA_MONTHLY",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sheet: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDbSchema();

  const { sheet } = await params;
  const user = session.user as { id: string; role: string };
  const sheetKey = SHEET_MAP[sheet];

  if (!sheetKey) return NextResponse.json({ error: "Unknown sheet" }, { status: 400 });

  const canAccess = await hasSheetAccess(user.id, sheetKey, user.role);
  if (!canAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { date, id } = body;

  try {
    switch (sheet) {
      case "hygiene": {
        const data = {
          areaChecks: typeof body.areaChecks === "string" ? body.areaChecks : JSON.stringify(body.areaChecks),
          day: body.day,
          supervisorName: body.supervisorName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.hygieneEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.hygieneEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "glass": {
        const data = {
          locationChecks: typeof body.locationChecks === "string" ? body.locationChecks : JSON.stringify(body.locationChecks),
          supervisorName: body.supervisorName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.glassEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.glassEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "fridge": {
        const data = {
          supervisedBy: body.supervisedBy || "",
          fridgeChecks: typeof body.fridgeChecks === "string" ? body.fridgeChecks : JSON.stringify(body.fridgeChecks),
          hygiene: body.hygiene || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.fridgeEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.fridgeEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "kitchen": {
        const data = {
          equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
          supervisorName: body.supervisorName || "",
          workerName: body.workerName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.kitchenEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.kitchenEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "production": {
        const data = {
          equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
          supervisorName: body.supervisorName || "",
          workerName: body.workerName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.productionEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.productionEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "puff-room": {
        const data = {
          equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
          supervisorName: body.supervisorName || "",
          workerName: body.workerName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.puffRoomEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.puffRoomEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "cake-room": {
        const data = {
          equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
          supervisorName: body.supervisorName || "",
          workerName: body.workerName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.cakeRoomEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.cakeRoomEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "oreta-shop-cleaning":
      case "oreta-hygiene": {
        const data = {
          areaChecks: typeof body.areaChecks === "string" ? body.areaChecks : JSON.stringify(body.areaChecks),
          day: body.day,
          supervisorName: body.supervisorName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.oretaHygieneEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.oretaHygieneEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "oreta-equipment": {
        const data = {
          equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
          supervisorName: body.supervisorName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.oretaEquipmentEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.oretaEquipmentEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "oreta-fridge": {
        const data = {
          supervisedBy: body.supervisedBy || "",
          fridgeChecks: typeof body.fridgeChecks === "string" ? body.fridgeChecks : JSON.stringify(body.fridgeChecks),
          hygiene: body.hygiene || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.oretaFridgeEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.oretaFridgeEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "oreta-glass": {
        const data = {
          locationChecks: typeof body.locationChecks === "string" ? body.locationChecks : JSON.stringify(body.locationChecks),
          supervisorName: body.supervisorName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.oretaGlassEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.oretaGlassEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      case "oreta-monthly": {
        const data = {
          month: body.month || date?.slice(0, 7) || new Date().toISOString().slice(0, 7),
          taskChecks: typeof body.taskChecks === "string" ? body.taskChecks : JSON.stringify(body.taskChecks),
          supervisorName: body.supervisorName || "",
          comments: body.comments || "",
          correctiveAction: body.correctiveAction || "",
        };
        if (id) {
          return NextResponse.json(await prisma.oretaMonthlyEntry.update({ where: { id }, data }));
        }
        return NextResponse.json(await prisma.oretaMonthlyEntry.create({ data: { ...data, date, submittedById: user.id } }));
      }
      default:
        return NextResponse.json({ error: "Unknown sheet" }, { status: 400 });
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sheet: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDbSchema();

  const { sheet } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month");

  try {
    const where = date ? { date } : {};
    switch (sheet) {
      case "hygiene":
        return NextResponse.json(await prisma.hygieneEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "glass":
        return NextResponse.json(await prisma.glassEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "fridge":
        return NextResponse.json(await prisma.fridgeEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "kitchen":
        return NextResponse.json(await prisma.kitchenEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "production":
        return NextResponse.json(await prisma.productionEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "puff-room":
        return NextResponse.json(await prisma.puffRoomEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "cake-room":
        return NextResponse.json(await prisma.cakeRoomEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "oreta-shop-cleaning":
      case "oreta-hygiene":
        return NextResponse.json(await prisma.oretaHygieneEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "oreta-equipment":
        return NextResponse.json(await prisma.oretaEquipmentEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "oreta-fridge":
        return NextResponse.json(await prisma.oretaFridgeEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "oreta-glass":
        return NextResponse.json(await prisma.oretaGlassEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      case "oreta-monthly":
        return NextResponse.json(await prisma.oretaMonthlyEntry.findMany({ where: month ? { month } : where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      default:
        return NextResponse.json({ error: "Unknown sheet" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
