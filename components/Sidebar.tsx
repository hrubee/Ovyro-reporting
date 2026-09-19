"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useOutlet } from "./OutletContext";
import OutletSelector from "./OutletSelector";

interface SidebarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    organizationName?: string;
  };
  sheetStatuses?: Record<string, boolean | null>;
}

export default function Sidebar({ user, sheetStatuses = {} }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { activeOutlet, loading } = useOutlet();

  const isAdmin = user?.role === "ORG_ADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const userName = user?.name || user?.email || "User";
  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const templates = activeOutlet?.templates || [];

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="mobile-topbar">
        <button
          className="mobile-hamburger-btn"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle Navigation Menu"
          aria-expanded={mobileOpen}
        >
          <span className="hamburger-icon">{mobileOpen ? "✕" : "☰"}</span>
        </button>

        <Link href="/dashboard" className="mobile-brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-icon">📋</span>
          <span className="brand-text">Reporting Software</span>
        </Link>

        <div className="mobile-status-pill">
          <span className="pill-dot" />
          <span>{activeOutlet?.icon || "📍"} {activeOutlet?.name || "Facility"}</span>
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <nav className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-header">
            <h1>
              <span>📋</span> Reporting SaaS
            </h1>
            <button
              className="sidebar-close-btn mobile-only"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              ✕
            </button>
          </div>
          <p>{user?.organizationName || "Audit & Compliance Management"}</p>

          {/* Dynamic Outlet Switcher */}
          <OutletSelector />
        </div>

        <div className="sidebar-nav">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">📊</span>
            Dashboard Overview
          </Link>

          {/* Active Outlet Checklists / Sheets */}
          <div className="nav-section-title">
            <span>{activeOutlet?.name || "Active"} Checklists</span>
          </div>

          {loading ? (
            <div className="sidebar-loading-item">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="sidebar-empty-hint">No checklists assigned</div>
          ) : (
            templates.map((tpl) => {
              const route = `/${activeOutlet?.id}/${tpl.slug}`;
              const isActive = pathname === route || pathname.endsWith(`/${tpl.slug}`);
              return (
                <Link
                  key={tpl.id}
                  href={route}
                  onClick={() => setMobileOpen(false)}
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="nav-icon">{tpl.icon || "📋"}</span>
                  <span className="nav-label">{tpl.title}</span>
                </Link>
              );
            })
          )}

          {/* Management Console (Admins) */}
          {isAdmin && (
            <>
              <div className="nav-section-title admin-section">
                <span>Tenant Management</span>
              </div>
              <Link
                href="/admin/templates"
                className={`nav-item ${pathname.startsWith("/admin/templates") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">🛠️</span>
                Template Builder
              </Link>
              <Link
                href="/admin/outlets"
                className={`nav-item ${pathname.startsWith("/admin/outlets") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">🏢</span>
                Outlets & Facilities
              </Link>
              <Link
                href="/admin/users"
                className={`nav-item ${pathname.startsWith("/admin/users") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">👥</span>
                Team & Permissions
              </Link>
              <Link
                href="/admin/reports"
                className={`nav-item ${pathname.startsWith("/admin/reports") ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="nav-icon">📈</span>
                Audit Reports & Export
              </Link>
            </>
          )}
        </div>

        {/* User Info & Log out */}
        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="user-avatar-circle">{initials}</div>
            <div className="user-meta">
              <span className="user-name">{userName}</span>
              <span className="user-role-badge">{user?.role || "STAFF"}</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sidebar-logout-btn"
            title="Sign out"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
