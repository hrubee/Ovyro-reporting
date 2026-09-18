import { auth } from "@/lib/auth";
import { prisma, ensureDbSchema } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { SHEET_LABELS, SHEET_ROUTES, getTodayString, formatDate, SheetId } from "@/lib/permissions";
import { OUTLETS, getOutletById } from "@/lib/outlets";

const SHEET_ICONS: Record<SheetId, string> = {
  HYGIENE_REPORT: "🧹",
  GLASS_REPORT: "🪟",
  FRIDGE_REPORT: "🧊",
  KITCHEN: "🍳",
  PRODUCTION: "🏭",
  PUFF_ROOM: "🥐",
  CAKE_ROOM: "🎂",
  ORETA_HYGIENE: "🧹",
  ORETA_SHOP_CLEANING: "🧹",
  ORETA_EQUIPMENT: "⚙️",
  ORETA_FRIDGE: "🧊",
  ORETA_GLASS: "🪟",
  ORETA_MONTHLY: "🗓️",
};

async function getTodayStatus(today: string) {
  await ensureDbSchema();
  const currentMonth = today.slice(0, 7);
  const [
    hygiene,
    glass,
    fridge,
    kitchen,
    production,
    puffRoom,
    cakeRoom,
    oretaShopCleaning,
    oretaEquipment,
    oretaFridge,
    oretaGlass,
    oretaMonthly,
  ] = await Promise.all([
    prisma.hygieneEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.glassEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.fridgeEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.kitchenEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.productionEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.puffRoomEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.cakeRoomEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.oretaHygieneEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.oretaEquipmentEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.oretaFridgeEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.oretaGlassEntry.findMany({ where: { date: today }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
    prisma.oretaMonthlyEntry.findMany({ where: { month: currentMonth }, orderBy: { createdAt: "desc" }, include: { submittedBy: true } }).catch(() => []),
  ]);

  return {
    hygiene,
    glass,
    fridge,
    kitchen,
    production,
    puffRoom,
    cakeRoom,
    oretaShopCleaning,
    oretaEquipment,
    oretaFridge,
    oretaGlass,
    oretaMonthly,
  };
}

interface PageProps {
  searchParams: Promise<{ outlet?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { id: string; name: string; role: string };

  const resolvedParams = (await searchParams) || {};
  const outletParam = resolvedParams.outlet;
  const cookieStore = await cookies();
  const activeOutletId = outletParam || cookieStore.get("pnr_outlet")?.value || "bakery";
  const activeOutlet = getOutletById(activeOutletId);

  const today = getTodayString();
  const statuses = await getTodayStatus(today);

  const allSheetsData: Record<SheetId, any[]> = {
    HYGIENE_REPORT: statuses.hygiene,
    GLASS_REPORT: statuses.glass,
    FRIDGE_REPORT: statuses.fridge,
    KITCHEN: statuses.kitchen,
    PRODUCTION: statuses.production,
    PUFF_ROOM: statuses.puffRoom,
    CAKE_ROOM: statuses.cakeRoom,
    ORETA_HYGIENE: statuses.oretaShopCleaning,
    ORETA_SHOP_CLEANING: statuses.oretaShopCleaning,
    ORETA_EQUIPMENT: statuses.oretaEquipment,
    ORETA_FRIDGE: statuses.oretaFridge,
    ORETA_GLASS: statuses.oretaGlass,
    ORETA_MONTHLY: statuses.oretaMonthly,
  };

  // Filter sheets to only the active outlet's sheets
  const outletSheets = activeOutlet.sheets.map((s) => ({
    key: s.id as SheetId,
    list: allSheetsData[s.id as SheetId] || [],
    label: s.label,
    icon: s.icon,
    route: s.route,
  }));

  // Access list for employee
  let accessibleSheets: Set<string> = new Set();
  if (user.role === "ADMIN") {
    accessibleSheets = new Set(Object.keys(SHEET_LABELS));
  } else {
    try {
      const access = await prisma.sheetAccess.findMany({
        where: { userId: user.id },
        select: { sheet: true },
      });
      accessibleSheets = new Set(access.map((a: { sheet: string }) => a.sheet));
    } catch {
      accessibleSheets = new Set();
    }
  }

  const totalSheetsInOutlet = outletSheets.length;
  const completedSheetsCount = outletSheets.filter((s) => s.list.length > 0).length;
  const totalSubmissionsToday = outletSheets.reduce((acc, s) => acc + s.list.length, 0);

  const userName = user?.name || "User";
  const firstName = userName.split(" ")[0] || "User";

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem" }}>
        <div className="page-header-text">
          <h1>👋 Good day, {firstName}!</h1>
          <p>
            Current Sub-Account: <strong>{activeOutlet.icon} {activeOutlet.name}</strong> · {formatDate(today)}
          </p>
        </div>

        {/* Outlet Switcher Pills */}
        <div style={{ display: "flex", gap: "0.5rem", background: "#ffffff", padding: "0.35rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
          {OUTLETS.map((out) => {
            const isActive = out.id === activeOutlet.id;
            return (
              <Link
                key={out.id}
                href={`/dashboard?outlet=${out.id}`}
                className={`btn btn-sm ${isActive ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
              >
                {out.icon} {out.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div>
            <div className="stat-value">
              {completedSheetsCount}/{totalSheetsInOutlet}
            </div>
            <div className="stat-label">{activeOutlet.name} Sheets Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📝</div>
          <div>
            <div className="stat-value">{totalSubmissionsToday}</div>
            <div className="stat-label">Total Entries Recorded Today</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⏳</div>
          <div>
            <div className="stat-value">{totalSheetsInOutlet - completedSheetsCount}</div>
            <div className="stat-label">Pending {activeOutlet.name} Sheets</div>
          </div>
        </div>
        {user.role === "ADMIN" && (
          <div className="stat-card">
            <div className="stat-icon blue">👥</div>
            <div>
              <div className="stat-value">
                {totalSheetsInOutlet > 0 ? Math.round((completedSheetsCount / totalSheetsInOutlet) * 100) : 0}%
              </div>
              <div className="stat-label">Daily Compliance Rate</div>
            </div>
          </div>
        )}
      </div>

      {/* Today's Sheet Status */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              📅 {activeOutlet.name} — Today&apos;s Compliance Status
            </div>
            <div className="card-subtitle">{formatDate(today)}</div>
          </div>
          <div
            className="badge"
            style={
              completedSheetsCount === totalSheetsInOutlet
                ? { background: "var(--success-bg)", color: "var(--success)" }
                : { background: "var(--warning-bg)", color: "var(--warning)" }
            }
          >
            {completedSheetsCount} / {totalSheetsInOutlet} Completed
          </div>
        </div>

        <div className="status-grid">
          {outletSheets.map(({ key, list, label, icon, route }) => {
            const hasAccess = user.role === "ADMIN" || accessibleSheets.has(key);
            const isDone = list.length > 0;
            const latest = list[0];
            const latestTime = latest
              ? new Date(latest.createdAt).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

            return (
              <Link
                key={key}
                href={hasAccess ? route : "#"}
                className={`status-card ${isDone ? "submitted" : "pending"} ${
                  !hasAccess ? "no-access" : ""
                }`}
                style={!hasAccess ? { opacity: 0.35, pointerEvents: "none" } : {}}
              >
                <div className={`status-dot ${isDone ? "submitted" : "pending"}`}>
                  {icon || SHEET_ICONS[key]}
                </div>
                <div className="status-info">
                  <div className="status-name">{label}</div>
                  <div className="status-meta">
                    {!hasAccess ? (
                      "No access"
                    ) : isDone ? (
                      <span>
                        ✓ {list.length} {list.length === 1 ? "entry" : "entries"} (latest by{" "}
                        <strong>{latest.submittedBy.name}</strong> @ {latestTime})
                      </span>
                    ) : (
                      "⏳ Not yet submitted"
                    )}
                  </div>
                </div>
                {hasAccess && (
                  <span className="status-arrow">
                    {isDone ? "👁" : "→"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
