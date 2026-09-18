import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, formatDate, hasSheetAccess } from "@/lib/permissions";
import OretaEquipmentForm from "./OretaEquipmentForm";

export default async function OretaEquipmentPage() {
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

  const today = getTodayString();

  let todayEntries: any[] = [];
  let history: any[] = [];
  try {
    todayEntries = await prisma.oretaEquipmentEntry.findMany({
      where: { date: today },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true } } },
    });

    history = await prisma.oretaEquipmentEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { submittedBy: { select: { name: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta equipment entries:", err);
  }

  return (
    <OretaEquipmentForm
      today={today}
      todayLabel={formatDate(today)}
      todayEntries={JSON.parse(JSON.stringify(todayEntries))}
      history={JSON.parse(JSON.stringify(history))}
      userName={user.name}
    />
  );
}
