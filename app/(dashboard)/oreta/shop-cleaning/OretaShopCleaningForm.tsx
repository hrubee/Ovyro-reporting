"use client";
import React, { useState } from "react";
import { ORETA_HYGIENE_AREAS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

export type ShiftKey = "morning" | "afternoon" | "evening" | "night";

export interface ShiftCheck {
  status: "YES" | "NO" | "N/A" | "";
  staff: string;
  time: string;
}

export interface AreaRow {
  id: number;
  area: string;
  morning: ShiftCheck;
  afternoon: ShiftCheck;
  evening: ShiftCheck;
  night: ShiftCheck;
}

export interface EntryType {
  id: string;
  date: string;
  day: string;
  areaChecks: string;
  supervisorName: string;
  comments: string;
  correctiveAction: string;
  submittedBy: { name: string };
  createdAt: string;
}

interface Props {
  today: string;
  todayLabel: string;
  dayName: string;
  todayEntries: EntryType[];
  history: EntryType[];
  userName: string;
}

const SHIFT_KEYS: ShiftKey[] = ["morning", "afternoon", "evening", "night"];

const SHIFT_INFO: Record<ShiftKey, { label: string; icon: string; time: string }> = {
  morning: { label: "Morning", icon: "🌅", time: "09:00" },
  afternoon: { label: "Afternoon", icon: "☀️", time: "14:00" },
  evening: { label: "Evening", icon: "🌆", time: "18:30" },
  night: { label: "Night", icon: "🌙", time: "22:00" },
};

function getCurrentShift(): ShiftKey {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 16) return "afternoon";
  if (h < 20) return "evening";
  return "night";
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function OretaShopCleaningForm({
  today,
  todayLabel,
  dayName,
  todayEntries: initialTodayEntries,
  history: initialHistory,
  userName,
}: Props) {
  const init: AreaRow[] = ORETA_HYGIENE_AREAS.map((item) => ({
    id: item.id,
    area: item.area,
    morning: {
      status: item.morningDisabled ? "N/A" : "",
      staff: item.morningDisabled ? "—" : item.defaultStaff,
      time: "",
    },
    afternoon: {
      status: "",
      staff: item.defaultStaff,
      time: "",
    },
    evening: {
      status: "",
      staff: item.defaultStaff,
      time: "",
    },
    night: {
      status: "",
      staff: item.defaultStaff,
      time: "",
    },
  }));

  const [todayEntries, setTodayEntries] = useState<EntryType[]>(initialTodayEntries);
  const [history, setHistory] = useState<EntryType[]>(initialHistory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialTodayEntries.length === 0);

  const [rows, setRows] = useState<AreaRow[]>(init);
  const [activeShift, setActiveShift] = useState<ShiftKey | "all">(getCurrentShift());
  const [supervisorName, setSupervisorName] = useState(SUPERVISORS[0] || "Aboli Wagh");
  const [comments, setComments] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);

  function startNewSubmission() {
    setEditingId(null);
    setRows(init);
    setSupervisorName(SUPERVISORS[0] || "Aboli Wagh");
    setComments("");
    setCorrectiveAction("");
    setIsEditing(true);
    setAlert(null);
  }

  function startEditSubmission(entry: EntryType) {
    setEditingId(entry.id);
    try {
      const parsed = JSON.parse(entry.areaChecks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setRows(
          parsed.map((r: AreaRow, idx: number) => {
            const def = ORETA_HYGIENE_AREAS[idx] || { id: idx + 1, area: `Area ${idx + 1}`, defaultStaff: "Rameshwar" };
            return {
              id: r.id || def.id,
              area: r.area || def.area,
              morning: r.morning || { status: "", staff: def.defaultStaff, time: "" },
              afternoon: r.afternoon || { status: "", staff: def.defaultStaff, time: "" },
              evening: r.evening || { status: "", staff: def.defaultStaff, time: "" },
              night: r.night || { status: "", staff: def.defaultStaff, time: "" },
            };
          })
        );
      } else {
        setRows(init);
      }
    } catch {
      setRows(init);
    }
    setSupervisorName(entry.supervisorName || SUPERVISORS[0] || "Aboli Wagh");
    setComments(entry.comments || "");
    setCorrectiveAction(entry.correctiveAction || "");
    setIsEditing(true);
    setAlert(null);
  }

  function updateCheck(rowId: number, shift: ShiftKey, field: keyof ShiftCheck, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              [shift]: {
                ...r[shift],
                [field]: value,
              },
            }
          : r
      )
    );
  }

  function markAllYes(targetShift?: ShiftKey) {
    const shiftsToUpdate = targetShift ? [targetShift] : SHIFT_KEYS;
    setRows((prev) =>
      prev.map((r) => {
        const areaDef = ORETA_HYGIENE_AREAS.find((a) => a.id === r.id);
        const updated = { ...r };
        shiftsToUpdate.forEach((s) => {
          if (s === "morning" && areaDef?.morningDisabled) return;
          updated[s] = { ...updated[s], status: "YES" };
        });
        return updated;
      })
    );
  }

  function assignAllTo(name: string, targetShift?: ShiftKey) {
    if (!name) return;
    const shiftsToUpdate = targetShift ? [targetShift] : SHIFT_KEYS;
    setRows((prev) =>
      prev.map((r) => {
        const updated = { ...r };
        shiftsToUpdate.forEach((s) => {
          updated[s] = { ...updated[s], staff: name };
        });
        return updated;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/entries/oreta-shop-cleaning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          date: today,
          day: dayName,
          areaChecks: rows,
          supervisorName,
          comments,
          correctiveAction,
        }),
      });
      if (res.ok) {
        const saved: EntryType = await res.json();
        const withSubmitter = { ...saved, submittedBy: { name: userName } };

        if (editingId) {
          setTodayEntries((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setHistory((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setAlert({ type: "success", msg: "✅ Oreta Shop Cleaning report updated!" });
        } else {
          setTodayEntries((prev) => [withSubmitter, ...prev]);
          setHistory((prev) => [withSubmitter, ...prev]);
          setAlert({
            type: "success",
            msg: `✅ New Shop Cleaning report recorded at ${new Date(saved.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}!`,
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
  const activeShiftsList = activeShift === "all" ? SHIFT_KEYS : [activeShift];

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🧹 Oreta World Shop Cleaning</h1>
          <p>4-Shift Daily Hygiene Checklist (12 Areas) — {todayLabel}</p>
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
                {editingId ? "✏️ Edit Shop Cleaning Report" : "➕ New Shop Cleaning Submission"}
              </div>
            </div>

            {/* Shift Selector Pills */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button
                type="button"
                className={`btn btn-sm ${activeShift === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveShift("all")}
              >
                📋 All 4 Shifts
              </button>
              {SHIFT_KEYS.map((key) => {
                const info = SHIFT_INFO[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-sm ${activeShift === key ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveShift(key)}
                  >
                    {info.icon} {info.label} ({info.time})
                  </button>
                );
              })}
            </div>

            {/* 1-Tap Quick Action Bar */}
            <div className="quick-action-bar">
              <span>⚡ 1-Tap Quick Actions:</span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => markAllYes(activeShift === "all" ? undefined : activeShift)}
              >
                ✅ Mark {activeShift === "all" ? "All Shifts" : SHIFT_INFO[activeShift].label} YES
              </button>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.72rem" }}>👤 Assign:</span>
                <select
                  value=""
                  onChange={(e) => assignAllTo(e.target.value, activeShift === "all" ? undefined : activeShift)}
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
                    <th style={{ width: "35%" }}>Area / Facility Zone</th>
                    {activeShiftsList.map((s) => (
                      <th key={s} style={{ width: activeShiftsList.length === 1 ? "65%" : "220px" }}>
                        {SHIFT_INFO[s].icon} {SHIFT_INFO[s].label} ({SHIFT_INFO[s].time})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const areaDef = ORETA_HYGIENE_AREAS.find((a) => a.id === row.id);
                    const assigned = areaDef?.assignedStaff || ["Rameshwar"];

                    return (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>
                            <span>{row.area}</span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--accent)", marginTop: "2px", fontWeight: 600 }}>
                            Assigned: {assigned.join(" or ")}
                          </div>
                        </td>

                        {activeShiftsList.map((s) => {
                          const check = row[s];
                          const isMorningDisabled = s === "morning" && areaDef?.morningDisabled;

                          if (isMorningDisabled) {
                            return (
                              <td key={s} style={{ verticalAlign: "middle" }}>
                                <span className="badge" style={{ background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                  ⚪ N/A (Afternoon only)
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={s} style={{ verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%" }}>
                                <div className="touch-btn-toggle">
                                  <button
                                    type="button"
                                    className={`touch-btn-option ${check.status === "YES" ? "active-yes" : ""}`}
                                    onClick={() => updateCheck(row.id, s, "status", "YES")}
                                  >
                                    ✓ YES
                                  </button>
                                  <button
                                    type="button"
                                    className={`touch-btn-option ${check.status === "NO" ? "active-no" : ""}`}
                                    onClick={() => updateCheck(row.id, s, "status", "NO")}
                                  >
                                    ✕ NO
                                  </button>
                                  <button
                                    type="button"
                                    className={`touch-btn-option ${check.status === "N/A" ? "active-na" : ""}`}
                                    onClick={() => updateCheck(row.id, s, "status", "N/A")}
                                  >
                                    N/A
                                  </button>
                                </div>

                                <div style={{ display: "flex", gap: "0.3rem", width: "100%" }}>
                                  <select
                                    value={check.staff}
                                    onChange={(e) => updateCheck(row.id, s, "staff", e.target.value)}
                                    style={{ flex: 1, fontSize: "0.78rem", minHeight: "36px", fontWeight: 600 }}
                                  >
                                    <optgroup label="Assigned Staff">
                                      {assigned.map((st) => (
                                        <option key={st} value={st}>{st}</option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="Other Staff">
                                      {ORETA_STAFF.filter((st) => !assigned.includes(st)).map((st) => (
                                        <option key={st} value={st}>{st}</option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
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
                <label>Daily Hygiene Remarks</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. All 4 shifts completed; kitchen and store clean."
                  rows={2}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Corrective Actions</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Evening outdoor floor washed twice due to heavy footfall."
                  rows={2}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "⏳ Saving..." : editingId ? "💾 Update Shop Cleaning Report" : "💾 Submit Shop Cleaning Report"}
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
          <div className="card-title">🕒 Oreta Shop Cleaning History Log</div>
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
            <div className="empty-state-icon">🧹</div>
            <p>No shop cleaning records found for {selectedDate}.</p>
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
                    <strong>📅 {entry.date} ({entry.day})</strong> · Submitted by <strong>{entry.submittedBy?.name || "Admin"}</strong>
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
