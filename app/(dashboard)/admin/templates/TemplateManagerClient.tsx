"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface SectionItem {
  id: string;
  name: string;
  defaultAssignee?: string;
  category?: string;
  machineNumber?: string;
  referenceTemp?: string;
  targetMinTemp?: number;
  targetMaxTemp?: number;
}

interface Section {
  id: string;
  title: string;
  items: SectionItem[];
}

interface TemplateManagerClientProps {
  initialTemplates: any[];
  outlets: Array<{ id: string; name: string; icon: string; shifts?: string[] }>;
}

function safeJson(val: any, fallback: any = {}) {
  if (typeof val !== "string") return val ?? fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

const DEFAULT_STAFF = [
  "Staff Member",
  "Shift Supervisor",
  "Kitchen Lead",
  "Operator / Cleaner",
  "Technician",
];

const PRESETS: Record<string, { title: string; category: string; icon: string; frequency: string; description: string; sections: Section[] }> = {
  HOUSEKEEPING: {
    title: "Daily Housekeeping & Area SOP",
    category: "HOUSEKEEPING",
    icon: "🧹",
    frequency: "SHIFT_WISE",
    description: "Daily hygiene inspection across food preparation, customer and storage areas.",
    sections: [
      {
        id: "sec-1",
        title: "Main Kitchen & Prep Area",
        items: [
          { id: "item-1", name: "Floor & Drain Washing", defaultAssignee: "Staff Member" },
          { id: "item-2", name: "Preparation Tables Sanitization", defaultAssignee: "Staff Member" },
          { id: "item-3", name: "Wash Sinks & Grease Trap", defaultAssignee: "Staff Member" },
          { id: "item-4", name: "Trash Bins Emptied & Lined", defaultAssignee: "Staff Member" },
        ],
      },
      {
        id: "sec-2",
        title: "Customer & Service Area",
        items: [
          { id: "item-5", name: "Dining Tables & Chairs", defaultAssignee: "Staff Member" },
          { id: "item-6", name: "Cash Counter & POS Screen", defaultAssignee: "Staff Member" },
          { id: "item-7", name: "Restrooms & Handwash Station", defaultAssignee: "Staff Member" },
        ],
      },
    ],
  },
  TEMPERATURE: {
    title: "Cold Chain & Refrigeration Log",
    category: "TEMPERATURE",
    icon: "🧊",
    frequency: "DAILY",
    description: "HACCP compliant temperature monitoring for chillers, walk-ins and freezers.",
    sections: [
      {
        id: "sec-1",
        title: "Kitchen Chillers & Freezers",
        items: [
          { id: "temp-1", name: "Under-counter Chiller", machineNumber: "1", referenceTemp: "+3 to +8°C", targetMinTemp: 3, targetMaxTemp: 8 },
          { id: "temp-2", name: "Meat & Dairy Refrigerator", machineNumber: "2", referenceTemp: "+2 to +6°C", targetMinTemp: 2, targetMaxTemp: 6 },
          { id: "temp-3", name: "Deep Freezer #1", machineNumber: "1", referenceTemp: "-22 to -18°C", targetMinTemp: -22, targetMaxTemp: -18 },
        ],
      },
      {
        id: "sec-2",
        title: "Display Chillers",
        items: [
          { id: "temp-4", name: "Pastry & Dessert Display", machineNumber: "1", referenceTemp: "+2 to +8°C", targetMinTemp: 2, targetMaxTemp: 8 },
          { id: "temp-5", name: "Beverage Cooler", machineNumber: "2", referenceTemp: "+4 to +10°C", targetMinTemp: 4, targetMaxTemp: 10 },
        ],
      },
    ],
  },
  EQUIPMENT: {
    title: "Kitchen Equipment Cleaning Log",
    category: "EQUIPMENT",
    icon: "⚙️",
    frequency: "DAILY",
    description: "Sanitization and cleaning schedule for all kitchen and cafe machinery.",
    sections: [
      {
        id: "sec-1",
        title: "Cooking Equipment",
        items: [
          { id: "eq-1", name: "Convection Oven", category: "Cooking", defaultAssignee: "Staff Member" },
          { id: "eq-2", name: "Commercial Fryer", category: "Cooking", defaultAssignee: "Staff Member" },
          { id: "eq-3", name: "Dough Mixer & Hook", category: "Baking", defaultAssignee: "Staff Member" },
        ],
      },
      {
        id: "sec-2",
        title: "Beverage Machinery",
        items: [
          { id: "eq-4", name: "Espresso Machine Group Heads", category: "Beverage", defaultAssignee: "Staff Member" },
          { id: "eq-5", name: "Ice Dispenser Machine", category: "Beverage", defaultAssignee: "Staff Member" },
        ],
      },
    ],
  },
  SAFETY_GLASS: {
    title: "Glass, Pest & Facility Safety",
    category: "SAFETY_GLASS",
    icon: "🪟",
    frequency: "DAILY",
    description: "Structural safety, glass panel integrity, and pest traps audit.",
    sections: [
      {
        id: "sec-1",
        title: "Glass & Structure",
        items: [
          { id: "sf-1", name: "Front Entrance Glass Door", defaultAssignee: "Staff Member" },
          { id: "sf-2", name: "Display Glass Enclosure", defaultAssignee: "Staff Member" },
          { id: "sf-3", name: "Kitchen Partition Glass", defaultAssignee: "Staff Member" },
        ],
      },
    ],
  },
  MAINTENANCE: {
    title: "Monthly Deep Maintenance & Servicing",
    category: "MAINTENANCE",
    icon: "🗓️",
    frequency: "MONTHLY",
    description: "Periodic preventative maintenance for heavy electrical and mechanical assets.",
    sections: [
      {
        id: "sec-1",
        title: "HVAC & Heavy Machinery",
        items: [
          { id: "mm-1", name: "Air Conditioning Condenser Clean", category: "HVAC", defaultAssignee: "Technician" },
          { id: "mm-2", name: "Diesel Generator Battery & Fuel Check", category: "Electrical", defaultAssignee: "Technician" },
          { id: "mm-3", name: "Fire Extinguisher Pressure Gauge", category: "Safety", defaultAssignee: "Shift Supervisor" },
        ],
      },
    ],
  },
};

export default function TemplateManagerClient({
  initialTemplates,
  outlets,
}: TemplateManagerClientProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Editor form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("HOUSEKEEPING");
  const [icon, setIcon] = useState("📋");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [shifts, setShifts] = useState<string[]>(["Morning", "Evening"]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);

  // Sections & Builder state
  const [builderMode, setBuilderMode] = useState<"visual" | "bulk" | "preview">("visual");
  const [sections, setSections] = useState<Section[]>([]);
  const [bulkText, setBulkText] = useState("");

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    const preset = PRESETS.HOUSEKEEPING;
    setTitle(preset.title);
    setSlug("daily-housekeeping-sop");
    setCategory(preset.category);
    setIcon(preset.icon);
    setDescription(preset.description);
    setFrequency(preset.frequency);
    setShifts(["Morning", "Afternoon", "Evening", "Night"]);
    setSelectedOutlets(outlets.map((o) => o.id));
    setSections(JSON.parse(JSON.stringify(preset.sections)));
    setBulkText(
      preset.sections
        .flatMap((s) => s.items.map((i) => i.name))
        .join("\n")
    );
    setBuilderMode("visual");
    setError(null);
    setIsModalOpen(true);
  };

  const handlePresetSelect = (catKey: string) => {
    const p = PRESETS[catKey] || PRESETS.HOUSEKEEPING;
    setTitle(p.title);
    if (!editingTemplate) {
      setSlug(p.title.toLowerCase().replace(/[^a-z0-9]/g, "-"));
    }
    setCategory(p.category);
    setIcon(p.icon);
    setDescription(p.description);
    setFrequency(p.frequency);
    setSections(JSON.parse(JSON.stringify(p.sections)));
    setBulkText(p.sections.flatMap((s) => s.items.map((i) => i.name)).join("\n"));
  };

  const handleOpenEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title || "");
    setSlug(tpl.slug || "");
    setCategory(tpl.category || "HOUSEKEEPING");
    setIcon(tpl.icon || "📋");
    setDescription(tpl.description || "");
    setFrequency(tpl.frequency || "DAILY");
    setSelectedOutlets((tpl.outletTemplates || []).map((ot: any) => ot.outletId));

    const parsedSchema = safeJson(tpl.schema, { sections: [] });
    
    // Shifts
    if (parsedSchema.shifts && Array.isArray(parsedSchema.shifts)) {
      setShifts(parsedSchema.shifts);
    } else {
      setShifts(["Morning", "Evening"]);
    }

    // Sections
    if (parsedSchema.sections && Array.isArray(parsedSchema.sections) && parsedSchema.sections.length > 0) {
      setSections(JSON.parse(JSON.stringify(parsedSchema.sections)));
      const extracted = parsedSchema.sections
        .flatMap((s: any) => (s.items || []).map((i: any) => i.name || i.task || i.location))
        .join("\n");
      setBulkText(extracted);
    } else {
      // Fallback default
      const defaultSecs: Section[] = [
        {
          id: "sec-1",
          title: `${tpl.title} Checkpoints`,
          items: [
            { id: "item-1", name: "Main Inspection Area", defaultAssignee: "Staff Member" },
          ],
        },
      ];
      setSections(defaultSecs);
      setBulkText("Main Inspection Area");
    }

    setBuilderMode("visual");
    setError(null);
    setIsModalOpen(true);
  };

  // Section manipulation helpers
  const handleAddSection = () => {
    const newSec: Section = {
      id: `sec-${Date.now().toString().slice(-4)}`,
      title: `New Section ${sections.length + 1}`,
      items: [
        {
          id: `item-${Date.now().toString().slice(-4)}`,
          name: "New Checkpoint Item",
          defaultAssignee: DEFAULT_STAFF[0],
          targetMinTemp: category === "TEMPERATURE" ? 2 : undefined,
          targetMaxTemp: category === "TEMPERATURE" ? 8 : undefined,
          referenceTemp: category === "TEMPERATURE" ? "+2 to +8°C" : undefined,
        },
      ],
    };
    setSections([...sections, newSec]);
  };

  const handleDeleteSection = (secIndex: number) => {
    if (sections.length <= 1) {
      alert("Template must have at least one section.");
      return;
    }
    setSections(sections.filter((_, idx) => idx !== secIndex));
  };

  const handleUpdateSectionTitle = (secIndex: number, newTitle: string) => {
    const updated = [...sections];
    updated[secIndex].title = newTitle;
    setSections(updated);
  };

  const handleAddItem = (secIndex: number) => {
    const updated = [...sections];
    const sec = updated[secIndex];
    const count = (sec.items || []).length + 1;
    const newItem: SectionItem = {
      id: `item-${Date.now().toString().slice(-4)}-${count}`,
      name: `Checkpoint #${count}`,
      defaultAssignee: DEFAULT_STAFF[0],
      category: sec.title,
      targetMinTemp: category === "TEMPERATURE" ? 2 : undefined,
      targetMaxTemp: category === "TEMPERATURE" ? 8 : undefined,
      referenceTemp: category === "TEMPERATURE" ? "+2 to +8°C" : undefined,
      machineNumber: category === "TEMPERATURE" ? `${count}` : undefined,
    };
    sec.items = [...(sec.items || []), newItem];
    setSections(updated);
  };

  const handleUpdateItem = (secIndex: number, itemIndex: number, field: keyof SectionItem, value: any) => {
    const updated = [...sections];
    const item = { ...updated[secIndex].items[itemIndex], [field]: value };
    
    // Auto sync referenceTemp if min/max changed for temperature
    if (category === "TEMPERATURE" && (field === "targetMinTemp" || field === "targetMaxTemp")) {
      const min = field === "targetMinTemp" ? value : item.targetMinTemp ?? 0;
      const max = field === "targetMaxTemp" ? value : item.targetMaxTemp ?? 10;
      item.referenceTemp = `${min > 0 ? "+" + min : min} to ${max > 0 ? "+" + max : max}°C`;
    }

    updated[secIndex].items[itemIndex] = item;
    setSections(updated);
  };

  const handleDeleteItem = (secIndex: number, itemIndex: number) => {
    const updated = [...sections];
    updated[secIndex].items = updated[secIndex].items.filter((_, idx) => idx !== itemIndex);
    setSections(updated);
  };

  // Convert Bulk text into sections
  const handleApplyBulkText = () => {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      alert("Please enter at least one line of items.");
      return;
    }

    const newItems: SectionItem[] = lines.map((name, idx) => {
      if (category === "TEMPERATURE") {
        return {
          id: `temp-${idx + 1}`,
          name,
          machineNumber: `${idx + 1}`,
          referenceTemp: "+2 to +8°C",
          targetMinTemp: 2,
          targetMaxTemp: 8,
        };
      }
      return {
        id: `item-${idx + 1}`,
        name,
        defaultAssignee: DEFAULT_STAFF[idx % DEFAULT_STAFF.length],
        category: title,
      };
    });

    setSections([
      {
        id: "sec-1",
        title: `${title} Checklist Items`,
        items: newItems,
      },
    ]);
    setBuilderMode("visual");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate sections
    if (!sections.length || !sections.some((s) => s.items && s.items.length > 0)) {
      setError("Please add at least one checkpoint item to the template.");
      setSaving(false);
      return;
    }

    const schema = {
      type: category,
      frequency,
      shifts: frequency === "SHIFT_WISE" ? shifts : undefined,
      sections,
    };

    const payload = {
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      category,
      icon,
      description,
      frequency,
      schema,
      outletIds: selectedOutlets,
    };

    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate.id}`
        : "/api/admin/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save template");

      showToast(editingTemplate ? `✓ "${title}" updated successfully!` : `✓ "${title}" created successfully!`);
      setIsModalOpen(false);

      // Refresh list
      const listRes = await fetch("/api/admin/templates");
      if (listRes.ok) {
        const d = await listRes.json();
        setTemplates(d.templates || []);
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Report Tab "${name}"? All associated checklist assignments will be removed.`)) return;
    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete report tab");

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      showToast(`✓ Report Tab "${name}" deleted.`);

      const listRes = await fetch("/api/admin/templates");
      if (listRes.ok) {
        const d = await listRes.json();
        setTemplates(d.templates || []);
      }
      router.refresh();
    } catch (e: any) {
      alert(e.message || "Failed to delete report tab");
    }
  };

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {successToast && (
        <div className="notification-toast success">
          <span>✓</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h1 className="admin-page-title">Report Tabs</h1>
          <p className="admin-page-subtitle">
            Configure custom Report Tabs (checklists, equipment logs, temperature logs, hygiene SOPs) assigned across your outlets.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-create-primary">
          <span>➕</span> Create New Report Tab
        </button>
      </div>

      {/* Templates / Report Tabs Grid */}
      <div className="templates-grid">
        {templates.length === 0 ? (
          <div className="empty-state-card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
            <span style={{ fontSize: "2.5rem" }}>📑</span>
            <h3 style={{ margin: "1rem 0 0.5rem" }}>No Report Tabs Configured</h3>
            <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
              Get started by creating your first Report Tab or choosing a quick-start preset.
            </p>
            <button onClick={handleOpenCreate} className="btn-create-primary" style={{ display: "inline-flex" }}>
              <span>➕</span> Create New Report Tab
            </button>
          </div>
        ) : (
          templates.map((tpl) => {
            const assignedCount = (tpl.outletTemplates || []).length;
            const parsed = safeJson(tpl.schema, {});
            const totalItems = (parsed.sections || []).reduce(
              (acc: number, s: any) => acc + (s.items || []).length,
              0
            );

            return (
              <div key={tpl.id} className="template-card">
                <div className="template-card-header">
                  <div className="template-icon-circle">{tpl.icon || "📋"}</div>
                  <div className="template-badges">
                    <span className="badge-category">{tpl.category}</span>
                    <span className="badge-freq">{tpl.frequency}</span>
                  </div>
                </div>

                <h3 className="template-title">{tpl.title}</h3>
                <p className="template-desc">{tpl.description || "No description provided."}</p>

                <div className="template-meta-row">
                  <span className="meta-item">
                    🏢 {assignedCount} {assignedCount === 1 ? "Outlet" : "Outlets"}
                  </span>
                  <span className="meta-item">
                    📋 {totalItems} {totalItems === 1 ? "Item" : "Items"}
                  </span>
                  <span className="meta-item">
                    📝 {tpl._count?.submissions || 0} Records
                  </span>
                  <span className="meta-item">v{tpl.version || 1}</span>
                </div>

                <div className="template-actions-row">
                  <button
                    onClick={() => handleOpenEdit(tpl)}
                    className="btn-action-edit"
                  >
                    ✏️ Edit Report Tab
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id, tpl.title)}
                    className="btn-action-delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>


      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card modal-lg">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">{icon}</span>
                <div>
                  <h2>{editingTemplate ? `Edit: ${editingTemplate.title}` : "Create New Report Tab"}</h2>
                  <p className="modal-subtitle">Configure sections, checkpoints, equipment items, shifts & outlet distribution</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {error && <div className="form-error-banner">{error}</div>}

              {/* Quick Presets (For New Templates) */}
              {!editingTemplate && (
                <div className="preset-selector-row">
                  <span className="preset-label">⚡ Quick Presets:</span>
                  {Object.keys(PRESETS).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePresetSelect(key)}
                      className={`preset-btn ${category === key ? "active" : ""}`}
                    >
                      {PRESETS[key].icon} {PRESETS[key].category}
                    </button>
                  ))}
                </div>
              )}

              {/* Form Metadata */}
              <div className="form-section-card">
                <h3 className="section-subtitle">1. Report Tab Information & Settings</h3>
                
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Report Tab Title *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (!editingTemplate) {
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                        }
                      }}
                      placeholder="e.g. Cold Chain Storage Log"
                      className="form-input"
                    />
                  </div>


                  <div className="form-group">
                    <label>URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. cold-chain-storage"
                      className="form-input"
                      disabled={!!editingTemplate}
                    />
                  </div>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label>Category Archetype</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="form-select"
                    >
                      <option value="HOUSEKEEPING">🧹 Housekeeping & Area SOPs</option>
                      <option value="EQUIPMENT">⚙️ Equipment Cleaning Log</option>
                      <option value="TEMPERATURE">🧊 Temperature & Cold Chain</option>
                      <option value="SAFETY_GLASS">🪟 Safety, Glass & Pest</option>
                      <option value="MAINTENANCE">🗓️ Periodic Maintenance</option>
                      <option value="CUSTOM">📋 Custom Audit</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Icon Emoji</label>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      placeholder="e.g. 🥐"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Audit Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="form-select"
                    >
                      <option value="SHIFT_WISE">Shift-Wise (Morning/Evening/Night)</option>
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Instructions for operators and supervisors..."
                    className="form-input"
                  />
                </div>

                {/* Shift Configuration if SHIFT_WISE */}
                {frequency === "SHIFT_WISE" && (
                  <div className="form-group shift-config-box">
                    <label>Configured Shifts for this Template</label>
                    <div className="shift-tags-row">
                      {["Morning", "Afternoon", "Evening", "Night"].map((s) => (
                        <label key={s} className="shift-tag-label">
                          <input
                            type="checkbox"
                            checked={shifts.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setShifts([...shifts, s]);
                              } else {
                                setShifts(shifts.filter((x) => x !== s));
                              }
                            }}
                          />
                          <span>{s} Shift</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sections & Checkpoint Builder */}
              <div className="form-section-card">
                <div className="section-header-bar">
                  <div>
                    <h3 className="section-subtitle">2. Sections & Inspection Checkpoints</h3>
                    <p className="field-hint">
                      Add sections and checkpoint rows. For Temperature categories, specify min/max safe temperature tolerances.
                    </p>
                  </div>
                  <div className="builder-mode-tabs">
                    <button
                      type="button"
                      onClick={() => setBuilderMode("visual")}
                      className={`mode-tab-btn ${builderMode === "visual" ? "active" : ""}`}
                    >
                      🎨 Visual Builder
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuilderMode("bulk")}
                      className={`mode-tab-btn ${builderMode === "bulk" ? "active" : ""}`}
                    >
                      📝 Bulk Quick-Paste
                    </button>
                    <button
                      type="button"
                      onClick={() => setBuilderMode("preview")}
                      className={`mode-tab-btn ${builderMode === "preview" ? "active" : ""}`}
                    >
                      👁️ Live Preview
                    </button>
                  </div>
                </div>

                {/* Mode 1: Visual Structured Builder */}
                {builderMode === "visual" && (
                  <div className="visual-builder-container">
                    {sections.map((sec, secIdx) => (
                      <div key={sec.id || secIdx} className="builder-section-card">
                        <div className="builder-section-header">
                          <div className="section-title-input-wrap">
                            <span className="sec-number">Section {secIdx + 1}:</span>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => handleUpdateSectionTitle(secIdx, e.target.value)}
                              placeholder="Section Title (e.g. Kitchen Cold Storage)"
                              className="section-title-input"
                            />
                          </div>
                          <div className="section-actions">
                            <button
                              type="button"
                              onClick={() => handleAddItem(secIdx)}
                              className="btn-add-item-small"
                            >
                              ➕ Add Item
                            </button>
                            {sections.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(secIdx)}
                                className="btn-delete-section"
                                title="Delete Section"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="builder-items-list">
                          {sec.items.map((item, itemIdx) => (
                            <div key={item.id || itemIdx} className="builder-item-row">
                              <span className="item-index">{itemIdx + 1}</span>

                              <div className="item-input-main">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) =>
                                    handleUpdateItem(secIdx, itemIdx, "name", e.target.value)
                                  }
                                  placeholder="Item / Equipment / Zone Name"
                                  className="form-input item-name-field"
                                />
                              </div>

                              {/* Assignee */}
                              <div className="item-assignee-col">
                                <select
                                  value={item.defaultAssignee || DEFAULT_STAFF[0]}
                                  onChange={(e) =>
                                    handleUpdateItem(secIdx, itemIdx, "defaultAssignee", e.target.value)
                                  }
                                  className="form-select item-select"
                                >
                                  {DEFAULT_STAFF.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Temperature Specific Columns */}
                              {category === "TEMPERATURE" && (
                                <>
                                  <div className="item-temp-col">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={item.targetMinTemp ?? 2}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          secIdx,
                                          itemIdx,
                                          "targetMinTemp",
                                          parseFloat(e.target.value)
                                        )
                                      }
                                      placeholder="Min °C"
                                      className="form-input temp-num-input"
                                      title="Minimum Safe Temperature (°C)"
                                    />
                                    <span className="temp-to">to</span>
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={item.targetMaxTemp ?? 8}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          secIdx,
                                          itemIdx,
                                          "targetMaxTemp",
                                          parseFloat(e.target.value)
                                        )
                                      }
                                      placeholder="Max °C"
                                      className="form-input temp-num-input"
                                      title="Maximum Safe Temperature (°C)"
                                    />
                                  </div>
                                  <div className="item-unit-col">
                                    <input
                                      type="text"
                                      value={item.machineNumber || `${itemIdx + 1}`}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          secIdx,
                                          itemIdx,
                                          "machineNumber",
                                          e.target.value
                                        )
                                      }
                                      placeholder="Unit #"
                                      className="form-input unit-num-input"
                                      title="Machine / Unit Number"
                                    />
                                  </div>
                                </>
                              )}

                              {/* Delete Item */}
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(secIdx, itemIdx)}
                                className="btn-delete-item"
                                title="Remove checkpoint"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="btn-add-section-dashed"
                    >
                      ➕ Add Another Section
                    </button>
                  </div>
                )}

                {/* Mode 2: Bulk Text Editor */}
                {builderMode === "bulk" && (
                  <div className="bulk-builder-container">
                    <p className="field-hint">
                      Paste or type checkpoint items one per line. Clicking "Apply Items" will automatically populate the visual checklist.
                    </p>
                    <textarea
                      rows={8}
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="Kitchen Fryer 1&#10;Main Convection Oven&#10;Cold Prep Table&#10;Dishwashing Sink"
                      className="form-textarea"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkText}
                      className="btn-apply-bulk"
                    >
                      ⚡ Apply & Convert to Checkpoints
                    </button>
                  </div>
                )}

                {/* Mode 3: Live Preview */}
                {builderMode === "preview" && (
                  <div className="preview-container">
                    <div className="preview-header-mock">
                      <span className="preview-badge">{category}</span>
                      <h4>{title || "Untitled Template"}</h4>
                      <p>{description || "No description provided."}</p>
                    </div>

                    {sections.map((sec, sIdx) => (
                      <div key={sIdx} className="preview-section-mock">
                        <div className="preview-section-title">{sec.title}</div>
                        <table className="preview-table-mock">
                          <thead>
                            <tr>
                              <th>Checkpoint</th>
                              <th>Default Assignee</th>
                              {category === "TEMPERATURE" && <th>Tolerance</th>}
                              <th>Preview Input</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sec.items.map((it, iIdx) => (
                              <tr key={iIdx}>
                                <td className="font-semibold">{it.name}</td>
                                <td>{it.defaultAssignee || "Staff"}</td>
                                {category === "TEMPERATURE" && (
                                  <td>
                                    <span className="safe-range-badge">
                                      {it.targetMinTemp}°C to {it.targetMaxTemp}°C
                                    </span>
                                  </td>
                                )}
                                <td>
                                  {category === "TEMPERATURE" ? (
                                    <select disabled className="mock-input" style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "4px" }}>
                                      <option>{it.targetMinTemp !== undefined ? `${((it.targetMinTemp + (it.targetMaxTemp ?? 8)) / 2).toFixed(1)}°C (Optimal)` : "4.0°C (Safe)"}</option>
                                    </select>
                                  ) : (
                                    <div className="touch-btn-toggle" style={{ opacity: 0.9 }}>
                                      <button type="button" className="touch-btn-option active-yes" style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem" }}>
                                        ✓ YES
                                      </button>
                                      <button type="button" className="touch-btn-option" style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem" }}>
                                        ✕ NO
                                      </button>
                                      <button type="button" className="touch-btn-option" style={{ padding: "0.2rem 0.45rem", fontSize: "0.7rem" }}>
                                        — N/A
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outlet Distribution */}
              <div className="form-section-card">
                <div className="outlet-assign-header">
                  <h3 className="section-subtitle">3. Assign Report Tab to Facilities & Outlets</h3>
                  <div className="outlet-quick-buttons">
                    <button
                      type="button"
                      onClick={() => setSelectedOutlets(outlets.map((o) => o.id))}
                      className="btn-link-small"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedOutlets([])}
                      className="btn-link-small"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="outlet-checkboxes-grid">
                  {outlets.map((o) => (
                    <label key={o.id} className="outlet-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedOutlets.includes(o.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOutlets([...selectedOutlets, o.id]);
                          } else {
                            setSelectedOutlets(selectedOutlets.filter((id) => id !== o.id));
                          }
                        }}
                      />
                      <span>
                        {o.icon} {o.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="modal-actions-bar">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary-save"
                >
                  {saving ? "Saving Report Tab..." : editingTemplate ? "Update Report Tab" : "Create Report Tab"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
