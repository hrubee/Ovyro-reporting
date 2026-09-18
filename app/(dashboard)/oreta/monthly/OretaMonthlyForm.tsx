"use client";
import React, { useState } from "react";
import { ORETA_MONTHLY_ITEMS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface MonthlyCheck {
  id: number;
  task: string;
  category: string;
  status: "COMPLETED" | "PENDING" | "SCHEDULED" | "N/A" | "";
  dateCompleted: string;
  assignedStaff: string;
  notes: string;
}

interface MonthlyEntryType {
  id: string;
  month: string;
  supervisorName: string;
  monthlyChecks: string;
  comments: string;
  correctiveAction: string;
  submittedBy: { name: string };
  createdAt: string;
}

interface Props {
  currentMonth: string;
  todayEntries: MonthlyEntryType[];
  history: MonthlyEntryType[];
  userName: string;
}

const SERVICE_STAFF = [
  ...ORETA_STAFF,
  "Technician / Rameshwar",
  "AC Technician",
  "Chiller Technician",
  "Pest Control Agency",
];

export default function OretaMonthlyForm({
  currentMonth,
  todayEntries: initialTodayEntries,
  history: initialHistory,
  userName,
}: Props) {
  const init: MonthlyCheck[] = ORETA_MONTHLY_ITEMS.map((item) => ({
    id: item.id,
    task: item.task,
    category: item.category,
    status: "",
    dateCompleted: "",
    assignedStaff: item.defaultCleanedBy,
    notes: "",
  }));

  const [todayEntries, setTodayEntries] = useState<MonthlyEntryType[]>(initialTodayEntries);
  const [history, setHistory] = useState<MonthlyEntryType[]>(initialHistory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialTodayEntries.length === 0);

  const [checks, setChecks] = useState<MonthlyCheck[]>(init);
  const [supervisorName, setSupervisorName] = useState(SUPERVISORS[0] || "Aboli Wagh");
  const [comments, setComments] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  function startNewSubmission() {
    setEditingId(null);
    setChecks(init);
    setSupervisorName(SUPERVISORS[0] || "Aboli Wagh");
    setComments("");
    setCorrectiveAction("");
    setIsEditing(true);
    setAlert(null);
  }

  function startEditSubmission(entry: MonthlyEntryType) {
    setEditingId(entry.id);
    try {
      const parsed = JSON.parse(entry.monthlyChecks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setChecks(
          parsed.map((m: any, idx: number) => {
            const def = ORETA_MONTHLY_ITEMS[idx] || { id: idx + 1, task: m.task || `Task ${idx + 1}`, category: "General", defaultCleanedBy: "Mangla" };
            return {
              id: m.id || def.id,
              task: m.task || def.task,
              category: m.category || def.category,
              status: m.status || "",
              dateCompleted: m.dateCompleted || "",
              assignedStaff: m.assignedStaff || def.defaultCleanedBy,
              notes: m.notes || "",
            };
          })
        );
      } else {
        setChecks(init);
      }
    } catch {
      setChecks(init);
    }
    setSupervisorName(entry.supervisorName || SUPERVISORS[0] || "Aboli Wagh");
    setComments(entry.comments || "");
    setCorrectiveAction(entry.correctiveAction || "");
    setIsEditing(true);
    setAlert(null);
  }

  function update(idx: number, field: keyof MonthlyCheck, value: string | number) {
    const copy = [...checks];
    copy[idx] = { ...copy[idx], [field]: value };
    setChecks(copy);
  }

  function markAllCompleted() {
    setChecks((prev) => prev.map((c) => ({ ...c, status: "COMPLETED" })));
  }

  function assignAllTo(name: string) {
    if (!name) return;
    setChecks((prev) => prev.map((c) => ({ ...c, assignedStaff: name })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/entries/oreta-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          month,
          supervisorName,
          monthlyChecks: checks,
          comments,
          correctiveAction,
        }),
      });
      if (res.ok) {
        const saved: MonthlyEntryType = await res.json();
        const withSubmitter = { ...saved, submittedBy: { name: userName } };

        if (editingId) {
          setTodayEntries((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setHistory((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setAlert({ type: "success", msg: "✅ Oreta Monthly report updated!" });
        } else {
          setTodayEntries((prev) => [withSubmitter, ...prev]);
          setHistory((prev) => [withSubmitter, ...prev]);
          setAlert({
            type: "success",
            msg: `✅ New Monthly report saved for ${saved.month}!`,
          });
        }
        setIsEditing(false);
      } else {
        const d = await res.json();
        setAlert({ type: "error", msg: d.error || "Failed to save." });
      }
    } catch {
      setAlert({ type: "error", msg: "Network error. Please try again." });
    }
    setSaving(false);
  }

  const selectedMonthEntries = history.filter((h) => h.month === selectedMonth);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🗓️ Oreta World Monthly Maintenance & Deep Clean</h1>
          <p>Shutters, Generator, AC Servicing & Refrigeration Deep Clean — {month}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {!isEditing && (
            <button className="btn btn-primary btn-sm" onClick={startNewSubmission}>
              ➕ New Monthly Audit
            </button>
          )}
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: "1rem" }}>
          {alert.msg}
        </div>
      )}

      {/* CURRENT MONTH SUBMISSIONS */}
      {!isEditing && todayEntries.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div className="card-title">
              📋 Recorded Submissions for {month} ({todayEntries.length})
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {todayEntries.map((entry, idx) => (
              <div
                key={entry.id}
                style={{
                  padding: "0.85rem 1rem",
                  background: "var(--bg-input)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="badge badge-submitted">#{todayEntries.length - idx}</span>
                    <span>Supervisor: <strong>{entry.supervisorName || "Aboli Wagh"}</strong></span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    📅 Month: {entry.month}
                    {entry.comments && ` • "${entry.comments}"`}
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => startEditSubmission(entry)}>
                  ✏️ View / Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
              <div className="card-title">
                {editingId ? `✏️ Edit Oreta Monthly Report (${month})` : `➕ New Monthly Log (${month})`}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600 }}>Month:</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  style={{ padding: "0.3rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* 1-Tap Quick Action Bar */}
            <div className="quick-action-bar">
              <span>⚡ 1-Tap Quick Actions:</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={markAllCompleted}>
                ✅ Mark All COMPLETED
              </button>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.72rem" }}>👤 Assign All:</span>
                <select
                  value=""
                  onChange={(e) => assignAllTo(e.target.value)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.75rem",
                    borderRadius: "4px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="" disabled>Select Staff / Agency</option>
                  {SERVICE_STAFF.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="checklist-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Maintenance Task</th>
                    <th style={{ width: "170px" }}>Status</th>
                    <th style={{ width: "140px" }}>Date Completed</th>
                    <th>Staff / Agency</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div>
                          <span>{row.task}</span>
                          <span className="badge" style={{ fontSize: "0.7rem", marginLeft: "0.4rem", background: "var(--bg-primary)" }}>
                            {row.category}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="touch-btn-toggle">
                          <button
                            type="button"
                            className={`touch-btn-option ${row.status === "COMPLETED" ? "active-yes" : ""}`}
                            onClick={() => update(idx, "status", "COMPLETED")}
                          >
                            ✅ DONE
                          </button>
                          <button
                            type="button"
                            className={`touch-btn-option ${row.status === "PENDING" ? "active-no" : ""}`}
                            onClick={() => update(idx, "status", "PENDING")}
                          >
                            ⏳ PENDING
                          </button>
                          <button
                            type="button"
                            className={`touch-btn-option ${row.status === "N/A" ? "active-na" : ""}`}
                            onClick={() => update(idx, "status", "N/A")}
                          >
                            ⚪ N/A
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={row.dateCompleted}
                          onChange={(e) => update(idx, "dateCompleted", e.target.value)}
                          style={{ width: "100%", fontSize: "0.8rem", height: "36px" }}
                        />
                      </td>
                      <td>
                        <select
                          value={row.assignedStaff}
                          onChange={(e) => update(idx, "assignedStaff", e.target.value)}
                        >
                          {SERVICE_STAFF.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-grid" style={{ marginTop: "1.25rem" }}>
              <div className="form-group">
                <label>Verified By Supervisor</label>
                <select
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  style={{ fontWeight: 600, color: "var(--accent)" }}
                >
                  {SUPERVISORS.map((sup) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Monthly Executive Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Shutters oiled, AC condenser coils descaled."
                  rows={2}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Outstanding Actions Scheduled for Next Month</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Schedule generator battery replacement."
                  rows={2}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "⏳ Saving..." : editingId ? "💾 Update Oreta Monthly Report" : "💾 Submit Oreta Monthly Report"}
              </button>
              {todayEntries.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {/* History Log */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🕒 Oreta Monthly Maintenance History</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: "0.3rem 0.5rem", fontSize: "0.82rem", borderRadius: "6px", border: "1px solid var(--border)" }}
            />
          </div>
        </div>

        {selectedMonthEntries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗓️</div>
            <p>No monthly maintenance records found for {selectedMonth}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {selectedMonthEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "1rem",
                  background: "var(--bg-input)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <div>
                    <strong>🗓️ {entry.month}</strong> · Submitted by <strong>{entry.submittedBy?.name || "Admin"}</strong>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Supervisor: <strong>{entry.supervisorName || "—"}</strong>
                  </div>
                </div>
                {entry.comments && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    💬 <em>&ldquo;{entry.comments}&rdquo;</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
