"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface TemplateManagerClientProps {
  initialTemplates: any[];
  outlets: Array<{ id: string; name: string; icon: string }>;
}

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

  // Editor form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("HOUSEKEEPING");
  const [icon, setIcon] = useState("📋");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]);
  const [itemsText, setItemsText] = useState("");

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setTitle("");
    setSlug("");
    setCategory("HOUSEKEEPING");
    setIcon("🧹");
    setDescription("");
    setFrequency("DAILY");
    setSelectedOutlets(outlets.map((o) => o.id));
    setItemsText(
      "Main Kitchen\nDining Area\nRestrooms\nStorage Room\nWaste Disposal Station"
    );
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    setTitle(tpl.title);
    setSlug(tpl.slug);
    setCategory(tpl.category);
    setIcon(tpl.icon || "📋");
    setDescription(tpl.description || "");
    setFrequency(tpl.frequency || "DAILY");
    setSelectedOutlets((tpl.outletTemplates || []).map((ot: any) => ot.outletId));

    // Extract item names into text lines for quick editing
    const extracted = (tpl.schema?.sections || [])
      .flatMap((s: any) => (s.items || []).map((i: any) => i.name || i.task || i.location))
      .join("\n");
    setItemsText(extracted);

    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const lines = itemsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const generatedItems = lines.map((name, idx) => {
      if (category === "TEMPERATURE") {
        return {
          id: `temp-${idx + 1}`,
          name,
          machineNumber: `${idx + 1}`,
          referenceTemp: "+3 to +8°C",
          targetMinTemp: 3,
          targetMaxTemp: 8,
        };
      }
      return {
        id: `item-${idx + 1}`,
        name,
        defaultAssignee: "Staff Member",
      };
    });

    const schema = {
      type: category,
      sections: [
        {
          id: "section-1",
          title: `${title} Items & Checkpoints`,
          items: generatedItems,
        },
      ],
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

      setIsModalOpen(false);
      router.refresh();
      // Reload templates list
      const listRes = await fetch("/api/admin/templates");
      if (listRes.ok) {
        const d = await listRes.json();
        setTemplates(d.templates || []);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to archive this template?")) return;
    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h1 className="admin-page-title">Dynamic Template Builder</h1>
          <p className="admin-page-subtitle">
            Create, customize, and assign inspection checklists, equipment logs, and SOPs across your facilities.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-create-primary">
          <span>➕</span> Create New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="templates-grid">
        {templates.map((tpl) => {
          const assignedCount = (tpl.outletTemplates || []).length;
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
                  📝 {tpl._count?.submissions || 0} Submissions
                </span>
                <span className="meta-item">v{tpl.version}</span>
              </div>

              <div className="template-actions-row">
                <button
                  onClick={() => handleOpenEdit(tpl)}
                  className="btn-action-edit"
                >
                  ✏️ Edit Template
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="btn-action-delete"
                >
                  🗑️ Archive
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingTemplate ? "Edit Template" : "Create New Dynamic Template"}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {error && <div className="form-error-banner">{error}</div>}

              <div className="form-row-2">
                <div className="form-group">
                  <label>Template Title *</label>
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
                    <option value="SHIFT_WISE">Shift-Wise (Morning/Evening)</option>
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
                  placeholder="Brief description for staff and supervisors..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Checklist Items / Equipment / Zones (One per line)</label>
                <textarea
                  rows={5}
                  value={itemsText}
                  onChange={(e) => setItemsText(e.target.value)}
                  placeholder="Kitchen Fryer 1&#10;Main Oven&#10;Dough Mixer&#10;Preparation Table"
                  className="form-textarea"
                />
                <span className="field-hint">
                  Each line will create a dynamic checkpoint row for your staff to inspect and log.
                </span>
              </div>

              <div className="form-group">
                <label>Assign to Facilities & Outlets</label>
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
                  {saving ? "Saving..." : editingTemplate ? "Update Template" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
