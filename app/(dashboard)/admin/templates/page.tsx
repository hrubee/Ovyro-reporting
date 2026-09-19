import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import TemplateManagerClient from "./TemplateManagerClient";

export default async function AdminTemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [templates, outlets] = await Promise.all([
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
      select: { id: true, name: true, icon: true },
    }),
  ]);

  return (
    <TemplateManagerClient
      initialTemplates={JSON.parse(JSON.stringify(templates))}
      outlets={JSON.parse(JSON.stringify(outlets))}
    />
  );
}
