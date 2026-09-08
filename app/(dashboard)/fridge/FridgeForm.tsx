"use client";
import React, { useState } from "react";
import { SUPERVISORS } from "@/lib/permissions";

interface FridgeItem {
  zone: string;
  productName: string;
  machineNumber: string;
  referenceTemp: string;
}

interface FridgeCheck extends FridgeItem {
  actualTempMorning: string;
  actualTempEvening: string;
  isNA?: boolean;
}

interface FridgeEntryType {
  id: string;
  date: string;
  supervisedBy: string;
  fridgeChecks: string;
  hygiene: string;
  comments: string;
  correctiveAction: string;
  submittedBy: { name: string };
  createdAt: string;
}

interface Props {
  items: FridgeItem[];
  today: string;
  todayLabel: string;
  todayEntries: FridgeEntryType[];
  history: FridgeEntryType[];
  userName: string;
}

const CHILLER_TEMPS = ["N/A", "+3.0°C", "+3.5°C", "+4.0°C", "+4.5°C", "+5.0°C", "+5.5°C", "+6.0°C", "+6.5°C", "+7.0°C", "+8.0°C"];
const FREEZER_TEMPS = ["N/A", "-15.0°C", "-15.5°C", "-16.0°C", "-16.5°C", "-17.0°C", "-17.5°C", "-18.0°C", "-18.5°C", "-19.0°C"];

