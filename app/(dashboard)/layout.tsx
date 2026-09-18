import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { OutletProvider } from "@/components/OutletContext";
import { SHEET_ROUTES, getTodayString } from "@/lib/permissions";

async function getSheetStatuses(userId: string, role: string, today: string) {
  await ensureDbSchema();
  const statuses: Record<string, boolean | null> = {};
  const sheetKeys = Object.keys(SHEET_ROUTES) as Array<keyof typeof SHEET_ROUTES>;

  // Get user's sheet access
  let access: Array<keyof typeof SHEET_ROUTES> = sheetKeys;
  if (role !== "ADMIN") {
    try {
      const userAccess = await prisma.sheetAccess.findMany({ where: { userId }, select: { sheet: true } });
      access = userAccess.map((a: { sheet: string }) => a.sheet as keyof typeof SHEET_ROUTES);
    } catch {
      access = [];
    }
  }

  const accessSet = new Set(access);

  for (const sheetKey of sheetKeys) {
    const route = SHEET_ROUTES[sheetKey];
    if (!accessSet.has(sheetKey) && role !== "ADMIN") {
      statuses[route] = null; // no access
      continue;
    }

    // Check if submitted today with safe try/catch
    let submitted = false;
    try {
      switch (sheetKey) {
        case "HYGIENE_REPORT":
          submitted = !!(await prisma.hygieneEntry.findFirst({ where: { date: today } }));
          break;
        case "GLASS_REPORT":
          submitted = !!(await prisma.glassEntry.findFirst({ where: { date: today } }));
          break;
        case "FRIDGE_REPORT":
          submitted = !!(await prisma.fridgeEntry.findFirst({ where: { date: today } }));
          break;
        case "KITCHEN":
          submitted = !!(await prisma.kitchenEntry.findFirst({ where: { date: today } }));
          break;
        case "PRODUCTION":
          submitted = !!(await prisma.productionEntry.findFirst({ where: { date: today } }));
          break;
        case "PUFF_ROOM":
          submitted = !!(await prisma.puffRoomEntry.findFirst({ where: { date: today } }));
          break;
        case "CAKE_ROOM":
          submitted = !!(await prisma.cakeRoomEntry.findFirst({ where: { date: today } }));
          break;
        case "ORETA_HYGIENE":
        case "ORETA_SHOP_CLEANING":
          submitted = !!(await prisma.oretaHygieneEntry.findFirst({ where: { date: today } }));
          break;
        case "ORETA_EQUIPMENT":
          submitted = !!(await prisma.oretaEquipmentEntry.findFirst({ where: { date: today } }));
          break;
        case "ORETA_FRIDGE":
          submitted = !!(await prisma.oretaFridgeEntry.findFirst({ where: { date: today } }));
          break;
        case "ORETA_GLASS":
          submitted = !!(await prisma.oretaGlassEntry.findFirst({ where: { date: today } }));
          break;
        case "ORETA_MONTHLY":
          submitted = !!(await prisma.oretaMonthlyEntry.findFirst({ where: { month: today.slice(0, 7) } }));
          break;
      }
    } catch (e) {
      submitted = false;
    }
    statuses[route] = submitted;
  }

  return statuses;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const initialOutlet = cookieStore.get("pnr_outlet")?.value || "bakery";

  const user = session.user as { id: string; name: string; email: string; role: string };
  const today = getTodayString();
  const sheetStatuses = await getSheetStatuses(user.id, user.role, today);

  return (
    <OutletProvider initialOutletId={initialOutlet}>
      <div className="layout">
        <Sidebar user={user} sheetStatuses={sheetStatuses} />
        <main className="main-content">{children}</main>
      </div>
    </OutletProvider>
  );
}
