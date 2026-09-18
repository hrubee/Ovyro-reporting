import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, hasSheetAccess } from "@/lib/permissions";
import OretaEquipmentForm from "./OretaEquipmentForm";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function OretaEquipmentPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await ensureDbSchema();

  const user = session.user as { id: string; name: string; email: string; role: string };
  const canAccess = await hasSheetAccess(user.id, "ORETA_EQUIPMENT", user.role);
  if (!canAccess) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ⛔ You do not have access to the Oreta World Equipment Cleaning sheet. Please contact an administrator.
        </div>
      </div>
    );
  }

  const resolvedParams = (await searchParams) || {};
  const targetDate = resolvedParams.date || getTodayString();

  let existingEntry = null;
  try {
    existingEntry = await prisma.oretaEquipmentEntry.findFirst({
      where: { date: targetDate },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true, email: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta equipment entry:", err);
  }

  const serializedEntry = existingEntry
    ? {
        id: existingEntry.id,
        date: existingEntry.date,
        supervisorName: existingEntry.supervisorName,
        comments: existingEntry.comments,
        correctiveAction: existingEntry.correctiveAction,
        equipmentChecks: existingEntry.equipmentChecks,
        submittedBy: existingEntry.submittedBy,
        createdAt: existingEntry.createdAt.toISOString(),
      }
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-text">
          <h1>⚙️ Oreta World — Equipment Cleaning Log</h1>
          <p>
            Outlet Sub-Account: <strong>Oreta World</strong> · Daily Cafe & Kitchen Equipment Sanitation Checklist
          </p>
        </div>
      </div>

      <OretaEquipmentForm
        initialDate={targetDate}
        existingEntry={serializedEntry}
        currentUser={{ id: user.id, name: user.name || "Staff", role: user.role }}
      />
    </div>
  );
}
