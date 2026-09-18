"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORETA_EQUIPMENT_ITEMS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface EquipmentRow {
  id: number;
  name: string;
  category: string;
  status: "YES" | "NO" | "N/A";
  time: string;
  cleanedBy: string;
  checkedBy: string;
}

interface ExistingEntry {
  id: string;
  date: string;
  supervisorName: string;
  comments: string;
  correctiveAction: string;
  equipmentChecks: string;
  submittedBy: { name: string; email: string };
  createdAt: string;
}

interface Props {
  initialDate: string;
  existingEntry: ExistingEntry | null;
  currentUser: { id: string; name: string; role: string };
}

export default function OretaEquipmentForm({
  initialDate,
  existingEntry,
  currentUser,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const buildInitialRows = (): EquipmentRow[] => {
    if (existingEntry?.equipmentChecks) {
      try {
        const parsed = JSON.parse(existingEntry.equipmentChecks);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return ORETA_EQUIPMENT_ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      status: "YES",
      time: "11:00",
      cleanedBy: item.defaultCleanedBy,
      checkedBy: "Admin",
    }));
  };

  const [rows, setRows] = useState<EquipmentRow[]>(buildInitialRows);
  const [supervisorName, setSupervisorName] = useState(
    existingEntry?.supervisorName || SUPERVISORS[0]
  );
  const [comments, setComments] = useState(existingEntry?.comments || "");
  const [correctiveAction, setCorrectiveAction] = useState(
    existingEntry?.correctiveAction || ""
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = Array.from(new Set(ORETA_EQUIPMENT_ITEMS.map((i) => i.category)));

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/oreta/equipment?date=${newDate}`);
  };

  const updateRow = (id: number, field: keyof EquipmentRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const setAllStatus = (status: "YES" | "NO" | "N/A") => {
    setRows((prev) =>
      prev.map((r) => {
        if (activeCategory === "all" || r.category === activeCategory) {
          return { ...r, status };
        }
        return r;
      })
    );
  };

  const autoFillCleanedBy = () => {
    const staffName = currentUser.name || "Staff";
    setRows((prev) =>
      prev.map((r) => {
        if (activeCategory === "all" || r.category === activeCategory) {
          return { ...r, cleanedBy: staffName };
        }
        return r;
      })
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
          equipmentChecks: JSON.stringify(rows),
          supervisorName,
          comments,
          correctiveAction,
        };

        const res = await fetch("/api/entries/oreta-equipment", {
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

  const visibleRows = activeCategory === "all" ? rows : rows.filter((r) => r.category === activeCategory);
  const totalCount = rows.length;
  const passedCount = rows.filter((r) => r.status === "YES" || r.status === "N/A").length;
  const compliance = Math.round((passedCount / totalCount) * 100);

  return (
    <form onSubmit={handleSubmit} className="fade-in">
      {/* Top Date & Submission Status */}
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

          <div className={`submission-banner ${existingEntry ? "submitted" : "pending"}`} style={{ margin: 0 }}>
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

      {/* Category Pills & Quick Actions */}
      <div className="form-card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
          {/* Categories */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${activeCategory === "all" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveCategory("all")}
            >
              ⚙️ All Items ({totalCount})
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

          {/* Quick Actions */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllStatus("YES")}
              title="Set all visible items to YES"
            >
              ⚡ Set All YES
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={autoFillCleanedBy}
              title="Assign my name to visible items"
            >
              👤 Fill My Name
            </button>
          </div>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="table-wrapper" style={{ marginBottom: "1.5rem" }}>
        <div className="table-header-title">
          <span>⚙️ Oreta World Equipment Cleaning & Inspection</span>
          <span className="badge badge-blue">41 Items · Compliance {compliance}%</span>
        </div>

        <table className="checklist-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              <th style={{ minWidth: "180px" }}>Equipment / Item</th>
              <th style={{ minWidth: "140px" }}>Category</th>
              <th style={{ minWidth: "180px" }}>Status</th>
              <th style={{ minWidth: "110px" }}>Time</th>
              <th style={{ minWidth: "160px" }}>Cleaned By</th>
              <th style={{ minWidth: "160px" }}>Checked By</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                <td className="item-cell" style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                  {row.id}
                </td>
                <td className="item-cell">
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{row.name}</div>
                </td>
                <td className="item-cell">
                  <span className="badge" style={{ fontSize: "0.72rem", background: "var(--bg-primary)" }}>
                    {row.category}
                  </span>
                </td>
                <td className="touch-cell">
                  <div className="touch-toggle-group">
                    <button
                      type="button"
                      className={`touch-btn-option ${row.status === "YES" ? "active-yes" : ""}`}
                      onClick={() => updateRow(row.id, "status", "YES")}
                    >
                      ✓ YES
                    </button>
                    <button
                      type="button"
                      className={`touch-btn-option ${row.status === "NO" ? "active-no" : ""}`}
                      onClick={() => updateRow(row.id, "status", "NO")}
                    >
                      ✕ NO
                    </button>
                    <button
                      type="button"
                      className={`touch-btn-option ${row.status === "N/A" ? "active-na" : ""}`}
                      onClick={() => updateRow(row.id, "status", "N/A")}
                    >
                      N/A
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    value={row.time}
                    onChange={(e) => updateRow(row.id, "time", e.target.value)}
                    className="form-control"
                    style={{ fontSize: "0.8rem", height: "32px", width: "90px" }}
                  />
                </td>
                <td>
                  <select
                    value={row.cleanedBy}
                    onChange={(e) => updateRow(row.id, "cleanedBy", e.target.value)}
                    className="form-control"
                    style={{ fontSize: "0.8rem", height: "32px", fontWeight: 600 }}
                  >
                    {ORETA_STAFF.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    value={row.checkedBy}
                    onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)}
                    className="form-control"
                    style={{ fontSize: "0.8rem", height: "32px" }}
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
                </td>
              </tr>
            ))}
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
            <label className="form-label">Comments / Equipment Observations</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Griller 1 deep-cleaned and descaled..."
              rows={2}
              className="form-control"
            />
          </div>

          <div className="form-group" style={{ gridColumn: "1 / -1" }}>
            <label className="form-label">Corrective Actions Taken (if any NO)</label>
            <textarea
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="e.g. Coffee machine 2 steam wand re-sanitized at 15:00..."
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
            ✓ Oreta World Equipment Cleaning log saved successfully!
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
          {isPending ? "Submitting..." : existingEntry ? "Update Equipment Log" : "Submit Equipment Log"}
        </button>
      </div>
    </form>
  );
}
