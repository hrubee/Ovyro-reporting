import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, hasSheetAccess } from "@/lib/permissions";
import OretaMonthlyForm from "./OretaMonthlyForm";

export default async function OretaMonthlyPage() {
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

  const currentMonth = getTodayString().slice(0, 7); // "YYYY-MM"

  let todayEntries: any[] = [];
  let history: any[] = [];
  try {
    todayEntries = await prisma.oretaMonthlyEntry.findMany({
      where: { month: currentMonth },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true } } },
    });

    history = await prisma.oretaMonthlyEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      include: { submittedBy: { select: { name: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta monthly entries:", err);
  }

  return (
    <OretaMonthlyForm
      currentMonth={currentMonth}
      todayEntries={JSON.parse(JSON.stringify(todayEntries))}
      history={JSON.parse(JSON.stringify(history))}
      userName={user.name}
    />
  );
}
