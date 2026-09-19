import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { resolveOrganizationId } from "@/lib/permissions";

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
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { organizationId: string; role: string; email?: string };
  const organizationId = await resolveOrganizationId(user);

  try {
    const roles = await prisma.customRole.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { users: true } },
      },
    });

    const parsed = roles.map((r) => ({
      ...r,
      permissions: safeJson(r.permissions, []),
    }));

    return NextResponse.json({ roles: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { organizationId: string; role: string; email?: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const organizationId = await resolveOrganizationId(user);

  try {
    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const permsString =
      typeof permissions === "string"
        ? permissions
        : JSON.stringify(Array.isArray(permissions) ? permissions : ["submit_checklists"]);

    const role = await prisma.customRole.create({
      data: {
        organizationId,
        name,
        description: description || "",
        permissions: permsString,
      },
    });


    return NextResponse.json({
      success: true,
      role: { ...role, permissions: safeJson(role.permissions) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create role" }, { status: 500 });
  }
}
