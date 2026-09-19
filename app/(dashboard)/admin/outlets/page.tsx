import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import OutletManagerClient from "./OutletManagerClient";

export default async function AdminOutletsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { organizationId: string; role: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [outlets, templates] = await Promise.all([
    prisma.outlet.findMany({
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
    }),
    prisma.formTemplate.findMany({
      where: { organizationId: user.organizationId, isArchived: false },
      select: { id: true, title: true, icon: true, category: true },
    }),
  ]);

  return (
    <OutletManagerClient
      initialOutlets={JSON.parse(JSON.stringify(outlets))}
      allTemplates={JSON.parse(JSON.stringify(templates))}
    />
  );
}
