"use client";
import { useState } from "react";

const SHEETS = [
  { key: "HYGIENE_REPORT", label: "Hygiene", icon: "🧹", outlet: "Bakery" },
  { key: "GLASS_REPORT", label: "Glass", icon: "🪟", outlet: "Bakery" },
  { key: "FRIDGE_REPORT", label: "Fridge", icon: "🧊", outlet: "Bakery" },
  { key: "KITCHEN", label: "Kitchen", icon: "🍳", outlet: "Bakery" },
  { key: "PRODUCTION", label: "Production", icon: "🏭", outlet: "Bakery" },
  { key: "PUFF_ROOM", label: "Puff Room", icon: "🥐", outlet: "Bakery" },
  { key: "CAKE_ROOM", label: "Cake Room", icon: "🎂", outlet: "Bakery" },
  // Oreta World
  { key: "ORETA_SHOP_CLEANING", label: "House Keeping", icon: "🧹", outlet: "Oreta World" },
  { key: "ORETA_EQUIPMENT", label: "Oreta Equipment", icon: "⚙️", outlet: "Oreta World" },
  { key: "ORETA_FRIDGE", label: "Oreta Fridge", icon: "🧊", outlet: "Oreta World" },
  { key: "ORETA_GLASS", label: "Oreta Glass", icon: "🪟", outlet: "Oreta World" },
  { key: "ORETA_MONTHLY", label: "Oreta Monthly", icon: "🗓️", outlet: "Oreta World" },
];

interface UserType { id: string; name: string; email: string; }
interface AccessRecord { userId: string; sheet: string; }

export default function AccessMatrixClient({
  users, initialAccess,
}: { users: UserType[]; initialAccess: AccessRecord[] }) {
  const [access, setAccess] = useState<Set<string>>(
    new Set(initialAccess.map((a) => `${a.userId}:${a.sheet}`))
  );
  const [toggling, setToggling] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function hasAccess(userId: string, sheet: string) {
    return access.has(`${userId}:${sheet}`);
  }

  async function toggle(userId: string, sheet: string) {
    const key = `${userId}:${sheet}`;
    const granting = !access.has(key);
    setToggling(key);
    setAlert(null);

    const res = await fetch("/api/admin/access", {
      method: granting ? "POST" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, sheet }),
    });

    if (res.ok) {
      setAccess((prev) => {
        const next = new Set(prev);
        granting ? next.add(key) : next.delete(key);
        return next;
      });
    } else {
      setAlert({ type: "error", msg: "Failed to update access. Please try again." });
    }
    setToggling(null);
  }

  function grantAll(userId: string) {
    SHEETS.forEach(({ key }) => {
      if (!hasAccess(userId, key)) toggle(userId, key);
    });
  }

  function revokeAll(userId: string) {
    SHEETS.forEach(({ key }) => {
      if (hasAccess(userId, key)) toggle(userId, key);
    });
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div className="page-header-text">
          <h1>🔐 Multi-Outlet Access Matrix</h1>
          <p>Manage which sheets each employee can access across Bakery and Oreta World</p>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: "1rem" }}>{alert.msg}</div>}

      <div className="card">
        <div className="access-matrix">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                {SHEETS.map((s) => (
                  <th key={s.key} style={{ textAlign: "center", minWidth: 90 }}>
                    <div>{s.icon}</div>
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, marginTop: "2px" }}>{s.label}</div>
                    <div style={{ fontSize: "0.6rem", color: "var(--accent)" }}>{s.outlet}</div>
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={SHEETS.length + 2} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    No employees found. Add employees in the Users section first.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{u.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{u.email}</div>
                    </td>
                    {SHEETS.map((s) => {
                      const key = `${u.id}:${s.key}`;
                      const on = hasAccess(u.id, s.key);
                      const busy = toggling === key;
                      return (
                        <td key={s.key} style={{ textAlign: "center" }}>
                          <button
                            className={`access-toggle ${on ? "on" : "off"}`}
                            onClick={() => toggle(u.id, s.key)}
                            disabled={busy}
                            title={on ? `Remove ${u.name}'s access to ${s.label}` : `Grant ${u.name} access to ${s.label}`}
                          />
                        </td>
                      );
                    })}
                    <td>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button className="btn btn-sm btn-success" onClick={() => grantAll(u.id)}>All ✓</button>
                        <button className="btn btn-sm btn-danger" onClick={() => revokeAll(u.id)}>None ✗</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(120,53,15,0.06)", borderRadius: "8px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-primary)" }}>ℹ️ How it works:</strong> Toggle the switches to grant or revoke sheet access per employee. Changes take effect immediately. Admin users always have full access regardless of this matrix.
        </div>
      </div>
    </div>
  );
}
