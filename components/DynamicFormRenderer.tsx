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
            setFormData(getInitialDataForSchema(parsedSchema, template.category));
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
  }, [outlet.id, template.id, template.category, template.frequency, parsedSchema, selectedDate, selectedShift]);

  function getInitialDataForSchema(schema: any, category: string) {
    const sections = schema?.sections || [];
    if (category === "HOUSEKEEPING") {
      return {
        items: sections.flatMap((s: any) =>
          (s.items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            checked: false,
            cleanedBy: item.defaultAssignee || availableStaff[0] || "",
            time: new Date().toTimeString().slice(0, 5),
          }))
        ),
      };
    } else if (category === "EQUIPMENT") {
      return {
        completedItems: sections.flatMap((s: any) =>
          (s.items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category || s.title,
            cleanedBy: item.defaultAssignee || availableStaff[0] || "",
            checkedBy: currentUser.name || "Supervisor",
            status: "DONE",
            time: new Date().toTimeString().slice(0, 5),
          }))
        ),
      };
    } else if (category === "TEMPERATURE") {
      return {
        readings: sections.flatMap((s: any) =>
          (s.items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            machineNumber: item.machineNumber || "",
            referenceTemp: item.referenceTemp || "",
            morningTemp: "",
            eveningTemp: "",
            status: "NORMAL",
          }))
        ),
      };
    } else if (category === "SAFETY_GLASS") {
      return {
        locations: sections.flatMap((s: any) =>
          (s.items || []).map((item: any) => ({
            id: item.id,
            location: item.name,
            status: "INTACT",
            cleanedBy: item.defaultAssignee || availableStaff[0] || "",
          }))
        ),
      };
    } else if (category === "MAINTENANCE") {
      return {
        tasks: sections.flatMap((s: any) =>
          (s.items || []).map((item: any) => ({
            id: item.id,
            task: item.name,
            category: item.category || s.title,
            completedBy: item.defaultAssignee || "Technician",
            status: "DONE",
            notes: "",
          }))
        ),
      };
    }
    return {};
  }

  // Calculate Compliance Score
  const complianceScore = useMemo(() => {
    if (template.category === "HOUSEKEEPING") {
      const items = formData.items || [];
      if (!items.length) return 100;
      const checked = items.filter((i: any) => i.checked).length;
      return Math.round((checked / items.length) * 100);
    }
    if (template.category === "TEMPERATURE") {
      const readings = formData.readings || [];
      if (!readings.length) return 100;
      let total = 0;
      let valid = 0;
      readings.forEach((r: any) => {
        if (r.morningTemp !== "" && r.morningTemp !== "N/A") {
          total++;
          if (r.status !== "BREACH") valid++;
        }
        if (r.eveningTemp !== "" && r.eveningTemp !== "N/A") {
          total++;
          if (r.status !== "BREACH") valid++;
        }
      });
      return total === 0 ? 100 : Math.round((valid / total) * 100);
    }
    return 100;
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
                <h3>{sections[0]?.title || "Housekeeping & Sanitization Zones"}</h3>
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => {
                    const currentItems = formData.items || [];
                    const allChecked = currentItems.every((i: any) => i.checked);
                    setFormData({
                      ...formData,
                      items: currentItems.map((i: any) => ({ ...i, checked: !allChecked })),
                    });
                  }}
                >
                  Toggle All Completed
                </button>
              </div>

              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>Status</th>
                      <th>Zone / Area</th>
                      <th>Assigned Cleaner</th>
                      <th>Clean Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formData.items || []).map((item: any, idx: number) => (
                      <tr key={item.id || idx} className={item.checked ? "row-checked" : ""}>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={!!item.checked}
                            onChange={(e) => {
                              const newItems = [...(formData.items || [])];
                              newItems[idx] = { ...item, checked: e.target.checked };
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="custom-checkbox"
                          />
                        </td>
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
              {sections.map((sec: any) => (
                <div key={sec.id} className="table-card">
                  <div className="table-header-bar">
                    <h3>{sec.title}</h3>
                    <span className="item-count-badge">{(sec.items || []).length} units</span>
                  </div>
                  <div className="table-responsive">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Equipment</th>
                          <th>Cleaned By</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.completedItems || [])
                          .filter((ci: any) => (sec.items || []).some((i: any) => i.id === ci.id || i.name === ci.name))
                          .map((ci: any, idx: number) => {
                            const globalIdx = (formData.completedItems || []).findIndex((x: any) => x.id === ci.id);
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
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...formData.completedItems];
                                      newItems[globalIdx] = {
                                        ...ci,
                                        status: ci.status === "DONE" ? "PENDING" : "DONE",
                                      };
                                      setFormData({ ...formData, completedItems: newItems });
                                    }}
                                    className={`status-toggle-btn ${ci.status === "DONE" ? "done" : "pending"}`}
                                  >
                                    {ci.status === "DONE" ? "✓ Cleaned" : "⏳ Pending"}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. TEMPERATURE & COLD CHAIN LOG */}
          {template.category === "TEMPERATURE" && (
            <div className="table-card">
              <div className="table-header-bar">
                <h3>Cold Storage & Display Temperature Monitoring</h3>
                <span className="temp-spec-hint">Units: °C (Auto-validates against safe food tolerances)</span>
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
                      const schemaItem = sections.flatMap((s: any) => s.items || []).find((i: any) => i.id === reading.id || i.name === reading.name);
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
                              className={`table-temp-input ${!isNaN(mNum) && (mNum < min || mNum > max) ? "temp-out-of-bounds" : ""}`}
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
                              className={`table-temp-input ${!isNaN(eNum) && (eNum < min || eNum > max) ? "temp-out-of-bounds" : ""}`}
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
                <h3>Glass & Structural Safety Inspection</h3>
              </div>
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Location / Panel</th>
                      <th>Inspector</th>
                      <th>Condition</th>
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
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              const newLocs = [...(formData.locations || [])];
                              newLocs[idx] = {
                                ...loc,
                                status: loc.status === "INTACT" ? "DAMAGED" : "INTACT",
                              };
                              setFormData({ ...formData, locations: newLocs });
                            }}
                            className={`status-toggle-btn ${loc.status === "INTACT" ? "done" : "breach"}`}
                          >
                            {loc.status === "INTACT" ? "✓ Intact & Clean" : "⚠️ Damaged / Flagged"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. MONTHLY MAINTENANCE */}
          {template.category === "MAINTENANCE" && (
            <div className="table-card">
              <div className="table-header-bar">
                <h3>Periodic / Monthly Deep Maintenance Tasks</h3>
              </div>
              <div className="table-responsive">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Maintenance Task</th>
                      <th>Category</th>
                      <th>Assigned Specialist / Tech</th>
                      <th>Status</th>
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
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              const newTasks = [...(formData.tasks || [])];
                              newTasks[idx] = {
                                ...task,
                                status: task.status === "DONE" ? "PENDING" : "DONE",
                              };
                              setFormData({ ...formData, tasks: newTasks });
                            }}
                            className={`status-toggle-btn ${task.status === "DONE" ? "done" : "pending"}`}
                          >
                            {task.status === "DONE" ? "✓ Serviced" : "⏳ Pending"}
                          </button>
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
