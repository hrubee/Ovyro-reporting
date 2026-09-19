import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import TemplateManagerClient from "./TemplateManagerClient";

function safeJson(val: any, fallback: any = {}) {
  if (typeof val !== "string") return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export default async function AdminTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [rawTemplates, rawOutlets] = await Promise.all([
    prisma.formTemplate.findMany({
      where: { organizationId: user.organizationId, isArchived: false },
      orderBy: { createdAt: "desc" },
      include: {
        outletTemplates: {
          select: { outletId: true, isEnabled: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
    }),
    prisma.outlet.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, icon: true, shifts: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const templates = rawTemplates.map((t) => ({
    ...t,
    schema: safeJson(t.schema, { sections: [] }),
  }));

  const outlets = rawOutlets.map((o) => ({
    ...o,
    shifts: safeJson(o.shifts, ["Morning", "Evening"]),
  }));

  return (
    <TemplateManagerClient
      initialTemplates={JSON.parse(JSON.stringify(templates))}
      outlets={JSON.parse(JSON.stringify(outlets))}
    />
  );
}

