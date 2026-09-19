"use client";

import React, { useState, useMemo } from "react";
import { formatDate } from "@/lib/permissions";

interface SubmissionsRecord {
  id: string;
  date: string;
  shift?: string | null;
  complianceScore?: number | null;
  supervisorName?: string;
  supervisorSigned?: boolean;
  comments?: string;
  correctiveAction?: string;
  status: string;
  createdAt: string;
  data: any;
  submittedBy?: { name?: string; email?: string };
  outlet?: { id: string; name: string; code?: string | null; icon: string };
  template?: { id: string; slug: string; title: string; icon: string; category: string };
}

interface ReportsClientProps {
  submissions: SubmissionsRecord[];
  outlets: Array<{ id: string; name: string; icon: string }>;
  templates: Array<{ id: string; title: string; icon: string; category: string; slug: string }>;
}

export default function ReportsClient({
  submissions,
  outlets,
  templates,
}: ReportsClientProps) {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return submissions.filter((sub) => {
      if (selectedOutlet !== "all" && sub.outlet?.id !== selectedOutlet) return false;
      if (selectedTemplate !== "all" && sub.template?.id !== selectedTemplate) return false;
      if (selectedStatus !== "all" && sub.status !== selectedStatus) return false;
      if (dateFrom && sub.date < dateFrom) return false;
      if (dateTo && sub.date > dateTo) return false;
      return true;
    });
  }, [submissions, selectedOutlet, selectedTemplate, selectedStatus, dateFrom, dateTo]);

  const avgCompliance = useMemo(() => {
    if (!filtered.length) return 100;
    const total = filtered.reduce((acc, curr) => acc + (curr.complianceScore ?? 100), 0);
    return Math.round(total / filtered.length);
  }, [filtered]);

  const exportCSV = () => {
    const headers = [
      "Date",
      "Facility",
      "Checklist / SOP",
      "Category",
      "Shift",
      "Compliance Score",
      "Submitted By",
      "Supervisor",
      "Signed",
      "Status",
      "Comments",
      "Corrective Action",
    ];

    const rows = filtered.map((sub) => [
      sub.date,
      `"${sub.outlet?.name || ""}"`,
      `"${sub.template?.title || ""}"`,
      sub.template?.category || "",
      sub.shift || "General",
      `${sub.complianceScore ?? 100}%`,
      `"${sub.submittedBy?.name || ""}"`,
      `"${sub.supervisorName || ""}"`,
      sub.supervisorSigned ? "Yes" : "No",
      sub.status,
      `"${(sub.comments || "").replace(/"/g, '""')}"`,
      `"${(sub.correctiveAction || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Compliance_Report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h1 className="admin-page-title">Audit Reports & Compliance Pack</h1>
          <p className="admin-page-subtitle">
            Centralized audit trail across all facilities, shifts, and equipment logs with FSSAI/HACCP export readiness.
          </p>
        </div>
        <div className="header-actions-group">
          <button onClick={() => window.print()} className="btn-secondary-action">
            🖨️ Print Audit Pack
          </button>
          <button onClick={exportCSV} className="btn-create-primary">
            📥 Export to CSV / Excel
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="reports-kpi-grid">
        <div className="kpi-card">
          <span className="kpi-title">Total Submissions</span>
          <span className="kpi-value">{filtered.length}</span>
          <span className="kpi-hint">Records in filtered range</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Average Compliance</span>
          <span className={`kpi-value ${avgCompliance < 85 ? "warning" : "good"}`}>
            {avgCompliance}%
          </span>
          <span className="kpi-hint">SOP verification rate</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Supervisor Verified</span>
          <span className="kpi-value">
            {filtered.filter((s) => s.supervisorSigned || s.status === "VERIFIED").length}
          </span>
          <span className="kpi-hint">With digital sign-off</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Action / CAPA Logs</span>
          <span className="kpi-value">{filtered.filter((s) => !!s.correctiveAction).length}</span>
          <span className="kpi-hint">Recorded corrective actions</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="reports-filter-card">
        <div className="filter-item">
          <label>Facility / Outlet</label>
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Outlets</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.icon} {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Checklist Template</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Checklists</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.title}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-item">
          <label>To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="filter-input"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="table-card">
        <div className="table-header-bar">
          <h3>Submission Log ({filtered.length} entries)</h3>
        </div>

        <div className="table-responsive">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Date & Shift</th>
                <th>Facility</th>
                <th>Checklist / Template</th>
                <th>Score</th>
                <th>Submitted By</th>
                <th>Supervisor Sign-off</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-table-cell">
                    No submissions found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  return (
                    <React.Fragment key={sub.id}>
                      <tr className={isExpanded ? "row-expanded" : ""}>
                        <td>
                          <div className="font-semibold">{formatDate(sub.date)}</div>
                          {sub.shift && <span className="shift-pill">{sub.shift}</span>}
                        </td>
                        <td>
                          <span>
                            {sub.outlet?.icon} {sub.outlet?.name}
                          </span>
                        </td>
                        <td>
                          <div className="font-semibold">
                            {sub.template?.icon} {sub.template?.title}
                          </div>
                          <span className="category-subtext">{sub.template?.category}</span>
                        </td>
                        <td>
                          <span className="score-badge-table">{sub.complianceScore ?? 100}%</span>
                        </td>
                        <td>{sub.submittedBy?.name || "Staff Member"}</td>
                        <td>
                          {sub.supervisorSigned ? (
                            <span className="signed-tag">✓ {sub.supervisorName || "Signed"}</span>
                          ) : (
                            <span className="unsigned-tag">Pending Sign-off</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${sub.status.toLowerCase()}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                            className="btn-details-toggle"
                          >
                            {isExpanded ? "Hide ▲" : "View Details ▼"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="expanded-details-row">
                          <td colSpan={8}>
                            <div className="details-panel">
                              <div className="details-notes-grid">
                                <div>
                                  <strong>Supervisor Remarks:</strong>
                                  <p>{sub.comments || "None"}</p>
                                </div>
                                <div>
                                  <strong>Corrective Action (CAPA):</strong>
                                  <p>{sub.correctiveAction || "None required"}</p>
                                </div>
                              </div>

                              <div className="raw-data-preview">
                                <strong>Log Data Payload:</strong>
                                <pre>{JSON.stringify(sub.data, null, 2)}</pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
