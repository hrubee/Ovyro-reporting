import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { resolveOrganizationId } from "@/lib/permissions";
import ReportsClient from "./ReportsClient";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { organizationId: string; role: string; email?: string };
  if (user.role !== "ORG_ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const organizationId = await resolveOrganizationId(user);

  const [submissions, outlets, templates] = await Promise.all([
    prisma.formSubmission.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        submittedBy: {
          select: { name: true, email: true },
        },
        template: {
          select: { id: true, slug: true, title: true, icon: true, category: true },
        },
        outlet: {
          select: { id: true, name: true, code: true, icon: true },
        },
      },
    }),
    prisma.outlet.findMany({
      where: { organizationId },
      select: { id: true, name: true, icon: true },
    }),
    prisma.formTemplate.findMany({
      where: { organizationId },
      select: { id: true, title: true, icon: true, category: true, slug: true },
    }),
  ]);


  return (
    <ReportsClient
      submissions={JSON.parse(JSON.stringify(submissions))}
      outlets={JSON.parse(JSON.stringify(outlets))}
      templates={JSON.parse(JSON.stringify(templates))}
    />
  );
}
