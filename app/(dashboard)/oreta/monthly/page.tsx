import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, hasSheetAccess } from "@/lib/permissions";
import OretaMonthlyForm from "./OretaMonthlyForm";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function OretaMonthlyPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await ensureDbSchema();

  const user = session.user as { id: string; name: string; email: string; role: string };
  const canAccess = await hasSheetAccess(user.id, "ORETA_MONTHLY", user.role);
  if (!canAccess) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ⛔ You do not have access to the Oreta World Monthly Maintenance sheet. Please contact an administrator.
        </div>
      </div>
    );
  }

  const resolvedParams = (await searchParams) || {};
  const currentMonth = resolvedParams.month || getTodayString().slice(0, 7); // "YYYY-MM"

  let existingEntry = null;
  let historyEntries: any[] = [];
  try {
    existingEntry = await prisma.oretaMonthlyEntry.findFirst({
      where: { month: currentMonth },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true, email: true } } },
    });

    historyEntries = await prisma.oretaMonthlyEntry.findMany({
      orderBy: { month: "desc" },
      take: 12,
      include: { submittedBy: { select: { name: true, email: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta monthly entries:", err);
  }

  const serializedEntry = existingEntry
    ? {
        id: existingEntry.id,
        month: existingEntry.month,
        supervisorName: existingEntry.supervisorName,
        comments: existingEntry.comments,
        correctiveAction: existingEntry.correctiveAction,
        monthlyChecks: existingEntry.monthlyChecks,
        submittedBy: existingEntry.submittedBy,
        createdAt: existingEntry.createdAt.toISOString(),
      }
    : null;

  const serializedHistory = historyEntries.map((h) => ({
    id: h.id,
    month: h.month,
    supervisorName: h.supervisorName,
    comments: h.comments,
    correctiveAction: h.correctiveAction,
    monthlyChecks: h.monthlyChecks,
    submittedBy: h.submittedBy,
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🗓️ Oreta World — Monthly Maintenance & Deep Clean</h1>
          <p>Shutters, Generator, AC Servicing & Commercial Refrigeration Deep Maintenance</p>
        </div>
      </div>

      <OretaMonthlyForm
        initialMonth={currentMonth}
        existingEntry={serializedEntry}
        history={serializedHistory}
        currentUser={{ id: user.id, name: user.name, role: user.role }}
      />
    </div>
  );
}
