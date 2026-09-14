"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORETA_HYGIENE_AREAS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface ShiftCheck {
  status: "YES" | "NO" | "N/A";
  staff: string;
  time: string;
}

interface AreaRow {
  id: number;
  area: string;
  morning: ShiftCheck;
  afternoon: ShiftCheck;
  evening: ShiftCheck;
  night: ShiftCheck;
}

interface ExistingEntry {
  id: string;
  date: string;
  day: string;
  supervisorName: string;
  comments: string;
  correctiveAction: string;
  areaChecks: string;
  submittedBy: { name: string; email: string };
  createdAt: string;
}

interface OretaHygieneFormProps {
  initialDate: string;
  initialDay: string;
  existingEntry: ExistingEntry | null;
  currentUser: { id: string; name: string; role: string };
}

const SHIFT_KEYS = ["morning", "afternoon", "evening", "night"] as const;
type ShiftKey = typeof SHIFT_KEYS[number];

const SHIFT_LABELS: Record<ShiftKey, { label: string; icon: string; time: string }> = {
  morning: { label: "Morning", icon: "🌅", time: "09:00" },
  afternoon: { label: "Afternoon", icon: "☀️", time: "14:00" },
  evening: { label: "Evening", icon: "🌆", time: "18:30" },
  night: { label: "Night", icon: "🌙", time: "22:00" },
};

function normalizeStaffName(raw: string, defaultStaff: string): string {
  if (!raw) return defaultStaff;
  const upper = raw.toUpperCase().trim();
  if (upper.includes("RAMESHWAR")) return "Rameshwar";
  if (upper.includes("BHARTI")) return "Bharti";
  if (upper.includes("MANGLA")) return "Mangla";
  if (upper.includes("ARZAAAN")) return "Arzaaan";
  if (upper.includes("NEW")) return "New Staff";
  if (upper === "—" || upper === "-") return "—";
  return raw;
}

