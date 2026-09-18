"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORETA_GLASS_ITEMS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface GlassRow {
  id: number;
  floor: string;
  location: string;
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
  glassChecks: string;
  submittedBy: { name: string; email: string };
  createdAt: string;
}

interface Props {
  initialDate: string;
  existingEntry: ExistingEntry | null;
  history: ExistingEntry[];
  currentUser: { id: string; name: string; role: string };
}

export default function OretaGlassForm({
  initialDate,
  existingEntry,
  history,
  currentUser,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);

  const buildInitialRows = (): GlassRow[] => {
    if (existingEntry?.glassChecks) {
      try {
        const parsed = JSON.parse(existingEntry.glassChecks);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return ORETA_GLASS_ITEMS.map((item) => ({
      id: item.id,
      floor: item.floor,
      location: item.location,
      status: "YES",
      time: "10:30",
      cleanedBy: item.defaultCleanedBy,
      checkedBy: "Admin",
    }));
  };

  const [rows, setRows] = useState<GlassRow[]>(buildInitialRows);
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
    router.push(`/oreta/glass?date=${newDate}`);
  };

  const updateRow = (id: number, field: keyof GlassRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const setAllStatus = (status: "YES" | "NO" | "N/A", floorFilter?: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (!floorFilter || r.floor === floorFilter) {
          return { ...r, status };
        }
        return r;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/entries/oreta-glass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existingEntry?.id,
          date,
          supervisorName,
          comments,
          correctiveAction,
          glassChecks: JSON.stringify(rows),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save glass report");
      }

      setSaveSuccess(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving.");
    }
  };

  const floors = ["Ground Floor", "Mezzanine Floor"] as const;

  return (
    <div className="space-y-6">
      {/* Top control bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="glass-date" className="font-semibold text-sm">
            📅 Select Date:
          </label>
          <input
            id="glass-date"
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="input-field max-w-[180px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAllStatus("YES")}
            className="btn btn-secondary text-xs px-3 py-1.5"
          >
            ✅ Mark All Cleaned (YES)
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="alert alert-success">
          ✅ Oreta Glass Report saved successfully for {date}!
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error">
          ❌ {errorMsg}
        </div>
      )}

      {existingEntry && (
        <div className="alert alert-info text-sm flex items-center justify-between">
          <span>
            ℹ️ Record submitted by <strong>{existingEntry.submittedBy?.name || "Admin"}</strong> on{" "}
            {new Date(existingEntry.createdAt).toLocaleString("en-IN")}.
          </span>
          <span className="badge badge-submitted">Saved</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {floors.map((floor) => {
          const floorRows = rows.filter((r) => r.floor === floor);
          if (floorRows.length === 0) return null;

          return (
            <div key={floor} className="card overflow-hidden">
              <div className="card-header bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪟</span>
                  <h2 className="card-title text-base">{floor} Glass Panels</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-pending text-xs">
                    {floorRows.length} Panels
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllStatus("YES", floor)}
                    className="btn btn-xs btn-secondary"
                  >
                    Check All {floor}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100/40 dark:bg-slate-800/20 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Panel Location / Description</th>
                      <th className="p-3 w-40 text-center">Cleaned?</th>
                      <th className="p-3 w-32">Time</th>
                      <th className="p-3 w-48">Cleaned By</th>
                      <th className="p-3 w-40">Checked By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {floorRows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3 text-center text-xs font-mono text-slate-400">
                          {row.id}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                          {row.location}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-200/60 dark:bg-slate-700/60">
                            {(["YES", "NO", "N/A"] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateRow(row.id, "status", st)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                                  row.status === st
                                    ? st === "YES"
                                      ? "bg-emerald-500 text-white shadow"
                                      : st === "NO"
                                      ? "bg-rose-500 text-white shadow"
                                      : "bg-slate-500 text-white shadow"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="time"
                            value={row.time}
                            onChange={(e) => updateRow(row.id, "time", e.target.value)}
                            className="input-field text-xs py-1 px-2 w-28"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.cleanedBy}
                            onChange={(e) => updateRow(row.id, "cleanedBy", e.target.value)}
                            className="input-field text-xs py-1 px-2"
                          >
                            {ORETA_STAFF.map((staff) => (
                              <option key={staff} value={staff}>
                                {staff}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.checkedBy}
                            onChange={(e) => updateRow(row.id, "checkedBy", e.target.value)}
                            className="input-field text-xs py-1 px-2"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Supervisor & Comments */}
        <div className="card p-5 space-y-4">
          <h3 className="text-base font-semibold border-b pb-2">
            📋 Supervisor Sign-off
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Verified By Supervisor:
              </label>
              <select
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                className="input-field"
              >
                {SUPERVISORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Comments / Streaks / Smudges Noticed:
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g., Ground floor entrance glass spotless; mezzanine handrail glass cleaned."
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
              Corrective Action (if required):
            </label>
            <textarea
              rows={2}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="e.g., Re-wiped exterior glass after afternoon rainfall."
              className="input-field text-sm"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary px-6 py-2.5 font-semibold text-sm shadow-md"
            >
              {isPending ? "⏳ Saving..." : existingEntry ? "💾 Update Glass Report" : "💾 Submit Daily Glass Log"}
            </button>
          </div>
        </div>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-base font-semibold">
            🕒 Recent Glass Reports
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b font-semibold text-slate-500 uppercase">
                  <th className="p-2">Date</th>
                  <th className="p-2">Supervisor</th>
                  <th className="p-2">Submitted By</th>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2 font-semibold">{h.date}</td>
                    <td className="p-2">{h.supervisorName}</td>
                    <td className="p-2">{h.submittedBy?.name || "Admin"}</td>
                    <td className="p-2 text-slate-400">
                      {new Date(h.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => handleDateChange(h.date)}
                        className="btn btn-xs btn-secondary"
                      >
                        View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
