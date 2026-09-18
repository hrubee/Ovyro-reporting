import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTodayString, formatDate, hasSheetAccess } from "@/lib/permissions";
import OretaGlassForm from "./OretaGlassForm";

export default async function OretaGlassPage() {
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

  const today = getTodayString();

  let todayEntries: any[] = [];
  let history: any[] = [];
  try {
    todayEntries = await prisma.oretaGlassEntry.findMany({
      where: { date: today },
      orderBy: { createdAt: "desc" },
      include: { submittedBy: { select: { name: true } } },
    });

    history = await prisma.oretaGlassEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { submittedBy: { select: { name: true } } },
    });
  } catch (err) {
    console.error("Error fetching oreta glass entries:", err);
  }

  return (
    <OretaGlassForm
      today={today}
      todayLabel={formatDate(today)}
      todayEntries={JSON.parse(JSON.stringify(todayEntries))}
      history={JSON.parse(JSON.stringify(history))}
      userName={user.name}
    />
  );
}