export default function OretaHygieneForm({
  initialDate,
  initialDay,
  existingEntry,
  currentUser,
}: OretaHygieneFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [day, setDay] = useState(initialDay);
  const [activeShiftTab, setActiveShiftTab] = useState<ShiftKey | "all">("all");

  const buildInitialRows = (): AreaRow[] => {
    if (existingEntry?.areaChecks) {
      try {
        const parsed = JSON.parse(existingEntry.areaChecks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r) => {
            const areaDef = ORETA_HYGIENE_AREAS.find((a) => a.id === r.id);
            const defStaff = areaDef?.defaultStaff || "Rameshwar";
            return {
              ...r,
              morning: {
                ...r.morning,
                staff: normalizeStaffName(r.morning?.staff, areaDef?.morningDisabled ? "—" : defStaff),
              },
              afternoon: {
                ...r.afternoon,
                staff: normalizeStaffName(r.afternoon?.staff, defStaff),
              },
              evening: {
                ...r.evening,
                staff: normalizeStaffName(r.evening?.staff, defStaff),
              },
              night: {
                ...r.night,
                staff: normalizeStaffName(r.night?.staff, defStaff),
              },
            };
          });
        }
      } catch {
        // fallback
      }
    }

    return ORETA_HYGIENE_AREAS.map((item) => ({
      id: item.id,
      area: item.area,
      morning: {
        status: item.morningDisabled ? "N/A" : "YES",
        staff: item.morningDisabled ? "—" : item.defaultStaff,
        time: "09:00",
      },
      afternoon: {
        status: "YES",
        staff: item.defaultStaff,
        time: "14:00",
      },
      evening: {
        status: "YES",
        staff: item.defaultStaff,
        time: "18:30",
      },
      night: {
        status: "YES",
        staff: item.defaultStaff,
        time: "22:00",
      },
    }));
  };

  const [rows, setRows] = useState<AreaRow[]>(buildInitialRows);
  const [supervisorName, setSupervisorName] = useState(
    existingEntry?.supervisorName || SUPERVISORS[0]
  );
  const [comments, setComments] = useState(existingEntry?.comments || "");
  const [correctiveAction, setCorrectiveAction] = useState(
    existingEntry?.correctiveAction || ""
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const d = new Date(newDate + "T00:00:00");
    const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
    setDay(dayName);
    router.push(`/oreta/hygiene?date=${newDate}`);
  };

  const updateShiftCheck = (
    rowId: number,
    shift: ShiftKey,
    field: keyof ShiftCheck,
    value: string
  ) => {
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
  };

  const setAllStatus = (status: "YES" | "NO" | "N/A", shift?: ShiftKey) => {
    setRows((prev) =>
      prev.map((r) => {
        if (shift) {
          return {
            ...r,
            [shift]: { ...r[shift], status },
          };
        }
        return {
          ...r,
          morning: { ...r.morning, status: r.morning.staff === "—" ? "N/A" : status },
          afternoon: { ...r.afternoon, status },
          evening: { ...r.evening, status },
          night: { ...r.night, status },
        };
      })
    );
  };

  const autoFillStaff = () => {
    const staffName = currentUser.name || "Staff";
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        morning: { ...r.morning, staff: r.morning.staff === "—" ? "—" : staffName },
        afternoon: { ...r.afternoon, staff: staffName },
        evening: { ...r.evening, staff: staffName },
        night: { ...r.night, staff: staffName },
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSaveSuccess(false);

    startTransition(async () => {
      try {
        const payload = {
          date,
          day,
          areaChecks: JSON.stringify(rows),
          supervisorName,
          comments,
          correctiveAction,
        };

        const res = await fetch("/api/entries/oreta-hygiene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to submit checklist");
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
        router.refresh();
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  // Completion calculation
  let totalChecks = 0;
  let passedChecks = 0;
  rows.forEach((r) => {
    SHIFT_KEYS.forEach((s) => {
      totalChecks++;
      if (r[s].status === "YES" || r[s].status === "N/A") passedChecks++;
    });
  });
  const complianceScore = Math.round((passedChecks / totalChecks) * 100);

  return (
    <form onSubmit={handleSubmit} className="fade-in">
      {/* Top Date & Submission Status Bar */}
      <div className="form-card" style={{ marginBottom: "1.25rem" }}>
        <div className="date-nav">
          <div className="date-nav-controls">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const d = new Date(date + "T00:00:00");
                d.setDate(d.getDate() - 1);
                handleDateChange(d.toISOString().split("T")[0]);
              }}
            >
              ← Prev
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="form-control"
              style={{ width: "auto", fontWeight: 700 }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const d = new Date(date + "T00:00:00");
                d.setDate(d.getDate() + 1);
                handleDateChange(d.toISOString().split("T")[0]);
              }}
            >
              Next →
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleDateChange(new Date().toISOString().split("T")[0])}
            >
              Today
            </button>
          </div>

          <div
            className={`submission-banner ${existingEntry ? "submitted" : "pending"}`}
            style={{ margin: 0 }}
          >
            <span className="banner-dot" />
            <span>
              {existingEntry
                ? `Submitted by ${existingEntry.submittedBy.name} (${new Date(
                    existingEntry.createdAt
                  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
                : "Not Submitted Yet Today"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Bar & Shift Filter */}
      <div className="form-card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
          {/* Shift Filter Pills */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeShiftTab === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveShiftTab("all")}
            >
              📋 All 4 Shifts
            </button>
            {SHIFT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm ${activeShiftTab === key ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActiveShiftTab(key)}
              >
                {SHIFT_LABELS[key].icon} {SHIFT_LABELS[key].label}
              </button>
            ))}
          </div>

          {/* 1-Tap Batch Helpers */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllStatus("YES", activeShiftTab === "all" ? undefined : activeShiftTab)}
              title="Set all visible items to YES"
            >
              ⚡ Set All YES
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={autoFillStaff}
              title="Assign my name to all shifts"
            >
              👤 Fill My Name
            </button>
          </div>
        </div>
      </div>

      {/* Checklist Cards / Grid */}
      <div className="table-wrapper" style={{ marginBottom: "1.5rem" }}>
        <div className="table-header-title">
          <span>🧹 Oreta World Daily Hygiene & Cleaning Checklist</span>
          <span className="badge badge-blue">12 Areas · 4 Shifts · Compliance {complianceScore}%</span>
        </div>

        <table className="checklist-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th style={{ minWidth: "180px" }}>Area / Location</th>
              {(activeShiftTab === "all" || activeShiftTab === "morning") && (
                <th style={{ minWidth: "220px" }}>🌅 Morning (09:00)</th>
              )}
              {(activeShiftTab === "all" || activeShiftTab === "afternoon") && (
                <th style={{ minWidth: "220px" }}>☀️ Afternoon (14:00)</th>
              )}
              {(activeShiftTab === "all" || activeShiftTab === "evening") && (
                <th style={{ minWidth: "220px" }}>🌆 Evening (18:30)</th>
              )}
              {(activeShiftTab === "all" || activeShiftTab === "night") && (
                <th style={{ minWidth: "220px" }}>🌙 Night (22:00)</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const areaDef = ORETA_HYGIENE_AREAS.find((a) => a.id === row.id);
              const assigned = areaDef?.assignedStaff || [];
              const otherStaff = ORETA_STAFF.filter((s) => !assigned.includes(s));

              return (
                <tr key={row.id}>
                  <td className="item-cell" style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                    {row.id}
                  </td>
                  <td className="item-cell">
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{row.area}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--accent)", marginTop: "2px", fontWeight: 600 }}>
                      Assigned: {assigned.join(" or ")}
                    </div>
                  </td>

                  {SHIFT_KEYS.filter((s) => activeShiftTab === "all" || activeShiftTab === s).map(
                    (shift) => {
                      const check = row[shift];
                      const isMorningDisabled = shift === "morning" && areaDef?.morningDisabled;

                      return (
                        <td key={shift} className="touch-cell" style={{ verticalAlign: "top" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {/* 1-Tap Toggle */}
                            <div className="touch-toggle-group">
                              <button
                                type="button"
                                className={`touch-btn-option ${check.status === "YES" ? "active-yes" : ""}`}
                                onClick={() => updateShiftCheck(row.id, shift, "status", "YES")}
                              >
                                ✓ YES
                              </button>
                              <button
                                type="button"
                                className={`touch-btn-option ${check.status === "NO" ? "active-no" : ""}`}
                                onClick={() => updateShiftCheck(row.id, shift, "status", "NO")}
                              >
                                ✕ NO
                              </button>
                              <button
                                type="button"
                                className={`touch-btn-option ${check.status === "N/A" ? "active-na" : ""}`}
                                onClick={() => updateShiftCheck(row.id, shift, "status", "N/A")}
                              >
                                N/A
                              </button>
                            </div>

                            {/* Staff Dropdown Selector */}
                            <select
                              value={check.staff}
                              onChange={(e) => updateShiftCheck(row.id, shift, "staff", e.target.value)}
                              className="form-control"
                              style={{
                                fontSize: "0.78rem",
                                padding: "0.25rem 0.4rem",
                                height: "30px",
                                fontWeight: 600,
                                background: "#ffffff",
                              }}
                            >
                              {isMorningDisabled && <option value="—">— Not Applicable</option>}
                              <optgroup label="Assigned Floor Staff (Choose Either)">
                                {assigned.map((emp) => (
                                  <option key={emp} value={emp}>
                                    👤 {emp}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Other Staff">
                                {otherStaff.map((emp) => (
                                  <option key={emp} value={emp}>
                                    {emp}
                                  </option>
                                ))}
                                {!isMorningDisabled && <option value="—">— None / Other</option>}
                              </optgroup>
                            </select>
                          </div>
                        </td>
                      );
                    }
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Supervisor Verification & Notes */}
      <div className="form-card" style={{ marginBottom: "5rem" }}>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Supervisor / Verifier Name</label>
            <select
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="form-control"
            >
              {SUPERVISORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {ORETA_STAFF.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Comments / Floor Observations</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. All counters wiped and disinfected before lunch rush..."
              rows={2}
              className="form-control"
            />
          </div>

          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Corrective Actions Taken (if any NO)</label>
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="e.g. Washing vessels area re-cleaned at 19:00..."
              rows={2}
              className="form-control"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="error-banner" style={{ marginTop: "1rem" }}>
            ⚠️ {errorMsg}
          </div>
        )}
        {saveSuccess && (
          <div className="success-banner" style={{ marginTop: "1rem" }}>
            ✓ Oreta World Hygiene SOP successfully saved and submitted!
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setRows(buildInitialRows())}
          disabled={isPending}
        >
          Reset
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={isPending}
          style={{ minWidth: "200px" }}
        >
          {isPending ? "Submitting..." : existingEntry ? "Update Oreta SOP" : "Submit Oreta SOP"}
        </button>
      </div>
    </form>
  );
}
