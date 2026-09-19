"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface OutletManagerClientProps {
  initialOutlets: any[];
  allTemplates: Array<{ id: string; title: string; icon: string; category: string }>;
}

export default function OutletManagerClient({
  initialOutlets,
  allTemplates,
}: OutletManagerClientProps) {
  const router = useRouter();
  const [outlets, setOutlets] = useState<any[]>(initialOutlets);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("RESTAURANT");
  const [icon, setIcon] = useState("📍");
  const [address, setAddress] = useState("");
  const [shiftsText, setShiftsText] = useState("Morning, Afternoon, Evening, Night");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const handleOpenCreate = () => {
    setEditingOutlet(null);
    setName("");
    setCode("");
    setType("RESTAURANT");
    setIcon("🏪");
    setAddress("");
    setShiftsText("Morning, Afternoon, Evening, Night");
    setSelectedTemplates(allTemplates.map((t) => t.id));
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (outlet: any) => {
    setEditingOutlet(outlet);
    setName(outlet.name);
    setCode(outlet.code || "");
    setType(outlet.type || "RESTAURANT");
    setIcon(outlet.icon || "📍");
    setAddress(outlet.address || "");
    setShiftsText(Array.isArray(outlet.shifts) ? outlet.shifts.join(", ") : "Morning, Evening");
    setSelectedTemplates((outlet.outletTemplates || []).map((ot: any) => ot.templateId || ot.template?.id));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const shifts = shiftsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      id: editingOutlet?.id,
      name,
      code,
      type,
      icon,
      address,
      shifts: shifts.length > 0 ? shifts : ["Morning", "Evening"],
      templateIds: selectedTemplates,
    };

    try {
      const url = "/api/admin/outlets";
      const method = editingOutlet ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save outlet");

      setIsModalOpen(false);
      router.refresh();

      const listRes = await fetch("/api/admin/outlets");
      if (listRes.ok) {
        const d = await listRes.json();
        setOutlets(d.outlets || []);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-container">
      <div className="admin-header-row">
        <div>
          <h1 className="admin-page-title">Facilities & Outlets</h1>
          <p className="admin-page-subtitle">
            Manage your physical locations, kitchens, retail stores, shift schedules, and checklist assignments.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn-create-primary">
          <span>➕</span> Add New Outlet / Facility
        </button>
      </div>

      <div className="outlets-grid">
        {outlets.map((outlet) => {
          const tpls = outlet.outletTemplates || [];
          const shifts = Array.isArray(outlet.shifts) ? outlet.shifts : [];

          return (
            <div key={outlet.id} className="outlet-card">
              <div className="outlet-card-header">
                <div className="outlet-icon-circle">{outlet.icon || "📍"}</div>
                <div className="outlet-header-meta">
                  <span className="outlet-type-badge">{outlet.type}</span>
                  {outlet.code && <span className="outlet-code-badge">{outlet.code}</span>}
                </div>
              </div>

              <h3 className="outlet-title">{outlet.name}</h3>
              {outlet.address && <p className="outlet-address">📍 {outlet.address}</p>}

              <div className="outlet-shifts-row">
                <span className="shifts-label">Shifts:</span>
                {shifts.map((s: string) => (
                  <span key={s} className="shift-chip">
                    {s}
                  </span>
                ))}
              </div>

              <div className="outlet-templates-section">
                <div className="section-label">Active Checklists ({tpls.length})</div>
                <div className="template-chips-wrap">
                  {tpls.map((ot: any) => (
                    <span key={ot.template?.id || ot.id} className="template-chip">
                      {ot.template?.icon || "📋"} {ot.template?.title}
                    </span>
                  ))}
                </div>
              </div>

              <div className="outlet-stats-row">
                <span>👥 {outlet._count?.userOutlets || 0} Staff</span>
                <span>📋 {outlet._count?.submissions || 0} Submissions</span>
              </div>

              <div className="outlet-card-actions">
                <button
                  onClick={() => handleOpenEdit(outlet)}
                  className="btn-action-edit"
                >
                  ✏️ Edit Facility & Shifts
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingOutlet ? "Edit Facility" : "Add New Facility / Outlet"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="modal-form">
              {error && <div className="form-error-banner">{error}</div>}

              <div className="form-row-2">
                <div className="form-group">
                  <label>Facility / Outlet Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Downtown Central Kitchen"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Location Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. MUM-02"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Facility Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="form-select"
                  >
                    <option value="RESTAURANT">🍽️ Restaurant / Cafe</option>
                    <option value="BAKERY">🥐 Bakery / Confectionery</option>
                    <option value="CLOUD_KITCHEN">🍳 Cloud Kitchen / QSR</option>
                    <option value="FACTORY">🏭 Food Processing / Factory</option>
                    <option value="WAREHOUSE">📦 Cold Storage / Warehouse</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Icon Emoji</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="e.g. 🥐, 🍽️, ❄️"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address / Location Details</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, city, unit number..."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Operational Shifts (Comma-separated)</label>
                <input
                  type="text"
                  value={shiftsText}
                  onChange={(e) => setShiftsText(e.target.value)}
                  placeholder="Morning, Afternoon, Evening, Night"
                  className="form-input"
                />
                <span className="field-hint">
                  Defines shift handover and checklist schedule for this specific facility.
                </span>
              </div>

              <div className="form-group">
                <label>Assign Dynamic Checklists to this Facility</label>
                <div className="outlet-checkboxes-grid">
                  {allTemplates.map((t) => (
                    <label key={t.id} className="outlet-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTemplates.includes(t.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTemplates([...selectedTemplates, t.id]);
                          } else {
                            setSelectedTemplates(selectedTemplates.filter((id) => id !== t.id));
                          }
                        }}
                      />
                      <span>
                        {t.icon} {t.title}
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
                  {saving ? "Saving..." : editingOutlet ? "Update Facility" : "Add Facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
