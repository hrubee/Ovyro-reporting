import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, hasSheetAccess } from "@/lib/permissions";
import OretaGlassForm from "./OretaGlassForm";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OretaGlassPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await ensureDbSchema();

  const user = session.user as { id: string; name: string; email: string; role: string };
  const canAccess = await hasSheetAccess(user.id, "ORETA_GLASS", user.role);
  if (!canAccess) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ⛔ You do not have access to the Oreta World Glass Cleaning sheet. Please contact an administrator.
        </div>
      </div>
    );
  }

  const resolvedParams = (await searchParams) || {};
  const targetDate = resolvedParams.date || getTodayString();

  let existingEntry = null;
  let historyEntries: any[] = [];
  try {
    existingEntry = await prisma.oretaGlassEntry.findFirst({
      where: { date: targetDate },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true, email: true } } },
    });

    historyEntries = await prisma.oretaGlassEntry.findMany({
      orderBy: { date: "desc" },
      take: 15,
      include: { submittedBy: { select: { name: true, email: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta glass entries:", err);
  }

  const serializedEntry = existingEntry
    ? {
        id: existingEntry.id,
        date: existingEntry.date,
        supervisorName: existingEntry.supervisorName,
        comments: existingEntry.comments,
        correctiveAction: existingEntry.correctiveAction,
        glassChecks: existingEntry.glassChecks,
        submittedBy: existingEntry.submittedBy,
        createdAt: existingEntry.createdAt.toISOString(),
      }
    : null;

  const serializedHistory = historyEntries.map((h) => ({
    id: h.id,
    date: h.date,
    supervisorName: h.supervisorName,
    comments: h.comments,
    correctiveAction: h.correctiveAction,
    glassChecks: h.glassChecks,
    submittedBy: h.submittedBy,
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🪟 Oreta World — Glass Report</h1>
          <p>Ground Floor & Mezzanine Floor Architectural Glass Cleaning & Inspection</p>
        </div>
      </div>

      <OretaGlassForm
        initialDate={targetDate}
        existingEntry={serializedEntry}
        history={serializedHistory}
        currentUser={{ id: user.id, name: user.name, role: user.role }}
      />
    </div>
  );
}