export default function FridgeForm({
  items,
  today,
  todayLabel,
  todayEntries: initialTodayEntries,
  history: initialHistory,
  userName,
}: Props) {
  const init: FridgeCheck[] = items.map((i) => ({
    ...i,
    actualTempMorning: "",
    actualTempEvening: "",
    isNA: false,
  }));

  const [todayEntries, setTodayEntries] = useState<FridgeEntryType[]>(initialTodayEntries);
  const [history, setHistory] = useState<FridgeEntryType[]>(initialHistory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialTodayEntries.length === 0);

  const [checks, setChecks] = useState<FridgeCheck[]>(init);
  const [supervisedBy, setSupervisedBy] = useState("Aboli Wagh");
  const [hygiene, setHygiene] = useState("Good");
  const [comments, setComments] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);

  function startNewSubmission() {
    setEditingId(null);
    setChecks(init);
    setSupervisedBy("Aboli Wagh");
    setHygiene("Good");
    setComments("");
    setCorrectiveAction("");
    setIsEditing(true);
    setAlert(null);
  }

  function startEditSubmission(entry: FridgeEntryType) {
    setEditingId(entry.id);
    const parsedChecks: FridgeCheck[] = JSON.parse(entry.fridgeChecks).map((c: FridgeCheck) => ({
      ...c,
      isNA: c.actualTempMorning === "N/A" && c.actualTempEvening === "N/A",
    }));
    setChecks(parsedChecks);
    setSupervisedBy(entry.supervisedBy || "Aboli Wagh");
    setHygiene(entry.hygiene || "Good");
    setComments(entry.comments || "");
    setCorrectiveAction(entry.correctiveAction || "");
    setIsEditing(true);
    setAlert(null);
  }

  function toggleNA(idx: number) {
    const copy = [...checks];
    const target = copy[idx];
    const newNA = !target.isNA;
    target.isNA = newNA;
    if (newNA) {
      target.actualTempMorning = "N/A";
      target.actualTempEvening = "N/A";
    } else {
      target.actualTempMorning = "";
      target.actualTempEvening = "";
    }
    setChecks(copy);
  }

  function updateTemp(idx: number, field: "actualTempMorning" | "actualTempEvening", val: string) {
    const copy = [...checks];
    copy[idx] = { ...copy[idx], [field]: val };
    if (val !== "N/A") {
      copy[idx].isNA = false;
    }
    setChecks(copy);
  }

  function setAllWorkingTemps(morning: boolean) {
    const copy = checks.map((c) => {
      if (c.isNA) return c;
      const isFreezer = c.zone.includes("FREEZER");
      const defaultVal = isFreezer ? "-18.0°C" : "+4.5°C";
      return {
        ...c,
        [morning ? "actualTempMorning" : "actualTempEvening"]: defaultVal,
      };
    });
    setChecks(copy);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/entries/fridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          date: today,
          supervisedBy,
          fridgeChecks: checks,
          hygiene,
          comments,
          correctiveAction,
        }),
      });
      if (res.ok) {
        const saved: FridgeEntryType = await res.json();
        const withSubmitter = { ...saved, submittedBy: { name: userName } };

        if (editingId) {
          setTodayEntries((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setHistory((prev) => prev.map((e) => (e.id === editingId ? withSubmitter : e)));
          setAlert({ type: "success", msg: "✅ Fridge Report updated!" });
        } else {
          setTodayEntries((prev) => [withSubmitter, ...prev]);
          setHistory((prev) => [withSubmitter, ...prev]);
          setAlert({
            type: "success",
            msg: `✅ New Fridge Report recorded at ${new Date(saved.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}!`,
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
  const zones = [...new Set(checks.map((c) => c.zone))];

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🧊 Fridge Temperature Report</h1>
          <p>Refrigerator & Freezer Dynamic Inventory Log — {todayLabel}</p>
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
                    <span>Supervisor: <strong>{entry.supervisedBy || "Aboli Wagh"}</strong></span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    ⏰ {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    {entry.hygiene && ` • Hygiene: ${entry.hygiene}`}
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
                {editingId ? "✏️ Edit Temperature Reading" : "➕ New Temperature Reading"}
              </div>
              <div className="form-group" style={{ minWidth: 220 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Supervised By</label>
                <select
                  value={supervisedBy}
                  onChange={(e) => setSupervisedBy(e.target.value)}
                  style={{ fontWeight: 600, color: "var(--accent)" }}
                >
                  {SUPERVISORS.map((sup) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick 1-Tap Preset Bar */}
            <div className="quick-action-bar">
              <span>⚡ 1-Tap Quick Actions:</span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setAllWorkingTemps(true)}
              >
                ☀️ Set Morning Normals (+4.5°C / -18°C)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setAllWorkingTemps(false)}
              >
                🌙 Set Evening Normals (+5.0°C / -18°C)
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="checklist-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Product / Machine</th>
                    <th style={{ width: "20%" }}>Status</th>
                    <th style={{ width: "22%" }}>☀️ Morning Temp</th>
                    <th style={{ width: "22%" }}>🌙 Evening Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => (
                    <React.Fragment key={`zone-group-${zone}`}>
                      <tr className="zone-row">
                        <td colSpan={4}>{zone}</td>
                      </tr>
                      {checks.map((row, idx) => {
                        if (row.zone !== zone) return null;
                        const isFreezer = row.zone.includes("FREEZER");
                        const options = isFreezer ? FREEZER_TEMPS : CHILLER_TEMPS;

                        return (
                          <tr key={idx} className={row.isNA ? "row-na" : ""}>
                            <td style={{ fontWeight: 600 }}>
                              <span>{row.productName} #{row.machineNumber}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--accent)", background: "rgba(120,53,15,0.09)", padding: "2px 8px", borderRadius: "99px", fontWeight: 600 }}>
                                {row.referenceTemp}
                              </span>
                            </td>
                            <td style={{ display: "none" }}>{row.machineNumber}</td>
                            <td style={{ display: "none" }}>{row.referenceTemp}</td>
                            <td>
                              <button
                                type="button"
                                className={`na-toggle-btn ${row.isNA ? "is-na" : ""}`}
                                onClick={() => toggleNA(idx)}
                                style={{ width: "100%", padding: "0.45rem", fontSize: "0.78rem" }}
                              >
                                {row.isNA ? "⚪ Standby / Extra (N/A)" : "🟢 Working / In Use"}
                              </button>
                            </td>
                            <td>
                              {row.isNA ? (
                                <div style={{ width: "100%", textAlign: "center", padding: "0.4rem", background: "#f5f2ec", borderRadius: "6px", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>
                                  Powered Down / Not in Use
                                </div>
                              ) : (
                                <div className="temp-touch-box">
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px", display: "block", fontWeight: 600 }}>
                                      ☀️ Morning Temp
                                    </label>
                                    <select
                                      value={row.actualTempMorning}
                                      onChange={(e) => updateTemp(idx, "actualTempMorning", e.target.value)}
                                    >
                                      <option value="">Select Temp</option>
                                      {options.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td>
                              {row.isNA ? null : (
                                <div className="temp-touch-box">
                                  <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px", display: "block", fontWeight: 600 }}>
                                      🌙 Evening Temp
                                    </label>
                                    <select
                                      value={row.actualTempEvening}
                                      onChange={(e) => updateTemp(idx, "actualTempEvening", e.target.value)}
                                    >
                                      <option value="">Select Temp</option>
                                      {options.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-grid" style={{ marginTop: "1.25rem" }}>
              <div className="form-group">
                <label>Hygiene Status</label>
                <select value={hygiene} onChange={(e) => setHygiene(e.target.value)}>
                  <option value="Good">🟢 Good / Normal</option>
                  <option value="Cleaned & Sanitized">✨ Cleaned & Sanitized</option>
                  <option value="Defrosted">🧊 Ice Defrosted</option>
                  <option value="Under Maintenance">⚠️ Under Maintenance</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. 3 main fridges running, 2 standby fridges powered off..."
                />
              </div>
              <div className="form-group">
                <label>Corrective Action</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="Corrective actions taken..."
                />
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "⏳ Saving..." : editingId ? "💾 Update Report" : "💾 Save & Record Report"}
            </button>
            {todayEntries.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* HISTORY */}
      <div className="history-section" style={{ marginTop: "2rem" }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📆 Submission History (Date-wise)</div>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.4rem 0.6rem",
                color: "var(--text-primary)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
          </div>
          {selectedDate !== today && selectedDateEntries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p className="text-sm text-muted">
                Found {selectedDateEntries.length} submission(s) for {selectedDate}:
              </p>
              {selectedDateEntries.map((entry, idx) => {
                const fchecks: FridgeCheck[] = JSON.parse(entry.fridgeChecks);
                return (
                  <div
                    key={entry.id}
                    style={{
                      background: "var(--bg-input)",
                      borderRadius: "8px",
                      padding: "1rem",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        Submission #{selectedDateEntries.length - idx} by{" "}
                        <strong style={{ color: "var(--text-primary)" }}>{entry.submittedBy?.name}</strong>
                      </div>
                      <span className="badge badge-submitted">
                        ⏰ {new Date(entry.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table className="checklist-table">
                        <thead><tr><th>Product</th><th>#</th><th>Ref</th><th>Morning</th><th>Evening</th></tr></thead>
                        <tbody>
                          {fchecks.map((r, i) => (
                            <tr key={i}>
                              <td>{r.productName}</td>
                              <td>{r.machineNumber}</td>
                              <td><span style={{ fontSize: "0.78rem", color: "var(--accent)" }}>{r.referenceTemp}</span></td>
                              <td>{r.actualTempMorning || "—"}</td>
                              <td>{r.actualTempEvening || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Time</th><th>Supervised By</th><th>Submitted By</th><th>Status</th></tr></thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>No entries yet.</td></tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} style={{ cursor: "pointer" }} onClick={() => setSelectedDate(h.date)}>
                        <td>{h.date}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                          {new Date(h.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td>{h.supervisedBy || "—"}</td>
                        <td style={{ fontWeight: 500 }}>{h.submittedBy?.name || "—"}</td>
                        <td><span className="badge badge-submitted">Recorded</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
