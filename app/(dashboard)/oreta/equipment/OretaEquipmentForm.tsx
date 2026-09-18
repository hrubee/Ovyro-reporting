"use client";
import React, { useState } from "react";
import { ORETA_EQUIPMENT_ITEMS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface EquipmentCheck {
  id: number;
  equipment: string;
  category: string;
  yesNo: string;
  time: string;
  name: string;
}

interface EntryType {
  id: string;
  date: string;
  equipmentChecks: string;
  supervisorName: string;
  comments: string;
  correctiveAction: string;
  submittedBy: { name: string };
  createdAt: string;
}

interface Props {
  today: string;
  todayLabel: string;
  todayEntries: EntryType[];
  history: EntryType[];
  userName: string;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function OretaEquipmentForm({
  today,
  todayLabel,
  todayEntries: initialTodayEntries,
  history: initialHistory,
  userName,
}: Props) {
  const init: EquipmentCheck[] = ORETA_EQUIPMENT_ITEMS.map((item) => ({
    id: item.id,
    equipment: item.name,
    category: item.category,
    yesNo: "",
    time: "",
    name: item.defaultCleanedBy,
  }));

  const [todayEntries, setTodayEntries] = useState<EntryType[]>(initialTodayEntries);
  const [history, setHistory] = useState<EntryType[]>(initialHistory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialTodayEntries.length === 0);

  const [checks, setChecks] = useState<EquipmentCheck[]>(init);
  const [supervisorName, setSupervisorName] = useState(SUPERVISORS[0] || "Aboli Wagh");
  const [comments, setComments] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);

  const categories = Array.from(new Set(ORETA_EQUIPMENT_ITEMS.map((i) => i.category)));

  function startNewSubmission() {
    setEditingId(null);
    setChecks(init);
    setSupervisorName(SUPERVISORS[0] || "Aboli Wagh");
    setComments("");
    setCorrectiveAction("");
    setIsEditing(true);
    setAlert(null);
  }

  function startEditSubmission(entry: EntryType) {
    setEditingId(entry.id);
    try {
      const parsed = JSON.parse(entry.equipmentChecks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Normalize fields strictly matching active ORETA_EQUIPMENT_ITEMS
        const normalized = ORETA_EQUIPMENT_ITEMS.map((itemDef) => {
          const matched = parsed.find(
            (p: any) =>
              (p.equipment && p.equipment.toLowerCase() === itemDef.name.toLowerCase()) ||
              (p.name && p.name.toLowerCase() === itemDef.name.toLowerCase()) ||
              (itemDef.name === "Ice tea machine" && (p.equipment === "Iced machine" || p.name === "Iced machine")) ||
              p.id === itemDef.id
          );
          return {
            id: itemDef.id,
            equipment: itemDef.name,
            category: itemDef.category,
            yesNo: matched ? (matched.yesNo || matched.status || "") : "",
            time: matched ? (matched.time || "") : "",
            name: matched ? (matched.name || matched.cleanedBy || itemDef.defaultCleanedBy) : itemDef.defaultCleanedBy,
          };
        });
        setChecks(normalized);
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

  function update(idx: number, field: keyof EquipmentCheck, value: string | number) {
    const copy = [...checks];
    copy[idx] = { ...copy[idx], [field]: value };
    setChecks(copy);
  }

  function markAllYes() {
    const timeNow = getCurrentTimeString();
    setChecks((prev) =>
      prev.map((c) => {
        if (activeCategory === "all" || c.category === activeCategory) {
          return { ...c, yesNo: "YES", time: c.time || timeNow };
        }
        return c;
      })
    );
  }

  function setAllCurrentTime() {
    const timeNow = getCurrentTimeString();
    setChecks((prev) =>
      prev.map((c) => {
        if (activeCategory === "all" || c.category === activeCategory) {
          return { ...c, time: timeNow };
        }
        return c;
      })
    );
  }

  function assignAllTo(name: string) {
    if (!name) return;
    setChecks((prev) =>
      prev.map((c) => {
        if (activeCategory === "all" || c.category === activeCategory) {
          return { ...c, name };
        }
        return c;
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/entries/oreta-equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          date: today,
          equipmentChecks: checks,
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
          setAlert({ type: "success", msg: "✅ Equipment Cleaning report updated!" });
        } else {
          setTodayEntries((prev) => [withSubmitter, ...prev]);
          setHistory((prev) => [withSubmitter, ...prev]);
          setAlert({
            type: "success",
            msg: `✅ New Equipment report recorded at ${new Date(saved.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}!`,
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

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>⚙️ Oreta World Equipment Cleaning</h1>
          <p>{ORETA_EQUIPMENT_ITEMS.length}-Item Kitchen, Beverage, Prep, Display & Facility Log — {todayLabel}</p>
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
                {editingId ? "✏️ Edit Oreta Equipment Report" : "➕ New Equipment Submission"}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <button
                type="button"
                className={`btn btn-sm ${activeCategory === "all" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveCategory("all")}
              >
                All (41)
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm ${activeCategory === cat ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
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
                    <th style={{ width: "35%" }}>Equipment / Item</th>
                    <th style={{ width: "170px" }}>Status</th>
                    <th style={{ width: "130px" }}>Time</th>
                    <th>Cleaned By</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((row, idx) => {
                    if (activeCategory !== "all" && row.category !== activeCategory) {
                      return null;
                    }

                    return (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div>
                            <span>{row.equipment}</span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                              ({row.category})
                            </span>
                          </div>
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
                            value={row.name}
                            onChange={(e) => update(idx, "name", e.target.value)}
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
                </tbody>
              </table>
            </div>

            <div className="form-grid" style={{ marginTop: "1.25rem" }}>
              <div className="form-group">
                <label>Supervisor Verification</label>
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
                  placeholder="Any equipment remarks or cleaning observations..."
                  rows={2}
                />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Corrective Action (if required)</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="Actions taken for items needing repair or maintenance..."
                  rows={2}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "⏳ Saving..." : editingId ? "💾 Update Oreta Equipment Report" : "💾 Submit Oreta Equipment Report"}
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
          <div className="card-title">🕒 Oreta Equipment History Log</div>
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
            <div className="empty-state-icon">📋</div>
            <p>No equipment submissions found for {selectedDate}.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {selectedDateEntries.map((entry) => {
              let parsed: EquipmentCheck[] = [];
              try { parsed = JSON.parse(entry.equipmentChecks); } catch {}
              return (
                <div
                  key={entry.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "1rem",
                    background: "var(--bg-input)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div>
                      <strong>📅 {entry.date}</strong> · Submitted by <strong>{entry.submittedBy?.name || "Admin"}</strong>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Supervisor: <strong>{entry.supervisorName || "—"}</strong>
                    </div>
                  </div>
                  {entry.comments && (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      💬 <em>&ldquo;{entry.comments}&rdquo;</em>
                    </div>
                  )}
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Total Items Checked: {parsed.length}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
