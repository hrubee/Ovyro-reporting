"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SYSTEM_PERMISSIONS } from "@/lib/permissions";

interface UserType {
  id: string;
  name: string;
  email: string;
  role: string;
  customRoleId?: string | null;
  customRole?: { id: string; name: string; permissions?: string[] };
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  userOutlets?: Array<{
    outletId: string;
    role: string;
    outlet?: { id: string; name: string; icon: string };
  }>;
  templateAccess?: Array<{
    templateId: string;
    canSubmit: boolean;
    canVerify: boolean;
    template?: { id: string; title: string; icon: string };
  }>;
}

interface UsersClientProps {
  initialUsers: UserType[];
  outlets: Array<{ id: string; name: string; icon: string }>;
  templates: Array<{ id: string; title: string; icon: string; category: string; slug: string }>;
  customRoles: Array<{ id: string; name: string; description?: string; permissions: string[] }>;
}

export default function UsersClient({
  initialUsers,
  outlets,
  templates,
  customRoles: initialCustomRoles,
}: UsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserType[]>(initialUsers);
  const [customRoles, setCustomRoles] = useState(initialCustomRoles);
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  // User modal state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [baseRole, setBaseRole] = useState("OPERATOR");
  const [selectedCustomRole, setSelectedCustomRole] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["submit_checklists"]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>(outlets.map((o) => o.id));
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(templates.map((t) => t.id));

  // Role creation modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRolePerms, setNewRolePerms] = useState<string[]>(["submit_checklists"]);

  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    setBaseRole("OPERATOR");
    setSelectedCustomRole("");
    setSelectedPermissions(["submit_checklists"]);
    setSelectedOutlets(outlets.map((o) => o.id));
    setSelectedTemplates(templates.map((t) => t.id));
    setShowUserModal(true);
    setAlert(null);
  };

  const handleOpenEditUser = (u: UserType) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserPassword("");
    setBaseRole(u.role);
    setSelectedCustomRole(u.customRoleId || "");
    setSelectedPermissions(u.permissions || ["submit_checklists"]);
    setSelectedOutlets((u.userOutlets || []).map((uo) => uo.outletId));
    
    // If templateAccess is empty, default to all, else map granted template IDs
    const grantedTemplateIds = (u.templateAccess || []).map((ta) => ta.templateId);
    setSelectedTemplates(grantedTemplateIds.length > 0 ? grantedTemplateIds : templates.map((t) => t.id));
    
    setShowUserModal(true);
    setAlert(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    const payload = {
      id: editingUser?.id,
      name: userName,
      email: userEmail,
      password: userPassword || undefined,
      role: baseRole,
      customRoleId: selectedCustomRole || null,
      permissions: selectedPermissions,
      outletIds: selectedOutlets,
      templateAccess: selectedTemplates.map((tId) => ({
        templateId: tId,
        canSubmit: true,
        canVerify: selectedPermissions.includes("supervisor_signoff"),
      })),
    };

    try {
      const url = "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save user");

      setAlert({
        type: "success",
        msg: `✅ User "${userName}" ${editingUser ? "updated" : "created"} successfully!`,
      });
      setShowUserModal(false);
      router.refresh();

      const refreshRes = await fetch("/api/admin/users");
      if (refreshRes.ok) {
        const uList = await refreshRes.json();
        setUsers(uList);
      }
    } catch (err: any) {
      setAlert({ type: "error", msg: err.message || "Failed to save user" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDesc,
          permissions: newRolePerms,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create role");

      setCustomRoles([...customRoles, json.role]);
      setShowRoleModal(false);
      setNewRoleName("");
      setNewRoleDesc("");
      setAlert({ type: "success", msg: `✅ Role "${json.role.name}" created!` });
    } catch (err: any) {
      setAlert({ type: "error", msg: err.message || "Failed to create role" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !current }),
    });
    if (res.ok) {
      setUsers((u) => u.map((x) => (x.id === id ? { ...x, isActive: !current } : x)));
    }
  };

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-header-row">
        <div>
          <h1 className="admin-page-title">Team Roles & Dynamic Access Control</h1>
          <p className="admin-page-subtitle">
            Configure dynamic employee roles (Supervisor, Manager, Head Chef, Line Worker) and assign granular facility & checklist permissions.
          </p>
        </div>

        <div className="header-actions-group">
          <button
            onClick={() => setShowRoleModal(true)}
            className="btn-secondary-action"
          >
            🛡️ Create Dynamic Role
          </button>
          <button
            onClick={handleOpenCreateUser}
            className="btn-create-primary"
          >
            <span>➕</span> Add Team Member
          </button>
        </div>
      </div>

      {alert && (
        <div className={`notification-toast ${alert.type}`}>
          <span>{alert.type === "success" ? "✓" : "⚠️"}</span>
          <span>{alert.msg}</span>
          <button onClick={() => setAlert(null)} className="toast-close">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="nav-tabs-bar">
        <button
          onClick={() => setActiveTab("users")}
          className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
        >
          👥 Team Members ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`tab-btn ${activeTab === "roles" ? "active" : ""}`}
        >
          🛡️ Dynamic Custom Roles ({customRoles.length})
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="table-card">
          <div className="table-header-bar">
            <h3>Active Team Directory</h3>
          </div>
          <div className="table-responsive">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Employee / Member</th>
                  <th>Assigned Role</th>
                  <th>Assigned Facilities</th>
                  <th>Checklist Access</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const assignedOutlets = (u.userOutlets || []).map((uo) => uo.outlet?.name).filter(Boolean);
                  const assignedTemplates = (u.templateAccess || []).map((ta) => ta.template?.title).filter(Boolean);
                  const roleDisplayName = u.customRole?.name || u.role;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-name-cell">
                          <div className="user-mini-avatar">
                            {u.name
                              .split(" ")
                              .filter(Boolean)
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase() || "U"}
                          </div>
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <span className="user-email-sub">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${u.role.toLowerCase()}`}>
                          {roleDisplayName}
                        </span>
                      </td>
                      <td>
                        {assignedOutlets.length === 0 ? (
                          <span className="muted-text">All Facilities</span>
                        ) : (
                          <div className="facility-tags-list">
                            {assignedOutlets.map((name, i) => (
                              <span key={i} className="facility-tag">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {assignedTemplates.length === 0 ? (
                          <span className="badge-freq">All Checklists</span>
                        ) : (
                          <span className="badge-category">{assignedTemplates.length} Sheets</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${u.isActive ? "submitted" : "flagged"}`}>
                          {u.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-inline">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="btn-edit-small"
                          >
                            ✏️ Permissions
                          </button>
                          <button
                            onClick={() => toggleActive(u.id, u.isActive)}
                            className={`status-toggle-btn ${u.isActive ? "breach" : "done"}`}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Custom Roles Grid */
        <div className="templates-grid">
          {customRoles.map((role) => (
            <div key={role.id} className="template-card">
              <div className="template-card-header">
                <div className="template-icon-circle">🛡️</div>
                <span className="badge-category">{role.permissions.length} Permissions</span>
              </div>
              <h3 className="template-title">{role.name}</h3>
              <p className="template-desc">{role.description || "Custom organization role"}</p>

              <div className="permissions-chips-box">
                <span className="section-label">Granted Access:</span>
                <div className="template-chips-wrap">
                  {role.permissions.map((p) => {
                    const def = SYSTEM_PERMISSIONS.find((sp) => sp.key === p);
                    return (
                      <span key={p} className="template-chip">
                        ✓ {def?.label || p}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Create/Edit Modal with Granular Access */}
      {showUserModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingUser ? `Edit Permissions: ${editingUser.name}` : "Add New Employee"}</h2>
              <button onClick={() => setShowUserModal(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="modal-form">
              <div className="form-group">
                <label>Employee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bharti Patil"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Work Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    placeholder="user@restaurant.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>{editingUser ? "Change Password (optional)" : "Password *"}</label>
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>System Role Tier</label>
                  <select
                    value={baseRole}
                    onChange={(e) => setBaseRole(e.target.value)}
                    className="form-select"
                  >
                    <option value="OPERATOR">👷 Worker / Operator (Fill checklists)</option>
                    <option value="SUPERVISOR">🔍 Supervisor (Verify & digital sign-off)</option>
                    <option value="OUTLET_MANAGER">🏢 Facility / Branch Manager</option>
                    <option value="ORG_ADMIN">👑 Organization Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Custom Job Role Title</label>
                  <select
                    value={selectedCustomRole}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setSelectedCustomRole(rId);
                      const targetRole = customRoles.find((r) => r.id === rId);
                      if (targetRole) {
                        setSelectedPermissions(targetRole.permissions);
                      }
                    }}
                    className="form-select"
                  >
                    <option value="">Default (From Base Role)</option>
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div className="form-group">
                <label>Granular Dynamic Permissions</label>
                <div className="permissions-selection-grid">
                  {SYSTEM_PERMISSIONS.map((perm) => (
                    <label key={perm.key} className="perm-checkbox-card">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPermissions([...selectedPermissions, perm.key]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter((k) => k !== perm.key));
                          }
                        }}
                      />
                      <div>
                        <span className="perm-label">{perm.label}</span>
                        <span className="perm-desc">{perm.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Facility Access Checkboxes */}
              <div className="form-group">
                <label>Allowed Facilities / Outlets</label>
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

              {/* Specific Template Access Checkboxes */}
              <div className="form-group">
                <label>Allowed Report Tabs & Checklists</label>
                <div className="outlet-checkboxes-grid">
                  {templates.map((t) => (
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
                <button type="button" onClick={() => setShowUserModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary-save">
                  {saving ? "Saving..." : editingUser ? "Save Permissions" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Creation Modal */}
      {showRoleModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>🛡️ Create Dynamic Role</h2>
              <button onClick={() => setShowRoleModal(false)} className="modal-close-btn">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="modal-form">
              <div className="form-group">
                <label>Role Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hygiene Auditor, Head Chef, Shift Supervisor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Role Description</label>
                <input
                  type="text"
                  placeholder="Responsibilities and access scope..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Role Default Permissions</label>
                <div className="permissions-selection-grid">
                  {SYSTEM_PERMISSIONS.map((perm) => (
                    <label key={perm.key} className="perm-checkbox-card">
                      <input
                        type="checkbox"
                        checked={newRolePerms.includes(perm.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRolePerms([...newRolePerms, perm.key]);
                          } else {
                            setNewRolePerms(newRolePerms.filter((k) => k !== perm.key));
                          }
                        }}
                      />
                      <div>
                        <span className="perm-label">{perm.label}</span>
                        <span className="perm-desc">{perm.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions-bar">
                <button type="button" onClick={() => setShowRoleModal(false)} className="btn-cancel">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary-save">
                  {saving ? "Saving..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
