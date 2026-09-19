import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function safeJson(val: any, fallback: any = {}) {
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

  const user = session.user as { organizationId: string; role: string };

  try {
    const templates = await prisma.formTemplate.findMany({
      where: { organizationId: user.organizationId, isArchived: false },
      orderBy: { createdAt: "desc" },
      include: {
        outletTemplates: {
          include: {
            outlet: {
              select: { id: true, name: true, code: true, icon: true },
            },
          },
        },
      },
    });

    const parsed = templates.map((t) => ({
      ...t,
      schema: safeJson(t.schema, {}),
    }));

    return NextResponse.json({ templates: parsed });
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
    const { title, slug, category, icon, description, frequency, schema, outletIds } = body;

    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required" }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "-");

    const template = await prisma.formTemplate.create({
      data: {
        organizationId: user.organizationId,
        title,
        slug: cleanSlug,
        category: category || "CUSTOM",
        icon: icon || "📋",
        description: description || "",
        frequency: frequency || "DAILY",
        schema: typeof schema === "string" ? schema : JSON.stringify(schema || { sections: [] }),
      },
    });

    // Assign to outlets if provided
    if (Array.isArray(outletIds) && outletIds.length > 0) {
      for (const outletId of outletIds) {
        await prisma.outletTemplate.create({
          data: {
            outletId,
            templateId: template.id,
            isEnabled: true,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      template: { ...template, schema: safeJson(template.schema) },
    });
  } catch (err: any) {
    console.error("Create template error:", err);
    return NextResponse.json({ error: err.message || "Failed to create template" }, { status: 500 });
  }
}
