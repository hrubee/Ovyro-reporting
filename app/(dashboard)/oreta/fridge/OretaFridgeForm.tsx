"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ORETA_FRIDGE_ITEMS } from "@/lib/outlets";
import { SUPERVISORS } from "@/lib/permissions";

interface FridgeRow {
  id: number;
  section: "Kitchen" | "Cake Display";
  productName: string;
  machineNumber: string;
  referenceTemp: string;
  actualTempMorning: string;
  actualTempEvening: string;
  isNA?: boolean;
}

interface ExistingEntry {
  id: string;
  date: string;
  supervisorName: string;
  hygiene: string;
  comments: string;
  correctiveAction: string;
  fridgeChecks: string;
  submittedBy: { name: string; email: string };
  createdAt: string;
}

interface Props {
  initialDate: string;
  existingEntry: ExistingEntry | null;
  history: ExistingEntry[];
  currentUser: { id: string; name: string; role: string };
}

const CHILLER_TEMPS = ["N/A", "+3.0°C", "+3.5°C", "+4.0°C", "+4.5°C", "+5.0°C", "+5.5°C", "+6.0°C", "+7.0°C", "+8.0°C"];
const FREEZER_TEMPS = ["N/A", "-15.0°C", "-16.0°C", "-16.5°C", "-17.0°C", "-17.5°C", "-18.0°C", "-18.5°C", "-19.0°C"];
const CAKE_DISPLAY_TEMPS = ["N/A", "+2.0°C", "+3.0°C", "+4.0°C", "+5.0°C", "+6.0°C", "+7.0°C", "+8.0°C", "+9.0°C", "+10.0°C"];

