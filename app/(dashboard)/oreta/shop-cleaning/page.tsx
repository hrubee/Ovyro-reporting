import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, getDayName, formatDate, hasSheetAccess } from "@/lib/permissions";
import OretaShopCleaningForm from "./OretaShopCleaningForm";

export default async function OretaShopCleaningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await ensureDbSchema();

  const user = session.user as { id: string; name: string; email: string; role: string };
  const canAccess = await hasSheetAccess(user.id, "ORETA_SHOP_CLEANING", user.role);
  if (!canAccess) {
    return (
      <div className="page-container">
        <div className="error-banner">
          ⛔ You do not have access to the Oreta World House Keeping SOP sheet. Please contact an administrator.
        </div>
      </div>
    );
  }

  const today = getTodayString();
  const dayName = getDayName(today);

  let todayEntries: any[] = [];
  let history: any[] = [];
  try {
    todayEntries = await prisma.oretaHygieneEntry.findMany({
      where: { date: today },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true } } },
    });

    history = await prisma.oretaHygieneEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { submittedBy: { select: { name: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta shop cleaning entries:", err);
  }

  return (
    <OretaShopCleaningForm
      today={today}
      todayLabel={formatDate(today)}
      dayName={dayName}
      todayEntries={JSON.parse(JSON.stringify(todayEntries))}
      history={JSON.parse(JSON.stringify(history))}
      userName={user.name}
    />
  );
}
