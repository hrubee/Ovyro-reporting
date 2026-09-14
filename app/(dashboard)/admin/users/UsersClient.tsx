"use client";
import { useState } from "react";

interface UserType { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; }

export default function UsersClient({ initialUsers }: { initialUsers: UserType[] }) {
  const [users, setUsers] = useState<UserType[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" });
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  async function createUser(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setAlert(null);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setUsers((u) => [...u, data]);
      setAlert({ type: "success", msg: `✅ User "${data.name}" created!` });
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE" });
      setShowModal(false);
    } else {
      setAlert({ type: "error", msg: data.error || "Failed to create user." });
    }
    setSaving(false);
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !current }),
    });
    if (res.ok) setUsers((u) => u.map((x) => x.id === id ? { ...x, isActive: !current } : x));
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>👥 User Management</h1>
          <p>Create and manage employee accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowModal(true); setAlert(null); }}>
          ➕ Add Employee
        </button>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: "1rem" }}>{alert.msg}</div>}

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: "white" }}>
                        {(u.name || u.email || "U").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                      </div>
                      {u.name}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{u.email}</td>
                  <td><span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span></td>
                  <td><span className={`badge badge-${u.isActive ? "active" : "inactive"}`}>{u.isActive ? "Active" : "Inactive"}</span></td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className={`btn btn-sm ${u.isActive ? "btn-danger" : "btn-success"}`}
                        onClick={() => toggleActive(u.id, u.isActive)}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">➕ Add New Employee</div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={createUser}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@pnr.com" required />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" required minLength={6} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="EMPLOYEE">Employee</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create User"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
