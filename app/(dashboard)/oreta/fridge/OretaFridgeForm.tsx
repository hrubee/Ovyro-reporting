"use client";
import React, { useState } from "react";
import { ORETA_FRIDGE_ITEMS } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface FridgeCheck {
  id: number;
  section: "Kitchen" | "Cake Display";
  productName: string;
  machineNumber: string;
  referenceTemp: string;
  actualTempMorning: string;
  actualTempEvening: string;
  isNA?: boolean;
}

interface FridgeEntryType {
  id: string;
  date: string;
  supervisorName: string;
  fridgeChecks: string;
  hygiene: string;
  comments: string;
  correctiveAction: string;
  submittedBy: { name: string };
  createdAt: string;
}

interface Props {
  today: string;
  todayLabel: string;
  todayEntries: FridgeEntryType[];
  history: FridgeEntryType[];
  userName: string;
}

const CHILLER_TEMPS = ["N/A", "+3.0°C", "+3.5°C", "+4.0°C", "+4.5°C", "+5.0°C", "+5.5°C", "+6.0°C", "+6.5°C", "+7.0°C", "+8.0°C"];
const FREEZER_TEMPS = ["N/A", "-15.0°C", "-15.5°C", "-16.0°C", "-16.5°C", "-17.0°C", "-17.5°C", "-18.0°C", "-18.5°C", "-19.0°C"];
const CAKE_TEMPS = ["N/A", "+2.0°C", "+3.0°C", "+4.0°C", "+5.0°C", "+6.0°C", "+7.0°C", "+8.0°C", "+9.0°C", "+10.0°C"];