export default function OretaFridgeForm({
  initialDate,
  existingEntry,
  history,
  currentUser,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(initialDate);

  const buildInitialRows = (): FridgeRow[] => {
    if (existingEntry?.fridgeChecks) {
      try {
        const parsed = JSON.parse(existingEntry.fridgeChecks);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }

    return ORETA_FRIDGE_ITEMS.map((item) => ({
      id: item.id,
      section: item.section,
      productName: item.productName,
      machineNumber: item.machineNumber,
      referenceTemp: item.referenceTemp,
      actualTempMorning: item.section === "Cake Display" ? "+5.0°C" : item.productName.includes("FREEZER") ? "-18.0°C" : "+4.0°C",
      actualTempEvening: item.section === "Cake Display" ? "+5.5°C" : item.productName.includes("FREEZER") ? "-17.5°C" : "+4.5°C",
      isNA: false,
    }));
  };

  const [rows, setRows] = useState<FridgeRow[]>(buildInitialRows);
  const [supervisorName, setSupervisorName] = useState(
    existingEntry?.supervisorName || SUPERVISORS[0]
  );
  const [hygiene, setHygiene] = useState(existingEntry?.hygiene || "Good");
  const [comments, setComments] = useState(existingEntry?.comments || "");
  const [correctiveAction, setCorrectiveAction] = useState(
    existingEntry?.correctiveAction || ""
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    router.push(`/oreta/fridge?date=${newDate}`);
  };

  const updateRow = (id: number, field: keyof FridgeRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === "actualTempMorning" || field === "actualTempEvening") {
            if (value !== "N/A" && value !== "") {
              updated.isNA = false;
            }
          }
          return updated;
        }
        return r;
      })
    );
  };

  const toggleNA = (id: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newNA = !r.isNA;
          return {
            ...r,
            isNA: newNA,
            actualTempMorning: newNA ? "N/A" : "+4.0°C",
            actualTempEvening: newNA ? "N/A" : "+4.5°C",
          };
        }
        return r;
      })
    );
  };

  const setAllNormal = (timing: "morning" | "evening" | "both") => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.isNA) return r;
        let mTemp = r.actualTempMorning;
        let eTemp = r.actualTempEvening;

        if (r.section === "Cake Display") {
          mTemp = "+5.0°C";
          eTemp = "+5.5°C";
        } else if (r.productName.includes("FREEZER")) {
          mTemp = "-18.0°C";
          eTemp = "-17.5°C";
        } else {
          mTemp = "+4.0°C";
          eTemp = "+4.5°C";
        }

        return {
          ...r,
          actualTempMorning: timing === "evening" ? r.actualTempMorning : mTemp,
          actualTempEvening: timing === "morning" ? r.actualTempEvening : eTemp,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/entries/oreta-fridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: existingEntry?.id,
          date,
          supervisorName,
          hygiene,
          comments,
          correctiveAction,
          fridgeChecks: JSON.stringify(rows),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save entry");
      }

      setSaveSuccess(true);
      startTransition(() => {
        router.refresh();
      });
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving.");
    }
  };

  const sections = ["Kitchen", "Cake Display"] as const;

  return (
    <div className="space-y-6">
      {/* Top control bar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="report-date" className="font-semibold text-sm">
            📅 Select Date:
          </label>
          <input
            id="report-date"
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="input-field max-w-[180px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAllNormal("morning")}
            className="btn btn-secondary text-xs px-3 py-1.5"
          >
            ⚡ Normal AM Temps
          </button>
          <button
            type="button"
            onClick={() => setAllNormal("evening")}
            className="btn btn-secondary text-xs px-3 py-1.5"
          >
            ⚡ Normal PM Temps
          </button>
          <button
            type="button"
            onClick={() => setAllNormal("both")}
            className="btn btn-secondary text-xs px-3 py-1.5 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 dark:text-blue-300"
          >
            ⚡ Reset All Standard
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="alert alert-success">
          ✅ Oreta Fridge & Display Temperature report saved successfully for {date}!
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
            ℹ️ Editing record submitted by <strong>{existingEntry.submittedBy?.name || "Admin"}</strong> on{" "}
            {new Date(existingEntry.createdAt).toLocaleString("en-IN")}.
          </span>
          <span className="badge badge-submitted">Saved</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sections */}
        {sections.map((secName) => {
          const sectionRows = rows.filter((r) => r.section === secName);
          if (sectionRows.length === 0) return null;

          return (
            <div key={secName} className="card overflow-hidden">
              <div className="card-header bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{secName === "Cake Display" ? "🎂" : "🍳"}</span>
                  <h2 className="card-title text-base">{secName} Cooling Units</h2>
                </div>
                <span className="badge badge-pending text-xs">
                  {sectionRows.length} Units
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-slate-100/40 dark:bg-slate-800/20 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Equipment / Display Counter</th>
                      <th className="p-3 w-28 text-center">Machine #</th>
                      <th className="p-3 w-40 text-center">Reference Standard</th>
                      <th className="p-3 w-44">Morning Temp (AM)</th>
                      <th className="p-3 w-44">Evening Temp (PM)</th>
                      <th className="p-3 w-24 text-center">Standby</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sectionRows.map((row) => {
                      const isFreezer = row.productName.includes("FREEZER");
                      const isCake = row.section === "Cake Display";
                      const presetList = isCake
                        ? CAKE_DISPLAY_TEMPS
                        : isFreezer
                        ? FREEZER_TEMPS
                        : CHILLER_TEMPS;

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                            row.isNA ? "opacity-60 bg-slate-50/30" : ""
                          }`}
                        >
                          <td className="p-3 text-center text-xs font-mono text-slate-400">
                            {row.id}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-100">
                              {row.productName}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                              #{row.machineNumber}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`badge ${
                                isCake
                                  ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300"
                                  : isFreezer
                                  ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300"
                                  : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300"
                              }`}
                            >
                              {row.referenceTemp}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={row.actualTempMorning}
                                onChange={(e) => updateRow(row.id, "actualTempMorning", e.target.value)}
                                disabled={row.isNA}
                                placeholder={isCake ? "+5.0°C" : isFreezer ? "-18.0°C" : "+4.0°C"}
                                className="input-field text-sm font-mono py-1 px-2 w-28"
                              />
                              <select
                                onChange={(e) => {
                                  if (e.target.value) updateRow(row.id, "actualTempMorning", e.target.value);
                                }}
                                disabled={row.isNA}
                                value=""
                                className="input-field text-xs py-1 px-1.5 w-8 opacity-70 hover:opacity-100"
                                title="Select Preset Temp"
                              >
                                <option value="" disabled>⚡</option>
                                {presetList.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={row.actualTempEvening}
                                onChange={(e) => updateRow(row.id, "actualTempEvening", e.target.value)}
                                disabled={row.isNA}
                                placeholder={isCake ? "+5.5°C" : isFreezer ? "-17.5°C" : "+4.5°C"}
                                className="input-field text-sm font-mono py-1 px-2 w-28"
                              />
                              <select
                                onChange={(e) => {
                                  if (e.target.value) updateRow(row.id, "actualTempEvening", e.target.value);
                                }}
                                disabled={row.isNA}
                                value=""
                                className="input-field text-xs py-1 px-1.5 w-8 opacity-70 hover:opacity-100"
                                title="Select Preset Temp"
                              >
                                <option value="" disabled>⚡</option>
                                {presetList.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleNA(row.id)}
                              className={`btn btn-xs ${
                                row.isNA ? "btn-warning" : "btn-secondary text-slate-500"
                              }`}
                            >
                              {row.isNA ? "N/A" : "Off"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Supervisor, Hygiene & Comments */}
        <div className="card p-5 space-y-4">
          <h3 className="text-base font-semibold border-b pb-2">
            📋 Verification & Observation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Checked By / Supervisor:
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
                Overall Cold-Chain Hygiene Status:
              </label>
              <select
                value={hygiene}
                onChange={(e) => setHygiene(e.target.value)}
                className="input-field"
              >
                <option value="Good">🟢 Good (Compliant)</option>
                <option value="Satisfactory">🟡 Satisfactory (Minor adjustments)</option>
                <option value="Needs Improvement">🔴 Needs Improvement (Action Required)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Comments / Observations:
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g., Cake display counter 1 maintained steady +4.5°C throughout the day."
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                Corrective Action (if any):
              </label>
              <textarea
                rows={2}
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="e.g., Defrost cycle completed at 3 PM; filters cleaned."
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary px-6 py-2.5 font-semibold text-sm shadow-md"
            >
              {isPending ? "⏳ Saving..." : existingEntry ? "💾 Update Fridge Report" : "💾 Submit Daily Fridge Log"}
            </button>
          </div>
        </div>
      </form>

      {/* History Table */}
      {history.length > 0 && (
        <div className="card p-5 space-y-3">
          <h3 className="text-base font-semibold">
            🕒 Recent Oreta Temperature Logs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b font-semibold text-slate-500 uppercase">
                  <th className="p-2">Date</th>
                  <th className="p-2">Supervisor</th>
                  <th className="p-2">Hygiene</th>
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
                    <td className="p-2">
                      <span className={`badge ${h.hygiene === "Good" ? "badge-submitted" : "badge-pending"}`}>
                        {h.hygiene}
                      </span>
                    </td>
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
