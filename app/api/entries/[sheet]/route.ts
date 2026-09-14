import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  "oreta-hygiene": "ORETA_HYGIENE",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sheet: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        if (id) {
          const entry = await prisma.hygieneEntry.update({
            where: { id },
            data: {
              areaChecks: typeof body.areaChecks === "string" ? body.areaChecks : JSON.stringify(body.areaChecks),
              day: body.day,
              supervisorName: body.supervisorName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.hygieneEntry.create({
            data: {
              date,
              day: body.day,
              areaChecks: typeof body.areaChecks === "string" ? body.areaChecks : JSON.stringify(body.areaChecks),
              supervisorName: body.supervisorName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "glass": {
        if (id) {
          const entry = await prisma.glassEntry.update({
            where: { id },
            data: {
              locationChecks: typeof body.locationChecks === "string" ? body.locationChecks : JSON.stringify(body.locationChecks),
              supervisorName: body.supervisorName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.glassEntry.create({
            data: {
              date,
              locationChecks: typeof body.locationChecks === "string" ? body.locationChecks : JSON.stringify(body.locationChecks),
              supervisorName: body.supervisorName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "fridge": {
        if (id) {
          const entry = await prisma.fridgeEntry.update({
            where: { id },
            data: {
              supervisedBy: body.supervisedBy || "",
              fridgeChecks: typeof body.fridgeChecks === "string" ? body.fridgeChecks : JSON.stringify(body.fridgeChecks),
              hygiene: body.hygiene || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.fridgeEntry.create({
            data: {
              date,
              supervisedBy: body.supervisedBy || "",
              fridgeChecks: typeof body.fridgeChecks === "string" ? body.fridgeChecks : JSON.stringify(body.fridgeChecks),
              hygiene: body.hygiene || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "kitchen": {
        if (id) {
          const entry = await prisma.kitchenEntry.update({
            where: { id },
            data: {
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.kitchenEntry.create({
            data: {
              date,
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "production": {
        if (id) {
          const entry = await prisma.productionEntry.update({
            where: { id },
            data: {
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.productionEntry.create({
            data: {
              date,
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "puff-room": {
        if (id) {
          const entry = await prisma.puffRoomEntry.update({
            where: { id },
            data: {
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.puffRoomEntry.create({
            data: {
              date,
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "cake-room": {
        if (id) {
          const entry = await prisma.cakeRoomEntry.update({
            where: { id },
            data: {
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.cakeRoomEntry.create({
            data: {
              date,
              equipmentChecks: typeof body.equipmentChecks === "string" ? body.equipmentChecks : JSON.stringify(body.equipmentChecks),
              supervisorName: body.supervisorName || "",
              workerName: body.workerName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
      }
      case "oreta-hygiene": {
        if (id) {
          const entry = await prisma.oretaHygieneEntry.update({
            where: { id },
            data: {
              areaChecks: typeof body.areaChecks === "string" ? body.areaChecks : JSON.stringify(body.areaChecks),
              day: body.day,
              supervisorName: body.supervisorName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
            },
          });
          return NextResponse.json(entry);
        } else {
          const entry = await prisma.oretaHygieneEntry.create({
            data: {
              date,
              day: body.day,
              areaChecks: typeof body.areaChecks === "string" ? body.areaChecks : JSON.stringify(body.areaChecks),
              supervisorName: body.supervisorName || "",
              comments: body.comments || "",
              correctiveAction: body.correctiveAction || "",
              submittedById: user.id,
            },
          });
          return NextResponse.json(entry);
        }
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

  const { sheet } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

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
      case "oreta-hygiene":
        return NextResponse.json(await prisma.oretaHygieneEntry.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, include: { submittedBy: true } }));
      default:
        return NextResponse.json({ error: "Unknown sheet" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
