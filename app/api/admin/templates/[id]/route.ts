import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string };
  const { id } = await params;

  try {
    const template = await prisma.formTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        outletTemplates: {
          select: { outletId: true, isEnabled: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const existing = await prisma.formTemplate.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const { title, icon, description, frequency, category, schema, outletIds } = body;

    const updated = await prisma.formTemplate.update({
      where: { id },
      data: {
        title: title || existing.title,
        icon: icon || existing.icon,
        description: description !== undefined ? description : existing.description,
        frequency: frequency || existing.frequency,
        category: category || existing.category,
        schema: schema !== undefined ? schema : existing.schema,
        version: { increment: 1 },
      },
    });

    // Update outlet assignments if provided
    if (Array.isArray(outletIds)) {
      await prisma.outletTemplate.deleteMany({ where: { templateId: id } });
      for (const oId of outletIds) {
        await prisma.outletTemplate.create({
          data: {
            outletId: oId,
            templateId: id,
            isEnabled: true,
          },
        });
      }
    }

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Soft delete / archive to protect audit history
    await prisma.formTemplate.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true, message: "Template archived" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
