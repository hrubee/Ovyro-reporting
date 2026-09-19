import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

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

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      customRoleId: true,
      customRole: {
        select: { id: true, name: true, permissions: true },
      },
      permissions: true,
      isActive: true,
      createdAt: true,
      userOutlets: {
        select: {
          outletId: true,
          role: true,
          outlet: { select: { id: true, name: true, icon: true } },
        },
      },
      templateAccess: {
        select: {
          templateId: true,
          canSubmit: true,
          canVerify: true,
          template: { select: { id: true, title: true, icon: true } },
        },
      },
    },
  });

  const parsed = users.map((u) => ({
    ...u,
    permissions: safeJson(u.permissions, []),
  }));

  return NextResponse.json(parsed);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { name, email, password, role, customRoleId, permissions, outletIds, templateAccess } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const permsString =
    typeof permissions === "string"
      ? permissions
      : JSON.stringify(Array.isArray(permissions) ? permissions : ["submit_checklists"]);

  const createdUser = await prisma.user.create({
    data: {
      organizationId: user.organizationId,
      name,
      email: cleanEmail,
      passwordHash,
      role: role || "OPERATOR",
      customRoleId: customRoleId || null,
      permissions: permsString,
    },
  });

  // Assign user to outlets
  if (Array.isArray(outletIds) && outletIds.length > 0) {
    for (const outletId of outletIds) {
      await prisma.userOutlet.create({
        data: {
          userId: createdUser.id,
          outletId,
          role: role || "OPERATOR",
        },
      });
    }
  }

  // Assign specific template access if provided
  if (Array.isArray(templateAccess) && templateAccess.length > 0) {
    for (const item of templateAccess) {
      await prisma.userTemplateAccess.create({
        data: {
          userId: createdUser.id,
          templateId: item.templateId,
          canSubmit: item.canSubmit !== false,
          canVerify: !!item.canVerify,
        },
      });
    }
  }

  return NextResponse.json({ success: true, user: createdUser }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, name, role, customRoleId, permissions, isActive, password, outletIds, templateAccess } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (customRoleId !== undefined) updateData.customRoleId = customRoleId || null;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);
  if (permissions !== undefined) {
    updateData.permissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  // Update outlet links if provided
  if (Array.isArray(outletIds)) {
    await prisma.userOutlet.deleteMany({ where: { userId: id } });
    for (const outletId of outletIds) {
      await prisma.userOutlet.create({
        data: {
          userId: id,
          outletId,
          role: role || updatedUser.role,
        },
      });
    }
  }

  // Update template access links if provided
  if (Array.isArray(templateAccess)) {
    await prisma.userTemplateAccess.deleteMany({ where: { userId: id } });
    for (const item of templateAccess) {
      await prisma.userTemplateAccess.create({
        data: {
          userId: id,
          templateId: typeof item === "string" ? item : item.templateId,
          canSubmit: item.canSubmit !== false,
          canVerify: !!item.canVerify,
        },
      });
    }
  }

  return NextResponse.json({ success: true, user: updatedUser });
}
