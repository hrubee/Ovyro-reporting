import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { userHasPermission } from "@/lib/permissions";

function safeJson(val: any, fallback: any = {}) {
  if (typeof val !== "string") return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as { organizationId: string; role: string; permissions?: string[] };
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

    return NextResponse.json({
      template: {
        ...template,
        schema: safeJson(template.schema, {}),
      },
    });
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

  const user = session.user as { organizationId: string; role: string; permissions?: string[] };
  const canManage =
    user.role === "ORG_ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    userHasPermission(user.permissions, "manage_templates", user.role);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: Manage templates permission required" }, { status: 403 });
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

    const schemaString =
      schema !== undefined
        ? typeof schema === "string"
          ? schema
          : JSON.stringify(schema)
        : existing.schema;

    const updated = await prisma.formTemplate.update({
      where: { id },
      data: {
        title: title || existing.title,
        icon: icon || existing.icon,
        description: description !== undefined ? description : existing.description,
        frequency: frequency || existing.frequency,
        category: category || existing.category,
        schema: schemaString,
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

    return NextResponse.json({
      success: true,
      template: {
        ...updated,
        schema: safeJson(updated.schema, {}),
      },
    });
  } catch (err: any) {
    console.error("Update template error:", err);
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

  const user = session.user as { organizationId: string; role: string; permissions?: string[] };
  const canManage =
    user.role === "ORG_ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.role === "ADMIN" ||
    userHasPermission(user.permissions, "manage_templates", user.role);

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: Manage templates permission required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.formTemplate.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { isArchived: true },
    });

    return NextResponse.json({ success: true, message: "Template archived" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
