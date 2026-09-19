import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function safeJson(val: any, fallback: any = []) {
  if (typeof val !== "string") return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string };

  try {
    const outlets = await prisma.outlet.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        outletTemplates: {
          include: {
            template: {
              select: { id: true, title: true, icon: true, category: true, slug: true },
            },
          },
        },
        _count: {
          select: { submissions: true, userOutlets: true },
        },
      },
    });

    const parsed = outlets.map((o) => ({
      ...o,
      shifts: safeJson(o.shifts, ["Morning", "Evening"]),
    }));

    return NextResponse.json({ outlets: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, code, type, address, icon, shifts, templateIds } = body;

    if (!name) {
      return NextResponse.json({ error: "Outlet name is required" }, { status: 400 });
    }

    const shiftsString =
      typeof shifts === "string"
        ? shifts
        : JSON.stringify(Array.isArray(shifts) ? shifts : ["Morning", "Evening"]);

    const outlet = await prisma.outlet.create({
      data: {
        organizationId: user.organizationId,
        name,
        code: code || null,
        type: type || "RESTAURANT",
        address: address || "",
        icon: icon || "📍",
        shifts: shiftsString,
      },
    });

    // Assign templates
    if (Array.isArray(templateIds) && templateIds.length > 0) {
      for (const [idx, templateId] of templateIds.entries()) {
        await prisma.outletTemplate.create({
          data: {
            outletId: outlet.id,
            templateId,
            order: idx,
            isEnabled: true,
          },
        });
      }
    }

    // Link creating user to the new outlet
    const creatorId = (session.user as any).id;
    if (creatorId) {
      await prisma.userOutlet.upsert({
        where: { userId_outletId: { userId: creatorId, outletId: outlet.id } },
        update: {},
        create: {
          userId: creatorId,
          outletId: outlet.id,
          role: user.role,
        },
      });
    }

    const fullOutlet = await prisma.outlet.findUnique({
      where: { id: outlet.id },
      include: {
        outletTemplates: {
          include: {
            template: {
              select: { id: true, title: true, icon: true, category: true, slug: true },
            },
          },
        },
        _count: {
          select: { submissions: true, userOutlets: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      outlet: { ...fullOutlet, shifts: safeJson(fullOutlet?.shifts) },
    });
  } catch (err: any) {
    console.error("Create outlet error:", err);
    return NextResponse.json({ error: err.message || "Failed to create outlet" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, code, type, address, icon, shifts, isActive, templateIds } = body;

    if (!id) {
      return NextResponse.json({ error: "Outlet id is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code || null;
    if (type !== undefined) updateData.type = type;
    if (address !== undefined) updateData.address = address;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (shifts !== undefined) {
      updateData.shifts = typeof shifts === "string" ? shifts : JSON.stringify(shifts);
    }

    const updated = await prisma.outlet.update({
      where: { id },
      data: updateData,
    });

    if (Array.isArray(templateIds)) {
      await prisma.outletTemplate.deleteMany({ where: { outletId: id } });
      for (const [idx, tId] of templateIds.entries()) {
        await prisma.outletTemplate.create({
          data: {
            outletId: id,
            templateId: tId,
            order: idx,
            isEnabled: true,
          },
        });
      }
    }

    const fullOutlet = await prisma.outlet.findUnique({
      where: { id: updated.id },
      include: {
        outletTemplates: {
          include: {
            template: {
              select: { id: true, title: true, icon: true, category: true, slug: true },
            },
          },
        },
        _count: {
          select: { submissions: true, userOutlets: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      outlet: { ...fullOutlet, shifts: safeJson(fullOutlet?.shifts) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update outlet" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Outlet id is required" }, { status: 400 });
    }

    // Check count of remaining active outlets
    const count = await prisma.outlet.count({
      where: { organizationId: user.organizationId, isActive: true },
    });

    if (count <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only facility. Your organization must have at least one active facility." },
        { status: 400 }
      );
    }

    // Delete mappings & outlet
    await prisma.outletTemplate.deleteMany({ where: { outletId: id } });
    await prisma.userOutlet.deleteMany({ where: { outletId: id } });
    await prisma.formSubmission.deleteMany({ where: { outletId: id } });
    await prisma.outlet.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Facility deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete facility" }, { status: 500 });
  }
}

