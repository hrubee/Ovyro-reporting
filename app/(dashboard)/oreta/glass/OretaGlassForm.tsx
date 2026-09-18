"use client";
import React, { useState } from "react";
import { ORETA_GLASS_ITEMS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface GlassCheck {
  id: number;
  floor: string;
  location: string;
  yesNo: string;
  time: string;
  cleanedBy: string;
}

interface GlassEntryType {
  id: string;
  date: string;
  supervisorName: string;
  glassChecks: string;
  comments: string;
  correctiveAction: string;
  submittedBy: { name: string };
  createdAt: string;
}

interface Props {
  today: string;
  todayLabel: string;
  todayEntries: GlassEntryType[];
  history: GlassEntryType[];
  userName: string;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function OretaGlassForm({
  today,
  todayLabel,
  todayEntries: initialTodayEntries,
  history: initialHistory,
  userName,
}: Props) {
  const init: GlassCheck[] = ORETA_GLASS_ITEMS.map((item) => ({
    id: item.id,
    floor: item.floor,
    location: item.location,
    yesNo: "",
    time: "",
    cleanedBy: item.defaultCleanedBy,
  }));

  const [todayEntries, setTodayEntries] = useState<GlassEntryType[]>(initialTodayEntries);
  const [history, setHistory] = useState<GlassEntryType[]>(initialHistory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialTodayEntries.length === 0);

  const [checks, setChecks] = useState<GlassCheck[]>(init);
  const [supervisorName, setSupervisorName] = useState(SUPERVISORS[0] || "Aboli Wagh");
  const [comments, setComments] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);

  function startNewSubmission() {
    setEditingId(null);
    setChecks(init);
    setSupervisorName(SUPERVISORS[0] || "Aboli Wagh");
    setComments("");
    setCorrectiveAction("");
    setIsEditing(true);
    setAlert(null);
  }

  function startEditSubmission(entry: GlassEntryType) {
    setEditingId(entry.id);
    try {
      const parsed = JSON.parse(entry.glassChecks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setChecks(
          parsed.map((g: any, idx: number) => {
            const def = ORETA_GLASS_ITEMS[idx] || { id: idx + 1, floor: "Ground Floor", location: `Glass ${idx + 1}`, defaultCleanedBy: "Mangla" };
            return {
              id: g.id || def.id,
              floor: g.floor || def.floor,
              location: g.location || def.location,
              yesNo: g.yesNo || g.status || "",
              time: g.time || "",
              cleanedBy: g.cleanedBy || def.defaultCleanedBy,
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

  function update(idx: number, field: keyof GlassCheck, value: string | number) {
    const copy = [...checks];
    copy[idx] = { ...copy[idx], [field]: value };
    setChecks(copy);
  }

  function markAllYes() {
    const timeNow = getCurrentTimeString();
    setChecks((prev) => prev.map((c) => ({ ...c, yesNo: "YES", time: c.time || timeNow })));
  }

  function setAllCurrentTime() {
    const timeNow = getCurrentTimeString();
    setChecks((prev) => prev.map((c) => ({ ...c, time: timeNow })));
  }

  function assignAllTo(name: string) {
    if (!name) return;
    setChecks((prev) => prev.map((c) => ({ ...c, cleanedBy: name })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/entries/oreta-glass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          date: today,
          supervisorName,
          glassChecks: checks,
          comments,
          correctiveAction,
        }),
      });
      if (res.ok) {
        const saved: GlassEntryType = await res.json();
        const withSubmitter = { ...saved, submittedBy: { name: userName } };

        if (editingId) {
          setTodayEntries((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setHistory((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setAlert({ type: "success", msg: "✅ Oreta Glass report updated!" });
        } else {
          setTodayEntries((prev) => [withSubmitter, ...prev]);
          setHistory((prev) => [withSubmitter, ...prev]);
          setAlert({
            type: "success",
            msg: `✅ New Glass report recorded at ${new Date(saved.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}!`,
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

  const selectedDateEntries = history.filter((h) => h.date === selectedDate);
  const floors = ["Ground Floor", "Mezzanine Floor"] as const;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🪟 Oreta World Glass Cleaning</h1>
          <p>Ground & Mezzanine Architectural Glass Panels Log — {todayLabel}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {!isEditing && (
            <button className="btn btn-primary btn-sm" onClick={startNewSubmission}>
              ➕ New Submission for Today
            </button>
          )}
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`} style={{ marginBottom: "1rem" }}>
          {alert.msg}
        </div>
      )}

      {/* TODAY'S SUBMISSIONS */}
      {!isEditing && todayEntries.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div className="card-title">
              📋 Today&apos;s Recorded Submissions ({todayEntries.length})
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
                    ⏰ {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
                {editingId ? "✏️ Edit Oreta Glass Report" : "➕ New Glass Submission"}
              </div>
            </div>

            {/* 1-Tap Quick Action Bar */}
            <div className="quick-action-bar">
              <span>⚡ 1-Tap Quick Actions:</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={markAllYes}>
                ✅ Mark All YES
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={setAllCurrentTime}>
                🕒 Set All Current Time
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
                  <option value="" disabled>Select Staff</option>
                  {ORETA_STAFF.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="checklist-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Glass Panel Location</th>
                    <th style={{ width: "170px" }}>Status</th>
                    <th style={{ width: "130px" }}>Time</th>
                    <th>Cleaned By</th>
                  </tr>
                </thead>
                <tbody>
                  {floors.map((fl) => {
                    const flRows = checks.filter((c) => c.floor === fl);
                    if (flRows.length === 0) return null;

                    return (
                      <React.Fragment key={fl}>
                        <tr className="zone-row">
                          <td colSpan={4}>🪟 {fl}</td>
                        </tr>
                        {flRows.map((row) => {
                          const idx = checks.findIndex((c) => c.id === row.id);

                          return (
                            <tr key={row.id}>
                              <td style={{ fontWeight: 600 }}>
                                <span>{row.location}</span>
                                {row.yesNo && (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "2px 8px",
                                      borderRadius: "99px",
                                      fontWeight: 700,
                                      background:
                                        row.yesNo === "YES"
                                          ? "rgba(16,185,129,0.15)"
                                          : row.yesNo === "NO"
                                          ? "rgba(239,68,68,0.15)"
                                          : "rgba(148,163,184,0.15)",
                                      color:
                                        row.yesNo === "YES"
                                          ? "var(--success)"
                                          : row.yesNo === "NO"
                                          ? "var(--danger)"
                                          : "var(--text-muted)",
                                    }}
                                  >
                                    {row.yesNo}
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="touch-btn-toggle">
                                  <button
                                    type="button"
                                    className={`touch-btn-option ${row.yesNo === "YES" ? "active-yes" : ""}`}
                                    onClick={() => update(idx, "yesNo", "YES")}
                                  >
                                    ✅ YES
                                  </button>
                                  <button
                                    type="button"
                                    className={`touch-btn-option ${row.yesNo === "NO" ? "active-no" : ""}`}
                                    onClick={() => update(idx, "yesNo", "NO")}
                                  >
                                    ❌ NO
                                  </button>
                                  <button
                                    type="button"
                                    className={`touch-btn-option ${row.yesNo === "N/A" ? "active-na" : ""}`}
                                    onClick={() => update(idx, "yesNo", "N/A")}
                                  >
                                    ⚪ N/A
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", width: "100%" }}>
                                  <input
                                    type="time"
                                    value={row.time}
                                    onChange={(e) => update(idx, "time", e.target.value)}
                                    style={{ flex: 1 }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    style={{ padding: "0.45rem 0.5rem", fontSize: "0.75rem", minHeight: "44px" }}
                                    onClick={() => update(idx, "time", getCurrentTimeString())}
                                    title="Set current time"
                                  >
                                    Now
                                  </button>
                                </div>
                              </td>
                              <td>
                                <select
                                  value={row.cleanedBy}
                                  onChange={(e) => update(idx, "cleanedBy", e.target.value)}
                                >
                                  <option value="">— Select Staff —</option>
                                  {ORETA_STAFF.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
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
                <label>Comments / Observations</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Ground floor entrance and facade glass clean."
                  rows={2}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Corrective Action (if required)</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Re-wiped handrail glass after rain."
                  rows={2}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "⏳ Saving..." : editingId ? "💾 Update Oreta Glass Report" : "💾 Submit Oreta Glass Report"}
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
          <div className="card-title">🕒 Oreta Glass History Log</div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: "0.3rem 0.5rem", fontSize: "0.82rem", borderRadius: "6px", border: "1px solid var(--border)" }}
            />
          </div>
        </div>

        {selectedDateEntries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🪟</div>
            <p>No glass cleaning records found for {selectedDate}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {selectedDateEntries.map((entry) => (
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
                    <strong>📅 {entry.date}</strong> · Submitted by <strong>{entry.submittedBy?.name || "Admin"}</strong>
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
