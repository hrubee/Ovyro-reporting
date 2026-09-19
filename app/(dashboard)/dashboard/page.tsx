import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTodayString, formatDate, resolveOrganizationId } from "@/lib/permissions";

interface PageProps {
  searchParams: Promise<{ outlet?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    id: string;
    name: string;
    role: string;
    organizationId: string;
    organizationName?: string;
    email?: string;
  };

  const organizationId = await resolveOrganizationId(user);

  const resolvedParams = (await searchParams) || {};
  const cookieStore = await cookies();

  // Load all tenant outlets
  const outlets = await prisma.outlet.findMany({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "asc" },
  });


  if (outlets.length === 0) {
    return (
      <div className="empty-state-card">
        <h2>No facilities configured</h2>
        <p>Please add a facility or outlet from the Admin Console.</p>
        <Link href="/admin/outlets" className="btn-create-primary">
          Configure Outlets
        </Link>
      </div>
    );
  }

  const selectedOutletId =
    resolvedParams.outlet ||
    cookieStore.get("pnr_outlet")?.value ||
    outlets[0]?.id;

  const currentOutlet =
    outlets.find((o) => o.id === selectedOutletId) || outlets[0];

  const today = getTodayString();

  // Fetch dynamic templates assigned to current outlet
  const outletTemplates = await prisma.outletTemplate.findMany({
    where: { outletId: currentOutlet.id, isEnabled: true },
    include: {
      template: true,
    },
    orderBy: { order: "asc" },
  });

  // Fetch today's submissions for this outlet
  const todaySubmissions = await prisma.formSubmission.findMany({
    where: {
      outletId: currentOutlet.id,
      date: today,
    },
    include: {
      submittedBy: { select: { name: true } },
      template: { select: { id: true, slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const submissionMap = new Map<string, any[]>();
  todaySubmissions.forEach((sub) => {
    const arr = submissionMap.get(sub.templateId) || [];
    arr.push(sub);
    submissionMap.set(sub.templateId, arr);
  });

  const totalTemplates = outletTemplates.length;
  const completedCount = outletTemplates.filter((ot) => submissionMap.has(ot.templateId)).length;
  const completionPercentage = totalTemplates > 0 ? Math.round((completedCount / totalTemplates) * 100) : 100;

  // Recent 10 submissions across all outlets for this tenant
  const recentFeed = await prisma.formSubmission.findMany({
    where: { organizationId },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: { select: { name: true } },
      template: { select: { title: true, icon: true } },
      outlet: { select: { name: true, icon: true } },
    },
  });


  return (
    <div className="dashboard-container">
      {/* Welcome Banner */}
      <div className="dashboard-hero-banner">
        <div className="hero-left">
          <span className="hero-date-badge">📅 {formatDate(today)}</span>
          <h1 className="hero-title">
            Welcome back, {user.name || "Operator"}!
          </h1>
          <p className="hero-subtitle">
            {user.organizationName || "Audit Management"} • Daily Operations & Food Safety Compliance
          </p>
        </div>

        <div className="hero-right">
          <div className="outlet-pill-badge">
            <span className="pill-icon">{currentOutlet.icon}</span>
            <div className="pill-details">
              <span className="pill-title">{currentOutlet.name}</span>
              <span className="pill-type">{currentOutlet.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="dashboard-kpi-grid">
        <div className="kpi-box">
          <div className="kpi-icon-wrap green">✓</div>
          <div>
            <span className="kpi-num">{completedCount}/{totalTemplates}</span>
            <span className="kpi-label">Today's Checklists Done</span>
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-icon-wrap blue">📈</div>
          <div>
            <span className="kpi-num">{completionPercentage}%</span>
            <span className="kpi-label">Facility Completion Rate</span>
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-icon-wrap amber">🛡️</div>
          <div>
            <span className="kpi-num">
              {todaySubmissions.filter((s) => s.status === "VERIFIED" || s.supervisorSigned).length}
            </span>
            <span className="kpi-label">Supervisor Verified</span>
          </div>
        </div>

        <div className="kpi-box">
          <div className="kpi-icon-wrap purple">🏢</div>
          <div>
            <span className="kpi-num">{outlets.length}</span>
            <span className="kpi-label">Active Facilities</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Checklists + Recent Activity */}
      <div className="dashboard-grid-layout">
        {/* Left: Active Checklists for the Selected Outlet */}
        <div className="dashboard-left-col">
          <div className="section-title-bar">
            <h2>Today's Report Tabs & SOPs</h2>
            <span className="sub-hint">Click any report tab to record or update today's logs</span>
          </div>

          <div className="checklists-cards-grid">
            {outletTemplates.length === 0 ? (
              <div className="empty-card">
                <p>No report tabs assigned to {currentOutlet.name}.</p>
                <Link href="/admin/templates" className="btn-secondary-link">
                  Manage Report Tabs in Admin Console
                </Link>
              </div>
            ) : (
              outletTemplates.map((ot) => {
                const tpl = ot.template;
                const subs = submissionMap.get(tpl.id) || [];
                const isDone = subs.length > 0;
                const latestSub = subs[0];

                return (
                  <Link
                    key={tpl.id}
                    href={`/${currentOutlet.id}/${tpl.slug}`}
                    className={`checklist-card ${isDone ? "is-done" : "is-pending"}`}
                  >
                    <div className="checklist-card-top">
                      <span className="card-icon">{tpl.icon || "📋"}</span>
                      <span className={`status-tag ${isDone ? "done" : "pending"}`}>
                        {isDone ? "✓ Logged" : "⏳ Pending"}
                      </span>
                    </div>

                    <h3 className="card-title">{tpl.title}</h3>
                    <p className="card-desc">
                      {tpl.description || `${tpl.frequency} inspection checklist`}
                    </p>

                    <div className="card-footer-meta">
                      {isDone ? (
                        <span>
                          By {latestSub.submittedBy?.name || "Staff"} • {latestSub.complianceScore ?? 100}% Score
                        </span>
                      ) : (
                        <span>Due today • Click to record</span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Live Activity Stream */}
        <div className="dashboard-right-col">
          <div className="section-title-bar">
            <h2>Live Audit Stream</h2>
          </div>

          <div className="activity-stream-card">
            {recentFeed.length === 0 ? (
              <p className="no-activity-text">No recent submissions recorded yet.</p>
            ) : (
              recentFeed.map((entry) => (
                <div key={entry.id} className="stream-item">
                  <div className="stream-icon">{entry.template?.icon || "📋"}</div>
                  <div className="stream-info">
                    <span className="stream-title">
                      {entry.template?.title} ({entry.outlet?.name})
                    </span>
                    <span className="stream-by">
                      Logged by {entry.submittedBy?.name || "Staff"} • {entry.complianceScore ?? 100}% Score
                    </span>
                  </div>
                  <span className="stream-date">{entry.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