export default function OretaFridgeForm({
  today,
  todayLabel,
  todayEntries: initialTodayEntries,
  history: initialHistory,
  userName,
}: Props) {
  const init: FridgeCheck[] = ORETA_FRIDGE_ITEMS.map((item) => ({
    id: item.id,
    section: item.section,
    productName: item.productName,
    machineNumber: item.machineNumber,
    referenceTemp: item.referenceTemp,
    actualTempMorning: "",
    actualTempEvening: "",
    isNA: false,
  }));

  const [todayEntries, setTodayEntries] = useState<FridgeEntryType[]>(initialTodayEntries);
  const [history, setHistory] = useState<FridgeEntryType[]>(initialHistory);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialTodayEntries.length === 0);

  const [checks, setChecks] = useState<FridgeCheck[]>(init);
  const [supervisorName, setSupervisorName] = useState(SUPERVISORS[0] || "Aboli Wagh");
  const [hygiene, setHygiene] = useState("Good");
  const [comments, setComments] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);

  function startNewSubmission() {
    setEditingId(null);
    setChecks(init);
    setSupervisorName(SUPERVISORS[0] || "Aboli Wagh");
    setHygiene("Good");
    setComments("");
    setCorrectiveAction("");
    setIsEditing(true);
    setAlert(null);
  }

  function startEditSubmission(entry: FridgeEntryType) {
    setEditingId(entry.id);
    try {
      const parsed = JSON.parse(entry.fridgeChecks);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setChecks(
          parsed.map((c: FridgeCheck, idx: number) => {
            const def = ORETA_FRIDGE_ITEMS[idx] || c;
            return {
              ...c,
              id: c.id || def.id,
              section: c.section || def.section,
              productName: c.productName || def.productName,
              machineNumber: c.machineNumber || def.machineNumber,
              referenceTemp: c.referenceTemp || def.referenceTemp,
              isNA: c.actualTempMorning === "N/A" && c.actualTempEvening === "N/A",
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
      target.actualTempMorning = target.section === "Cake Display" ? "+5.0°C" : target.productName.includes("FREEZER") ? "-18.0°C" : "+4.0°C";
      target.actualTempEvening = target.section === "Cake Display" ? "+5.5°C" : target.productName.includes("FREEZER") ? "-17.5°C" : "+4.5°C";
    }
    setChecks(copy);
  }

  function updateTemp(idx: number, field: "actualTempMorning" | "actualTempEvening", val: string) {
    const copy = [...checks];
    copy[idx] = { ...copy[idx], [field]: val };
    if (val !== "N/A" && val !== "") {
      copy[idx].isNA = false;
    }
    setChecks(copy);
  }

  function setAllNormalTemps(isMorning: boolean) {
    const copy = checks.map((c) => {
      if (c.isNA) return c;
      const isCake = c.section === "Cake Display";
      const isFreezer = c.productName.includes("FREEZER");
      const temp = isCake
        ? (isMorning ? "+5.0°C" : "+5.5°C")
        : isFreezer
        ? (isMorning ? "-18.0°C" : "-17.5°C")
        : (isMorning ? "+4.0°C" : "+4.5°C");

      return {
        ...c,
        [isMorning ? "actualTempMorning" : "actualTempEvening"]: temp,
      };
    });
    setChecks(copy);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch("/api/entries/oreta-fridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          date: today,
          supervisorName,
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
          setAlert({ type: "success", msg: "✅ Oreta Fridge report updated!" });
        } else {
          setTodayEntries((prev) => [withSubmitter, ...prev]);
          setHistory((prev) => [withSubmitter, ...prev]);
          setAlert({
            type: "success",
            msg: `✅ New Oreta Fridge report recorded at ${new Date(saved.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}!`,
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
  const sections = ["Kitchen", "Cake Display"] as const;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🧊 Oreta World Fridge & Display Temperature</h1>
          <p>Kitchen Cold Storage & Cake Display Counters (+2 to +10°C) — {todayLabel}</p>
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
                {editingId ? "✏️ Edit Oreta Fridge Report" : "➕ New Temperature Submission"}
              </div>
            </div>

            {/* 1-Tap Quick Action Bar */}
            <div className="quick-action-bar">
              <span>⚡ 1-Tap Quick Fill:</span>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAllNormalTemps(true)}>
                ⚡ Normal AM Temps
              </button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAllNormalTemps(false)}>
                ⚡ Normal PM Temps
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="checklist-table">
                <thead>
                  <tr>
                    <th style={{ width: "35%" }}>Cooling Unit / Counter</th>
                    <th style={{ width: "170px" }}>Morning (AM)</th>
                    <th style={{ width: "170px" }}>Evening (PM)</th>
                    <th style={{ width: "80px", textAlign: "center" }}>Standby</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((sec) => {
                    const secRows = checks.filter((c) => c.section === sec);
                    if (secRows.length === 0) return null;

                    return (
                      <React.Fragment key={sec}>
                        <tr className="zone-row">
                          <td colSpan={4}>
                            {sec === "Cake Display" ? "🎂 Cake Display Zone (+2 to +10°C)" : "🍳 Kitchen Zone"}
                          </td>
                        </tr>
                        {secRows.map((row) => {
                          const idx = checks.findIndex((c) => c.id === row.id);
                          const isCake = row.section === "Cake Display";
                          const isFreezer = row.productName.includes("FREEZER");
                          const presets = isCake ? CAKE_TEMPS : isFreezer ? FREEZER_TEMPS : CHILLER_TEMPS;

                          return (
                            <tr key={row.id}>
                              <td style={{ fontWeight: 600 }}>
                                <div>
                                  <span>{row.productName}</span>
                                  <span className="badge" style={{ fontSize: "0.7rem", marginLeft: "0.4rem", background: "var(--bg-primary)" }}>
                                    #{row.machineNumber}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: isCake ? "var(--accent)" : "var(--text-muted)", marginTop: "2px" }}>
                                  Ref: {row.referenceTemp}
                                </div>
                              </td>
                              <td>
                                <div className="temp-touch-box">
                                  <select
                                    value={row.actualTempMorning}
                                    onChange={(e) => updateTemp(idx, "actualTempMorning", e.target.value)}
                                    disabled={row.isNA}
                                    style={{
                                      background: row.isNA ? "var(--bg-primary)" : "var(--bg-card)",
                                      color: row.actualTempMorning.includes("-") ? "#6366f1" : "var(--text-primary)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <option value="">— Select AM —</option>
                                    {presets.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td>
                                <div className="temp-touch-box">
                                  <select
                                    value={row.actualTempEvening}
                                    onChange={(e) => updateTemp(idx, "actualTempEvening", e.target.value)}
                                    disabled={row.isNA}
                                    style={{
                                      background: row.isNA ? "var(--bg-primary)" : "var(--bg-card)",
                                      color: row.actualTempEvening.includes("-") ? "#6366f1" : "var(--text-primary)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <option value="">— Select PM —</option>
                                    {presets.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => toggleNA(idx)}
                                  className={`btn btn-xs ${row.isNA ? "btn-warning" : "btn-secondary"}`}
                                  style={{ minHeight: "36px", width: "100%" }}
                                >
                                  {row.isNA ? "OFF" : "ON"}
                                </button>
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
                <label>Overall Cold-Chain Hygiene</label>
                <select
                  value={hygiene}
                  onChange={(e) => setHygiene(e.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="Good">🟢 Good (All in standard range)</option>
                  <option value="Satisfactory">🟡 Satisfactory (Minor fluctuations)</option>
                  <option value="Needs Improvement">🔴 Needs Improvement / Service Req.</option>
                </select>
              </div>
              <div className="form-group">
                <label>Comments / Observations</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Cake display counter 1 steady at +4.5°C."
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Corrective Action (if any)</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Cleaned condenser coil and reset defrost timer."
                  rows={2}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "⏳ Saving..." : editingId ? "💾 Update Oreta Fridge Report" : "💾 Submit Oreta Fridge Report"}
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
          <div className="card-title">🕒 Oreta Temperature History Log</div>
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
            <div className="empty-state-icon">🧊</div>
            <p>No temperature records found for {selectedDate}.</p>
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
