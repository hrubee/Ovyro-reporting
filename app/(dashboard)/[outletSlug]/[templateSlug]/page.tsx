import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import DynamicFormRenderer from "@/components/DynamicFormRenderer";

function safeJson(val: any, fallback: any = {}) {
  if (typeof val !== "string") return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

interface PageProps {
  params: Promise<{
    outletSlug: string;
    templateSlug: string;
  }>;
}

export default async function DynamicSheetPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    id: string;
    name: string;
    email: string;
    role: string;
    organizationId: string;
  };

  const { outletSlug, templateSlug } = await params;

  // Don't intercept admin / dashboard / api routes
  if (["admin", "dashboard", "login", "api"].includes(outletSlug)) {
    notFound();
  }

  // Find outlet by id or code
  const outlet = await prisma.outlet.findFirst({
    where: {
      organizationId: user.organizationId,
      OR: [
        { id: outletSlug },
        { code: outletSlug.toUpperCase() },
        { id: `outlet-${outletSlug}` },
      ],
    },
  });

  if (!outlet) {
    // If not found by direct ID, look up first outlet
    const firstOutlet = await prisma.outlet.findFirst({
      where: { organizationId: user.organizationId },
    });
    if (!firstOutlet) notFound();
  }

  const activeOutlet = outlet || (await prisma.outlet.findFirst({ where: { organizationId: user.organizationId } }))!;

  // Find template by slug
  const template = await prisma.formTemplate.findFirst({
    where: {
      organizationId: user.organizationId,
      slug: templateSlug,
      isArchived: false,
    },
  });

  if (!template) {
    notFound();
  }

  // Get active staff for this organization/outlet
  const staff = await prisma.user.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    select: { name: true },
  });

  const availableStaff = staff.map((s) => s.name).filter(Boolean);

  const parsedShifts = safeJson(activeOutlet.shifts, ["Morning", "Evening"]);
  const parsedSchema = safeJson(template.schema, { sections: [] });

  return (
    <div className="dynamic-sheet-page">
      <DynamicFormRenderer
        outlet={{
          id: activeOutlet.id,
          name: activeOutlet.name,
          code: activeOutlet.code,
          icon: activeOutlet.icon,
          shifts: Array.isArray(parsedShifts) ? parsedShifts : ["Morning", "Evening"],
        }}
        template={{
          id: template.id,
          slug: template.slug,
          title: template.title,
          category: template.category,
          icon: template.icon,
          description: template.description,
          frequency: template.frequency,
          schema: parsedSchema,
        }}
        currentUser={{
          id: user.id,
          name: user.name || "User",
          email: user.email,
          role: user.role,
        }}
        availableStaff={availableStaff.length > 0 ? availableStaff : undefined}
      />
    </div>
  );
}

