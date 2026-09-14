"use client";
import { useState, useMemo } from "react";
import { OUTLETS } from "@/lib/outlets";

const SHEETS = [
  { key: "hygiene", label: "Hygiene Report", icon: "🧹", route: "/hygiene", outlet: "bakery" },
  { key: "glass", label: "Glass Report", icon: "🪟", route: "/glass", outlet: "bakery" },
  { key: "fridge", label: "Fridge Report", icon: "🧊", route: "/fridge", outlet: "bakery" },
  { key: "kitchen", label: "Kitchen", icon: "🍳", route: "/kitchen", outlet: "bakery" },
  { key: "production", label: "Production", icon: "🏭", route: "/production", outlet: "bakery" },
  { key: "puffRoom", label: "Puff Room", icon: "🥐", route: "/puff-room", outlet: "bakery" },
  { key: "cakeRoom", label: "Cake Room", icon: "🎂", route: "/cake-room", outlet: "bakery" },
  { key: "oretaHygiene", label: "Oreta Hygiene SOP", icon: "✨", route: "/oreta/hygiene", outlet: "oreta-world" },
];

type SheetEntry = {
  id: string;
  date: string;
  submittedBy: { name: string };
  supervisorName?: string;
  supervisedBy?: string;
  workerName?: string;
  createdAt: string;
  comments?: string;
};

type DataMap = Record<string, SheetEntry[]>;

interface Props { data: DataMap; }

