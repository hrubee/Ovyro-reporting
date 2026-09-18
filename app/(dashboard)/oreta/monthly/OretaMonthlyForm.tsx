"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORETA_MONTHLY_ITEMS, ORETA_STAFF } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface MonthlyRow {
  id: number;
  task: string;
  category: string;
  status: "COMPLETED" | "PENDING" | "SCHEDULED" | "N/A";
  dateCompleted: string;
  assignedStaff: string;
  checkedBy: string;
  notes: string;
}

interface ExistingEntry {
  id: string;
  month: string;
  supervisorName: string;
  comments: string;
  correctiveAction: string;
  monthlyChecks: string;
  submittedBy: { name: string; email: string };
  createdAt: string;
}

interface Props {
  initialMonth: string;
  existingEntry: ExistingEntry | null;
  history: ExistingEntry[];
  currentUser: { id: string; name: string; role: string };
}

const SERVICE_STAFF = [
  ...ORETA_STAFF,
  "Technician / Rameshwar",
  "AC Technician",
  "Chiller Technician",
  "Pest Control Agency",
];

export default function OretaMonthlyForm({
  initialMonth,
  existingEntry,
  history,
  currentUser,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [month, setMonth] = useState(initialMonth);

  const buildInitialRows = (): MonthlyRow[] => {
    if (existingEntry?.monthlyChecks) {
      try {
        const parsed = JSON.parse(existingEntry.monthlyChecks);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return ORETA_MONTHLY_ITEMS.map((item) => ({
      id: item.id,
      task: item.task,
      category: item.category,
      status: "COMPLETED",
      dateCompleted: `${month}-15`,
      assignedStaff: item.defaultCleanedBy,
      checkedBy: "Admin",
      notes: "Inspected and serviced as per monthly schedule",
    }));
  };

  const [rows, setRows] = useState<MonthlyRow[]>(buildInitialRows);
  const [supervisorName, setSupervisorName] = useState(
    existingEntry?.supervisorName || SUPERVISORS[0]
  );
  const [comments, setComments] = useState(existingEntry?.comments || "");
  const [correctiveAction, setCorrectiveAction] = useState(
    existingEntry?.correctiveAction || ""
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
    router.push(`/oreta/monthly?month=${newMonth}`);
  };

  const updateRow = (id: number, field: keyof MonthlyRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const setAllStatus = (status: "COMPLETED" | "PENDING" | "SCHEDULED" | "N/A") => {
    setRows((prev) =>
      prev.map((r) => ({ ...r, status }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/entries/oreta-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existingEntry?.id,
          month,
          supervisorName,
          comments,
          correctiveAction,
          monthlyChecks: JSON.stringify(rows),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save monthly maintenance report");
      }

      setSaveSuccess(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving.");
    }
  };

  const categories = Array.from(new Set(ORETA_MONTHLY_ITEMS.map((i) => i.category)));

  return (
    <div className="space-y-6">
      {/* Top control bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="month-select" className="font-semibold text-sm">
            🗓️ Select Month:
          </label>
          <input
            id="month-select"
            type="month"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="input-field max-w-[180px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAllStatus("COMPLETED")}
            className="btn btn-secondary text-xs px-3 py-1.5"
          >
            ✅ Mark All Completed
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="alert alert-success">
          ✅ Oreta Monthly Maintenance log saved successfully for {month}!
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
        {categories.map((cat) => {
          const catRows = rows.filter((r) => r.category === cat);
          if (catRows.length === 0) return null;

          return (
            <div key={cat} className="card overflow-hidden">
              <div className="card-header bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔧</span>
                  <h2 className="card-title text-base">{cat}</h2>
                </div>
                <span className="badge badge-pending text-xs">
                  {catRows.length} Items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100/40 dark:bg-slate-800/20 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-48">Task / Equipment</th>
                      <th className="p-3 w-56 text-center">Status</th>
                      <th className="p-3 w-36">Date Done</th>
                      <th className="p-3 w-52">Service / Staff</th>
                      <th className="p-3">Notes / Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {catRows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-3 text-center text-xs font-mono text-slate-400">
                          {row.id}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                          {row.task}
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex rounded-lg p-0.5 bg-slate-200/60 dark:bg-slate-700/60">
                            {(["COMPLETED", "PENDING", "SCHEDULED", "N/A"] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateRow(row.id, "status", st)}
                                className={`px-2 py-1 text-xs font-bold rounded-md transition-all ${
                                  row.status === st
                                    ? st === "COMPLETED"
                                      ? "bg-emerald-500 text-white shadow"
                                      : st === "PENDING"
                                      ? "bg-amber-500 text-white shadow"
                                      : st === "SCHEDULED"
                                      ? "bg-blue-500 text-white shadow"
                                      : "bg-slate-500 text-white shadow"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                }`}
                              >
                                {st === "COMPLETED" ? "DONE" : st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <input
                            type="date"
                            value={row.dateCompleted}
                            onChange={(e) => updateRow(row.id, "dateCompleted", e.target.value)}
                            className="input-field text-xs py-1 px-2"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={row.assignedStaff}
                            onChange={(e) => updateRow(row.id, "assignedStaff", e.target.value)}
                            className="input-field text-xs py-1 px-2"
                          >
                            {SERVICE_STAFF.map((staff) => (
                              <option key={staff} value={staff}>
                                {staff}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={row.notes}
                            onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                            className="input-field text-xs py-1 px-2"
                            placeholder="Maintenance details / AMC notes..."
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
            📋 Monthly Audit & Sign-off
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Inspected By Supervisor:
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
                Executive Comments / Facility State:
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g., All shutters oiled, AC cooling gas checked, fridge compressors inspected."
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
              Outstanding Actions / Maintenance Scheduled for Next Month:
            </label>
            <textarea
              rows={2}
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="e.g., Schedule generator battery replacement before next cycle."
              className="input-field text-sm"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary px-6 py-2.5 font-semibold text-sm shadow-md"
            >
              {isPending ? "⏳ Saving..." : existingEntry ? "💾 Update Monthly Log" : "💾 Submit Monthly Maintenance Log"}
            </button>
          </div>
        </div>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-base font-semibold">
            🕒 Past Monthly Maintenance Records
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b font-semibold text-slate-500 uppercase">
                  <th className="p-2">Month</th>
                  <th className="p-2">Supervisor</th>
                  <th className="p-2">Submitted By</th>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-2 font-semibold">{h.month}</td>
                    <td className="p-2">{h.supervisorName}</td>
                    <td className="p-2">{h.submittedBy?.name || "Admin"}</td>
                    <td className="p-2 text-slate-400">
                      {new Date(h.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => handleMonthChange(h.month)}
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
