"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

export interface DynamicFormRendererProps {
  outlet: {
    id: string;
    name: string;
    code?: string | null;
    icon: string;
    shifts?: string[];
  };
  template: {
    id: string;
    slug: string;
    title: string;
    category: string;
    icon: string;
    description?: string | null;
    frequency: string;
    schema: any;
  };
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  availableStaff?: string[];
}

export default function DynamicFormRenderer({
  outlet,
  template,
  currentUser,
  availableStaff = [
    "Staff Member",
    "Shift Supervisor",
    "Kitchen Lead",
    "Operator",
    "Technician",
  ],
}: DynamicFormRendererProps) {
  const router = useRouter();
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const parsedSchema = useMemo(() => {
    if (!template.schema) return { sections: [] };
    if (typeof template.schema === "string") {
      try {
        return JSON.parse(template.schema);
      } catch {
        return { sections: [] };
      }
    }
    return template.schema;
  }, [template.schema]);

  const availableShifts = useMemo(() => {
    if (parsedSchema?.shifts && Array.isArray(parsedSchema.shifts)) {
      return parsedSchema.shifts;
    }
    if (outlet.shifts && Array.isArray(outlet.shifts)) {
      return outlet.shifts;
    }
    return ["Morning", "Afternoon", "Evening", "Night"];
  }, [parsedSchema, outlet.shifts]);

  const [selectedShift, setSelectedShift] = useState<string>(availableShifts[0] || "General");

  const [formData, setFormData] = useState<any>({});
  const [comments, setComments] = useState<string>("");
  const [correctiveAction, setCorrectiveAction] = useState<string>("");
  const [supervisorName, setSupervisorName] = useState<string>("");
  const [supervisorSigned, setSupervisorSigned] = useState<boolean>(false);
  const [existingSubmissionId, setExistingSubmissionId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing submission for selected date & shift
  useEffect(() => {
    let isCancelled = false;
    async function loadSubmission() {
      setLoading(true);
      try {
        const isShiftWise = template.frequency === "SHIFT_WISE";
        const queryParams = new URLSearchParams({
          outletId: outlet.id,
          templateId: template.id,
          date: selectedDate,
        });

        const res = await fetch(`/api/submissions?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        const submissions = json.submissions || [];

        const matching = isShiftWise
          ? submissions.find((s: any) => s.shift === selectedShift)
          : submissions[0];

        if (!isCancelled) {
          if (matching) {
            setExistingSubmissionId(matching.id);
            setFormData(matching.data || {});
            setComments(matching.comments || "");
            setCorrectiveAction(matching.correctiveAction || "");
            setSupervisorName(matching.supervisorName || "");
            setSupervisorSigned(!!matching.supervisorSigned);
          } else {
            setExistingSubmissionId(null);
            setFormData(getInitialDataForSchema(parsedSchema, template.category, availableStaff, currentUser?.name));
            setComments("");
            setCorrectiveAction("");
            setSupervisorSigned(false);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadSubmission();
    return () => {
      isCancelled = true;
    };
  }, [outlet.id, template.id, template.category, template.frequency, parsedSchema, selectedDate, selectedShift, availableStaff, currentUser?.name]);

function YesNoNaToggle({
  value,
  onChange,
}: {
  value?: "YES" | "NO" | "NA" | string | boolean;
  onChange: (val: "YES" | "NO" | "NA") => void;
}) {
  const current =
    value === true || value === "YES" || value === "DONE" || value === "INTACT"
      ? "YES"
      : value === false || value === "NO" || value === "PENDING" || value === "DAMAGED"
      ? "NO"
      : value === "NA" || value === "N/A"
      ? "NA"
      : "YES";

  return (
    <div className="touch-btn-toggle">
      <button
        type="button"
        onClick={() => onChange("YES")}
        className={`touch-btn-option ${current === "YES" ? "active-yes" : ""}`}
        title="Yes / Clean / Pass"
      >
        ✓ YES
      </button>
      <button
        type="button"
        onClick={() => onChange("NO")}
        className={`touch-btn-option ${current === "NO" ? "active-no" : ""}`}
        title="No / Not Done / Flagged"
      >
        ✕ NO
      </button>
      <button
        type="button"
        onClick={() => onChange("NA")}
        className={`touch-btn-option ${current === "NA" ? "active-na" : ""}`}
        title="Not Applicable"
      >
        — N/A
      </button>
    </div>
  );
}

function getInitialDataForSchema(
  schema: any,
  category: string,
  availableStaff: string[] = ["Staff Member"],
  currentUserName?: string
) {
  const sections = schema?.sections || [];
  const defaultStaff = (availableStaff && availableStaff[0]) || "Staff Member";

  if (category === "HOUSEKEEPING") {
    let items = sections.flatMap((s: any) =>
      (s.items || []).map((item: any) => ({
        id: item.id || `hk-${Math.random()}`,
        name: item.name || item.task || "Housekeeping Zone",
        status: "YES",
        cleanedBy: item.defaultAssignee || defaultStaff,
        time: new Date().toTimeString().slice(0, 5),
      }))
    );
    if (!items.length) {
      items = [
        { id: "hk-1", name: "Main Kitchen & Prep Counter", status: "YES", cleanedBy: defaultStaff, time: "09:00" },
        { id: "hk-2", name: "Dishwashing & Sanitation Station", status: "YES", cleanedBy: defaultStaff, time: "09:30" },
        { id: "hk-3", name: "Storage & Walk-in Cooler Floors", status: "YES", cleanedBy: defaultStaff, time: "10:00" },
      ];
    }
    return { items };
  } else if (category === "EQUIPMENT") {
    let completedItems = sections.flatMap((s: any) =>
      (s.items || []).map((item: any) => ({
        id: item.id || `eq-${Math.random()}`,
        name: item.name || "Equipment Unit",
        category: item.category || s.title || "Kitchen Equipment",
        cleanedBy: item.defaultAssignee || defaultStaff,
        checkedBy: currentUserName || "Supervisor",
        status: "YES",
        time: new Date().toTimeString().slice(0, 5),
      }))
    );
    if (!completedItems.length) {
      completedItems = [
        { id: "eq-1", name: "Deep Fryer Unit 1", category: "Hot Line", cleanedBy: defaultStaff, checkedBy: currentUserName || "Supervisor", status: "YES", time: "09:00" },
        { id: "eq-2", name: "Main Combi Oven", category: "Hot Line", cleanedBy: defaultStaff, checkedBy: currentUserName || "Supervisor", status: "YES", time: "09:15" },
      ];
    }
    return { completedItems };
  } else if (category === "TEMPERATURE") {
    let readings = sections.flatMap((s: any) =>
      (s.items || []).map((item: any) => ({
        id: item.id || `temp-${Math.random()}`,
        name: item.name || "Refrigeration Unit",
        machineNumber: item.machineNumber || "",
        referenceTemp: item.referenceTemp || "+2°C to +8°C",
        morningTemp: "",
        eveningTemp: "",
        status: "NORMAL",
      }))
    );
    if (!readings.length) {
      readings = [
        { id: "temp-1", name: "Walk-in Meat Chiller", machineNumber: "1", referenceTemp: "+2°C to +4°C", morningTemp: "3.2", eveningTemp: "3.5", status: "NORMAL" },
        { id: "temp-2", name: "Dairy & Produce Cooler", machineNumber: "2", referenceTemp: "+2°C to +6°C", morningTemp: "4.1", eveningTemp: "4.3", status: "NORMAL" },
      ];
    }
    return { readings };
  } else if (category === "SAFETY_GLASS") {
    let locations = sections.flatMap((s: any) =>
      (s.items || []).map((item: any) => ({
        id: item.id || `sg-${Math.random()}`,
        location: item.name || item.location || "Glass Panel",
        status: "YES",
        cleanedBy: item.defaultAssignee || defaultStaff,
      }))
    );
    if (!locations.length) {
      locations = [
        { id: "sg-1", location: "Front Display Case Glass", status: "YES", cleanedBy: defaultStaff },
        { id: "sg-2", location: "Service Counter Sneeze Guard", status: "YES", cleanedBy: defaultStaff },
      ];
    }
    return { locations };
  } else if (category === "MAINTENANCE" || category === "CUSTOM") {
    let tasks = sections.flatMap((s: any) =>
      (s.items || []).map((item: any) => ({
        id: item.id || `maint-${Math.random()}`,
        task: item.name || item.task || "Maintenance Task",
        category: item.category || s.title || "Facility",
        completedBy: item.defaultAssignee || "Technician",
        status: "YES",
        notes: "",
      }))
    );
    if (!tasks.length) {
      tasks = [
        { id: "maint-1", task: "AC Filter Cleaning & Air Flow Check", category: "HVAC", completedBy: "Technician", status: "YES", notes: "" },
        { id: "maint-2", task: "Exhaust Hood Grease Filter Inspection", category: "Ventilation", completedBy: "Technician", status: "YES", notes: "" },
      ];
    }
    return { tasks };
  }
  return {};
}


  // Calculate Compliance Score
  const complianceScore = useMemo(() => {
    if (template.category === "TEMPERATURE") {
      const readings = formData.readings || [];
      if (!readings.length) return 100;
      let total = 0;
      let valid = 0;
      readings.forEach((r: any) => {
        if (r.morningTemp !== "" && r.morningTemp !== "N/A" && r.morningTemp !== "NA") {
          total++;
          if (r.status !== "BREACH") valid++;
        }
        if (r.eveningTemp !== "" && r.eveningTemp !== "N/A" && r.eveningTemp !== "NA") {
          total++;
          if (r.status !== "BREACH") valid++;
        }
      });
      return total === 0 ? 100 : Math.round((valid / total) * 100);
    }

    // Dynamic checklist items
    let allItems: any[] = [];
    if (template.category === "HOUSEKEEPING") {
      allItems = formData.items || [];
    } else if (template.category === "EQUIPMENT") {
      allItems = formData.completedItems || [];
    } else if (template.category === "SAFETY_GLASS") {
      allItems = formData.locations || [];
    } else if (template.category === "MAINTENANCE" || template.category === "CUSTOM") {
      allItems = formData.tasks || [];
    }

    if (!allItems.length) return 100;

    let yesCount = 0;
    let noCount = 0;
    allItems.forEach((it: any) => {
      const val =
        it.status !== undefined
          ? it.status
          : it.checked === true
          ? "YES"
          : it.checked === false
          ? "NO"
          : "YES";

      if (val === "YES" || val === "DONE" || val === "INTACT" || val === true) {
        yesCount++;
      } else if (val === "NO" || val === "PENDING" || val === "DAMAGED" || val === false) {
        noCount++;
      }
      // "NA" / "N/A" is excluded from the denominator so it does not penalize compliance
    });

    const scoredTotal = yesCount + noCount;
    if (scoredTotal === 0) return 100;
    return Math.round((yesCount / scoredTotal) * 100);
  }, [formData, template.category]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        id: existingSubmissionId || undefined,
        outletId: outlet.id,
        templateId: template.id,
        date: selectedDate,
        shift: template.frequency === "SHIFT_WISE" ? selectedShift : "General",
        data: formData,
        comments,
        correctiveAction,
        supervisorName: supervisorName || currentUser.name,
        supervisorSigned,
        complianceScore,
        status: supervisorSigned ? "VERIFIED" : "SUBMITTED",
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      setMessage({ type: "success", text: "Report submitted & saved successfully!" });
      if (json.submission?.id) {
        setExistingSubmissionId(json.submission.id);
      }
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save submission." });
    } finally {
      setSaving(false);
    }
  };

  const sections = parsedSchema?.sections || [];

  return (
    <div className="dynamic-sheet-container">
      {/* Top Header Card */}
      <div className="sheet-header-card">
        <div className="sheet-header-left">
          <div className="sheet-icon-wrapper">
            <span className="sheet-icon">{template.icon || "📋"}</span>
          </div>
          <div>
            <div className="sheet-badges-row">
              <span className="badge-outlet">
                {outlet.icon} {outlet.name}
              </span>
              <span className="badge-category">{template.category}</span>
              <span className="badge-frequency">{template.frequency}</span>
            </div>
            <h1 className="sheet-title">{template.title}</h1>
            {template.description && <p className="sheet-description">{template.description}</p>}
          </div>
        </div>

        {/* Action Controls & Score */}
        <div className="sheet-header-right">
          <div className="score-pill-box">
            <span className="score-label">Compliance Score</span>
            <span className={`score-value ${complianceScore < 80 ? "warning" : "good"}`}>
              {complianceScore}%
            </span>
          </div>

          <div className="controls-box">
            <div className="control-item">
              <label>Audit Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="control-input"
              />
            </div>

            {template.frequency === "SHIFT_WISE" && (
              <div className="control-item">
                <label>Operational Shift</label>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                  className="control-select"
                >
                  {availableShifts.map((s: string) => (
                    <option key={s} value={s}>
                      {s} Shift
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div className={`notification-toast ${message.type}`}>
          <span>{message.type === "success" ? "✓" : "⚠️"}</span>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="toast-close">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-card">
          <div className="spinner" />
          <p>Loading audit checklist & historical data...</p>
        </div>
      ) : (
        <div className="sheet-body-content">
          {/* 1. HOUSEKEEPING / MULTI-SHIFT CHECKLIST */}
          {template.category === "HOUSEKEEPING" && (
            <div className="table-card">
              <div className="table-header-bar">
                <div>
                  <h3>{sections[0]?.title || "Housekeeping & Sanitization Zones"}</h3>
                  <span className="item-count-badge">{(formData.items || []).length} checkpoints</span>
                </div>
                <div className="quick-action-bar">
                  <span className="quick-action-label">Batch Actions:</span>
                  <button
                    type="button"
                    className="quick-btn-action yes"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: (formData.items || []).map((i: any) => ({ ...i, status: "YES" })),
                      });
                    }}
                  >
                    ✓ All YES
                  </button>
                  <button
                    type="button"
                    className="quick-btn-action na"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: (formData.items || []).map((i: any) => ({ ...i, status: "NA" })),
                      });
                    }}
                  >
                    — All N/A
                  </button>
                  <button
                    type="button"
                    className="quick-btn-action no"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        items: (formData.items || []).map((i: any) => ({ ...i, status: "NO" })),
                      });
                    }}
                  >
                    ✕ All NO
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Zone / Area</th>
                      <th>Assigned Cleaner</th>
                      <th>Clean Time</th>
                      <th style={{ width: "220px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.items || []).map((item: any, idx: number) => (
                      <tr key={item.id || idx}>
                        <td>
                          <span className="font-semibold">{item.name}</span>
                        </td>
                        <td>
                          <select
                            value={item.cleanedBy || ""}
                            onChange={(e) => {
                              const newItems = [...(formData.items || [])];
                              newItems[idx] = { ...item, cleanedBy: e.target.value };
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="table-select"
                          >
                            {availableStaff.map((staff) => (
                              <option key={staff} value={staff}>
                                {staff}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="time"
                            value={item.time || "09:00"}
                            onChange={(e) => {
                              const newItems = [...(formData.items || [])];
                              newItems[idx] = { ...item, time: e.target.value };
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="table-time-input"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <YesNoNaToggle
                            value={item.status}
                            onChange={(val) => {
                              const newItems = [...(formData.items || [])];
                              newItems[idx] = { ...item, status: val };
                              setFormData({ ...formData, items: newItems });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. EQUIPMENT SANITIZATION */}
          {template.category === "EQUIPMENT" && (
            <div className="sections-grid">
              {sections.map((sec: any) => {
                const secItems = (formData.completedItems || []).filter((ci: any) =>
                  (sec.items || []).some((i: any) => i.id === ci.id || i.name === ci.name)
                );
                return (
                  <div key={sec.id} className="table-card">
                    <div className="table-header-bar">
                      <div>
                        <h3>{sec.title}</h3>
                        <span className="item-count-badge">{secItems.length} units</span>
                      </div>
                      <div className="quick-action-bar">
                        <button
                          type="button"
                          className="quick-btn-action yes"
                          onClick={() => {
                            const updated = (formData.completedItems || []).map((ci: any) => {
                              if ((sec.items || []).some((i: any) => i.id === ci.id || i.name === ci.name)) {
                                return { ...ci, status: "YES" };
                              }
                              return ci;
                            });
                            setFormData({ ...formData, completedItems: updated });
                          }}
                        >
                          ✓ All YES
                        </button>
                        <button
                          type="button"
                          className="quick-btn-action na"
                          onClick={() => {
                            const updated = (formData.completedItems || []).map((ci: any) => {
                              if ((sec.items || []).some((i: any) => i.id === ci.id || i.name === ci.name)) {
                                return { ...ci, status: "NA" };
                              }
                              return ci;
                            });
                            setFormData({ ...formData, completedItems: updated });
                          }}
                        >
                          — All N/A
                        </button>
                        <button
                          type="button"
                          className="quick-btn-action no"
                          onClick={() => {
                            const updated = (formData.completedItems || []).map((ci: any) => {
                              if ((sec.items || []).some((i: any) => i.id === ci.id || i.name === ci.name)) {
                                return { ...ci, status: "NO" };
                              }
                              return ci;
                            });
                            setFormData({ ...formData, completedItems: updated });
                          }}
                        >
                          ✕ All NO
                        </button>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="audit-table">
                        <thead>
                          <tr>
                            <th>Equipment</th>
                            <th>Cleaned By</th>
                            <th style={{ width: "220px", textAlign: "center" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {secItems.map((ci: any, idx: number) => {
                            const globalIdx = (formData.completedItems || []).findIndex(
                              (x: any) => x.id === ci.id
                            );
                            return (
                              <tr key={ci.id || idx}>
                                <td>
                                  <span className="font-semibold">{ci.name}</span>
                                </td>
                                <td>
                                  <select
                                    value={ci.cleanedBy || ""}
                                    onChange={(e) => {
                                      const newItems = [...formData.completedItems];
                                      newItems[globalIdx] = { ...ci, cleanedBy: e.target.value };
                                      setFormData({ ...formData, completedItems: newItems });
                                    }}
                                    className="table-select"
                                  >
                                    {availableStaff.map((staff) => (
                                      <option key={staff} value={staff}>
                                        {staff}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <YesNoNaToggle
                                    value={ci.status}
                                    onChange={(val) => {
                                      const newItems = [...formData.completedItems];
                                      newItems[globalIdx] = { ...ci, status: val };
                                      setFormData({ ...formData, completedItems: newItems });
                                    }}
                                  />
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
            </div>
          )}

          {/* 3. TEMPERATURE & COLD CHAIN LOG */}
          {template.category === "TEMPERATURE" && (
            <div className="table-card">
              <div className="table-header-bar">
                <div>
                  <h3>Cold Storage & Display Temperature Monitoring</h3>
                  <span className="temp-spec-hint">Units: °C (Auto-validates against safe food tolerances)</span>
                </div>
              </div>
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Refrigeration Unit</th>
                      <th>Target Safe Range</th>
                      <th>Morning Reading (°C)</th>
                      <th>Evening Reading (°C)</th>
                      <th>Alert Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.readings || []).map((reading: any, idx: number) => {
                      const schemaItem = sections
                        .flatMap((s: any) => s.items || [])
                        .find((i: any) => i.id === reading.id || i.name === reading.name);
                      const min = schemaItem?.targetMinTemp ?? -20;
                      const max = schemaItem?.targetMaxTemp ?? 10;
                      const mNum = parseFloat(reading.morningTemp);
                      const eNum = parseFloat(reading.eveningTemp);
                      const isBreach =
                        (!isNaN(mNum) && (mNum < min || mNum > max)) ||
                        (!isNaN(eNum) && (eNum < min || eNum > max));

                      return (
                        <tr key={reading.id || idx} className={isBreach ? "row-breach" : ""}>
                          <td>
                            <div className="font-semibold">{reading.name}</div>
                            {reading.machineNumber && (
                              <span className="machine-tag">Unit #{reading.machineNumber}</span>
                            )}
                          </td>
                          <td>
                            <span className="safe-range-badge">
                              {reading.referenceTemp || `${min}°C to ${max}°C`}
                            </span>
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="e.g. 4.2"
                              value={reading.morningTemp || ""}
                              onChange={(e) => {
                                const newReadings = [...(formData.readings || [])];
                                newReadings[idx] = { ...reading, morningTemp: e.target.value };
                                setFormData({ ...formData, readings: newReadings });
                              }}
                              className={`table-temp-input ${
                                !isNaN(mNum) && (mNum < min || mNum > max) ? "temp-out-of-bounds" : ""
                              }`}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="e.g. 4.5"
                              value={reading.eveningTemp || ""}
                              onChange={(e) => {
                                const newReadings = [...(formData.readings || [])];
                                newReadings[idx] = { ...reading, eveningTemp: e.target.value };
                                setFormData({ ...formData, readings: newReadings });
                              }}
                              className={`table-temp-input ${
                                !isNaN(eNum) && (eNum < min || eNum > max) ? "temp-out-of-bounds" : ""
                              }`}
                            />
                          </td>
                          <td>
                            {isBreach ? (
                              <span className="breach-tag">⚠️ Breach Out-of-Range</span>
                            ) : reading.morningTemp || reading.eveningTemp ? (
                              <span className="optimal-tag">✓ In Spec</span>
                            ) : (
                              <span className="pending-tag">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. SAFETY GLASS / PEST / FACILITY */}
          {template.category === "SAFETY_GLASS" && (
            <div className="table-card">
              <div className="table-header-bar">
                <div>
                  <h3>Glass & Structural Safety Inspection</h3>
                  <span className="item-count-badge">{(formData.locations || []).length} checkpoints</span>
                </div>
                <div className="quick-action-bar">
                  <span className="quick-action-label">Batch Actions:</span>
                  <button
                    type="button"
                    className="quick-btn-action yes"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        locations: (formData.locations || []).map((l: any) => ({ ...l, status: "YES" })),
                      });
                    }}
                  >
                    ✓ All YES
                  </button>
                  <button
                    type="button"
                    className="quick-btn-action na"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        locations: (formData.locations || []).map((l: any) => ({ ...l, status: "NA" })),
                      });
                    }}
                  >
                    — All N/A
                  </button>
                  <button
                    type="button"
                    className="quick-btn-action no"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        locations: (formData.locations || []).map((l: any) => ({ ...l, status: "NO" })),
                      });
                    }}
                  >
                    ✕ All NO
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Location / Panel</th>
                      <th>Inspector</th>
                      <th style={{ width: "220px", textAlign: "center" }}>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.locations || []).map((loc: any, idx: number) => (
                      <tr key={loc.id || idx}>
                        <td>
                          <span className="font-semibold">{loc.location}</span>
                        </td>
                        <td>
                          <select
                            value={loc.cleanedBy || ""}
                            onChange={(e) => {
                              const newLocs = [...(formData.locations || [])];
                              newLocs[idx] = { ...loc, cleanedBy: e.target.value };
                              setFormData({ ...formData, locations: newLocs });
                            }}
                            className="table-select"
                          >
                            {availableStaff.map((staff) => (
                              <option key={staff} value={staff}>
                                {staff}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <YesNoNaToggle
                            value={loc.status}
                            onChange={(val) => {
                              const newLocs = [...(formData.locations || [])];
                              newLocs[idx] = { ...loc, status: val };
                              setFormData({ ...formData, locations: newLocs });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. MONTHLY MAINTENANCE & CUSTOM */}
          {(template.category === "MAINTENANCE" || template.category === "CUSTOM") && (
            <div className="table-card">
              <div className="table-header-bar">
                <div>
                  <h3>Periodic / Maintenance & Custom Tasks</h3>
                  <span className="item-count-badge">{(formData.tasks || []).length} tasks</span>
                </div>
                <div className="quick-action-bar">
                  <span className="quick-action-label">Batch Actions:</span>
                  <button
                    type="button"
                    className="quick-btn-action yes"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        tasks: (formData.tasks || []).map((t: any) => ({ ...t, status: "YES" })),
                      });
                    }}
                  >
                    ✓ All YES
                  </button>
                  <button
                    type="button"
                    className="quick-btn-action na"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        tasks: (formData.tasks || []).map((t: any) => ({ ...t, status: "NA" })),
                      });
                    }}
                  >
                    — All N/A
                  </button>
                  <button
                    type="button"
                    className="quick-btn-action no"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        tasks: (formData.tasks || []).map((t: any) => ({ ...t, status: "NO" })),
                      });
                    }}
                  >
                    ✕ All NO
                  </button>
                </div>
              </div>
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Maintenance Task</th>
                      <th>Category</th>
                      <th>Assigned Specialist / Tech</th>
                      <th style={{ width: "220px", textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.tasks || []).map((task: any, idx: number) => (
                      <tr key={task.id || idx}>
                        <td>
                          <span className="font-semibold">{task.task}</span>
                        </td>
                        <td>
                          <span className="category-pill">{task.category}</span>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={task.completedBy || ""}
                            onChange={(e) => {
                              const newTasks = [...(formData.tasks || [])];
                              newTasks[idx] = { ...task, completedBy: e.target.value };
                              setFormData({ ...formData, tasks: newTasks });
                            }}
                            className="table-text-input"
                            placeholder="Technician / Staff name"
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <YesNoNaToggle
                            value={task.status}
                            onChange={(val) => {
                              const newTasks = [...(formData.tasks || [])];
                              newTasks[idx] = { ...task, status: val };
                              setFormData({ ...formData, tasks: newTasks });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supervisor Sign-off & Corrective Action Section */}
          <div className="audit-footer-grid">
            <div className="footer-card">
              <h3>General Notes & Remarks</h3>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add shift observations, hygiene notes or handover remarks..."
                rows={3}
                className="footer-textarea"
              />
            </div>

            <div className="footer-card">
              <h3>Corrective Actions (CAPA)</h3>
              <textarea
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="Specify any corrective actions taken for failed checks or temperature breaches..."
                rows={3}
                className="footer-textarea"
              />
            </div>

            <div className="footer-card supervisor-card">
              <h3>Supervisor Sign-off</h3>
              <div className="supervisor-inputs">
                <div className="form-group">
                  <label>Supervisor Name</label>
                  <input
                    type="text"
                    value={supervisorName || currentUser.name}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="control-input"
                    placeholder="Supervisor Name"
                  />
                </div>

                <div className="signoff-toggle-row">
                  <input
                    type="checkbox"
                    id="signoff-checkbox"
                    checked={supervisorSigned}
                    onChange={(e) => setSupervisorSigned(e.target.checked)}
                    className="custom-checkbox"
                  />
                  <label htmlFor="signoff-checkbox" className="signoff-label">
                    Digitally sign & verify this audit submission
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Save Action Bar */}
          <div className="sticky-action-bar">
            <div className="action-bar-inner">
              <div className="status-summary">
                <span className="dot-live" />
                <span>
                  {existingSubmissionId ? "Editing Saved Submission" : "New Daily Entry"} • {selectedDate}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary-save"
              >
                {saving ? "Saving..." : existingSubmissionId ? "Update Submission" : "Submit Audit Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