export default function ReportsClient({ data }: Props) {
  const [selectedOutlet, setSelectedOutlet] = useState("all");
  const [selectedSheet, setSelectedSheet] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Filter available sheets based on selected outlet
  const availableSheets = useMemo(() => {
    if (selectedOutlet === "all") return SHEETS;
    return SHEETS.filter((s) => s.outlet === selectedOutlet);
  }, [selectedOutlet]);

  // Build a flat list of all entries with their sheet and outlet metadata
  const allRows = useMemo(() => {
    const rows: Array<SheetEntry & { sheetKey: string; sheetLabel: string; sheetIcon: string; outlet: string }> = [];
    for (const sh of SHEETS) {
      const entries: SheetEntry[] = data[sh.key] || [];
      for (const e of entries) {
        rows.push({ ...e, sheetKey: sh.key, sheetLabel: sh.label, sheetIcon: sh.icon, outlet: sh.outlet });
      }
    }
    return rows;
  }, [data]);

  // Filter by outlet, sheet, and date range
  const filtered = useMemo(() => {
    return allRows
      .filter((r) => {
        if (selectedOutlet !== "all" && r.outlet !== selectedOutlet) return false;
        if (selectedSheet !== "all" && r.sheetKey !== selectedSheet) return false;
        if (dateFrom && r.date < dateFrom) return false;
        if (dateTo && r.date > dateTo) return false;
        return true;
      })
      .sort((a, b) => {
        const diff = a.date.localeCompare(b.date);
        return sortDir === "desc" ? -diff : diff;
      });
  }, [allRows, selectedOutlet, selectedSheet, dateFrom, dateTo, sortDir]);

  // Per-sheet counts for summary bar
  const sheetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sh of SHEETS) counts[sh.key] = 0;
    for (const r of filtered) counts[r.sheetKey] = (counts[r.sheetKey] || 0) + 1;
    return counts;
  }, [filtered]);

  const uniqueDates = useMemo(() => {
    const dates = new Set(filtered.map((r) => r.date));
    return dates.size;
  }, [filtered]);

  const expectedSheetsCount = availableSheets.length;
  const totalPossible = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    let count = 0;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) count++;
    return count * (selectedSheet === "all" ? expectedSheetsCount : 1);
  }, [dateFrom, dateTo, selectedSheet, expectedSheetsCount]);

  const compliance = totalPossible > 0 ? Math.round((filtered.length / totalPossible) * 100) : 0;

  function quickRange(days: number) {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(to.toISOString().split("T")[0]);
  }

  function exportCSV() {
    const headers = ["Outlet", "Date", "Time", "Sheet", "Submitted By", "Supervisor/Worker", "Comments"];
    const rows = filtered.map((r) => [
      r.outlet === "oreta-world" ? "Oreta World" : "Bakery",
      r.date,
      new Date(r.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      r.sheetLabel,
      r.submittedBy.name,
      r.supervisorName || r.supervisedBy || r.workerName || "—",
      (r.comments || "").replace(/,/g, ";"),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnr_hygiene_report_${dateFrom}_to_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>📊 Multi-Outlet Reports & Analytics</h1>
          <p>Submission history across Bakery and Oreta World outlets</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          ⬇️ Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "flex-end" }}>
          {/* Outlet Filter */}
          <div className="form-group" style={{ minWidth: 180 }}>
            <label>Sub-Account / Outlet</label>
            <select
              value={selectedOutlet}
              onChange={(e) => {
                setSelectedOutlet(e.target.value);
                setSelectedSheet("all");
              }}
            >
              <option value="all">🏢 All Outlets</option>
              {OUTLETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.icon} {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="form-group" style={{ minWidth: 140 }}>
            <label>From Date</label>
            <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ minWidth: 140 }}>
            <label>To Date</label>
            <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          {/* Quick ranges */}
          <div className="form-group">
            <label>Quick Range</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[
                { label: "7D", days: 7 },
                { label: "14D", days: 14 },
                { label: "30D", days: 30 },
                { label: "60D", days: 60 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  className="btn btn-sm btn-secondary"
                  onClick={() => quickRange(days)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sheet filter */}
          <div className="form-group" style={{ minWidth: 180 }}>
            <label>Sheet</label>
            <select value={selectedSheet} onChange={(e) => setSelectedSheet(e.target.value)}>
              <option value="all">All Available Sheets</option>
              {availableSheets.map((sh) => (
                <option key={sh.key} value={sh.key}>
                  {sh.icon} {sh.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="form-group">
            <label>Sort</label>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              style={{ minWidth: 110 }}
            >
              {sortDir === "desc" ? "⬇ Newest First" : "⬆ Oldest First"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card">
          <div className="stat-icon blue">📋</div>
          <div>
            <div className="stat-value">{filtered.length}</div>
            <div className="stat-label">Entries Found</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">📅</div>
          <div>
            <div className="stat-value">{uniqueDates}</div>
            <div className="stat-label">Days with Data</div>
          </div>
        </div>
        <div className="stat-card">
          <div className={`stat-icon ${compliance >= 80 ? "green" : compliance >= 50 ? "amber" : "red"}`}>
            {compliance >= 80 ? "✅" : compliance >= 50 ? "⚠️" : "❌"}
          </div>
          <div>
            <div className="stat-value">{compliance}%</div>
            <div className="stat-label">Compliance Rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">📊</div>
          <div>
            <div className="stat-value">{Math.max(0, totalPossible - filtered.length)}</div>
            <div className="stat-label">Missing Entries</div>
          </div>
        </div>
      </div>

      {/* Per-Sheet Breakdown */}
      {selectedSheet === "all" && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <div className="card-title">📈 Submissions Per Sheet</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {dateFrom} → {dateTo}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {availableSheets.map((sh) => {
              const count = sheetCounts[sh.key] || 0;
              const maxDays = expectedSheetsCount > 0 ? totalPossible / expectedSheetsCount : 1;
              const pct = maxDays > 0 ? Math.round((count / maxDays) * 100) : 0;
              return (
                <div
                  key={sh.key}
                  className="sheet-stat-card"
                  onClick={() => setSelectedSheet(sh.key)}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{sh.icon} {sh.label}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{count} entries</span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? "var(--success)" : pct >= 50 ? "var(--warning)" : "var(--danger)",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{pct}% compliance</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {selectedSheet === "all"
              ? `Entries Log (${filtered.length})`
              : `${SHEETS.find((s) => s.key === selectedSheet)?.icon} ${SHEETS.find((s) => s.key === selectedSheet)?.label} — ${filtered.length} entries`}
          </div>
          {selectedSheet !== "all" && (
            <button className="btn btn-sm btn-secondary" onClick={() => setSelectedSheet("all")}>
              ← All Sheets
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
            <div>No entries found for the selected filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  >
                    Date {sortDir === "desc" ? "▼" : "▲"}
                  </th>
                  <th>Day</th>
                  <th>Sheet</th>
                  <th>Submitted By</th>
                  <th>Supervisor / Worker</th>
                  <th>Time</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const rowId = `${row.sheetKey}-${row.id}`;
                  const isExpanded = expandedRow === rowId;
                  const dayLabel = new Date(row.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
                  const timeLabel = new Date(row.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  const supervisor = row.supervisorName || row.supervisedBy || row.workerName || "—";
                  const outletName = row.outlet === "oreta-world" ? "🌐 Oreta World" : "🥐 Bakery";

                  return (
                    <tr
                      key={rowId}
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedRow(isExpanded ? null : rowId)}
                    >
                      <td>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent)" }}>
                          {outletName}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{row.date}</span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{dayLabel}</td>
                      <td>
                        <span className="sheet-tag">
                          {row.sheetIcon} {row.sheetLabel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.submittedBy.name}</td>
                      <td style={{ color: "var(--text-muted)" }}>{supervisor}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{timeLabel}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {row.comments || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
