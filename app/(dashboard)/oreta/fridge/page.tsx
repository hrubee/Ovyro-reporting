import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, hasSheetAccess } from "@/lib/permissions";
import OretaFridgeForm from "./OretaFridgeForm";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OretaFridgePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await ensureDbSchema();

  const user = session.user as { id: string; name: string; email: string; role: string };
  const canAccess = await hasSheetAccess(user.id, "ORETA_FRIDGE", user.role);
  if (!canAccess) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ⛔ You do not have access to the Oreta World Fridge & Display Temperature sheet. Please contact an administrator.
        </div>
      </div>
    );
  }

  const resolvedParams = (await searchParams) || {};
  const targetDate = resolvedParams.date || getTodayString();

  let existingEntry = null;
  let historyEntries: any[] = [];
  try {
    existingEntry = await prisma.oretaFridgeEntry.findFirst({
      where: { date: targetDate },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true, email: true } } },
    });

    historyEntries = await prisma.oretaFridgeEntry.findMany({
      orderBy: { date: "desc" },
      take: 15,
      include: { submittedBy: { select: { name: true, email: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta fridge entries:", err);
  }

  const serializedEntry = existingEntry
    ? {
        id: existingEntry.id,
        date: existingEntry.date,
        supervisorName: existingEntry.supervisorName,
        hygiene: existingEntry.hygiene,
        comments: existingEntry.comments,
        correctiveAction: existingEntry.correctiveAction,
        fridgeChecks: existingEntry.fridgeChecks,
        submittedBy: existingEntry.submittedBy,
        createdAt: existingEntry.createdAt.toISOString(),
      }
    : null;

  const serializedHistory = historyEntries.map((h) => ({
    id: h.id,
    date: h.date,
    supervisorName: h.supervisorName,
    hygiene: h.hygiene,
    comments: h.comments,
    correctiveAction: h.correctiveAction,
    fridgeChecks: h.fridgeChecks,
    submittedBy: h.submittedBy,
    createdAt: h.createdAt.toISOString(),
  }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🧊 Oreta World — Fridge & Display Temperature Log</h1>
          <p>Daily Refrigeration, Freezer & Cake Display Monitoring (+2 to +10°C) with AM/PM Records</p>
        </div>
      </div>

      <OretaFridgeForm
        initialDate={targetDate}
        existingEntry={serializedEntry}
        history={serializedHistory}
        currentUser={{ id: user.id, name: user.name, role: user.role }}
      />
    </div>
  );
}
