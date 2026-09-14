import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, getDayName, hasSheetAccess } from "@/lib/permissions";
import OretaHygieneForm from "./OretaHygieneForm";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OretaHygienePage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await ensureDbSchema();

  const user = session.user as { id: string; name: string; email: string; role: string };
  const canAccess = await hasSheetAccess(user.id, "ORETA_HYGIENE", user.role);
  if (!canAccess) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ⛔ You do not have access to the Oreta World Hygiene SOP sheet. Please contact an administrator.
        </div>
      </div>
    );
  }

  const resolvedParams = (await searchParams) || {};
  const targetDate = resolvedParams.date || getTodayString();
  const day = getDayName(targetDate);

  let existingEntry = null;
  try {
    existingEntry = await prisma.oretaHygieneEntry.findFirst({
      where: { date: targetDate },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true, email: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta entry:", err);
  }

  const serializedEntry = existingEntry
    ? {
        id: existingEntry.id,
        date: existingEntry.date,
        day: existingEntry.day,
        supervisorName: existingEntry.supervisorName,
        comments: existingEntry.comments,
        correctiveAction: existingEntry.correctiveAction,
        areaChecks: existingEntry.areaChecks,
        submittedBy: existingEntry.submittedBy,
        createdAt: existingEntry.createdAt.toISOString(),
      }
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>✨ Oreta World — Hygiene & Cleaning SOP</h1>
          <p>
            Outlet Sub-Account: <strong>Oreta World</strong> · Daily 4-Shift Floor & Equipment Sanitation Log
          </p>
        </div>
      </div>

      <OretaHygieneForm
        initialDate={targetDate}
        initialDay={day}
        existingEntry={serializedEntry}
        currentUser={{ id: user.id, name: user.name, role: user.role }}
      />
    </div>
  );
}
