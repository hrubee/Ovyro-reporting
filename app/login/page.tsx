"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="login-page">
      <div className="login-bg-gradient" />

      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon">📋</div>
          <h1>Reporting SaaS</h1>
          <p>Multi-Tenant Audit, Hygiene & SOP Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">⚠️ {error}</div>}

          <div className="form-group">
            <label htmlFor="email">Work Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@reporting.app"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? "Signing in..." : "🔐 Sign In to Workspace"}
          </button>
        </form>

        {/* Quick Demo Credentials Bar */}
        <div className="demo-credentials-box">
          <span className="demo-title">Quick Demo Logins:</span>
          <div className="demo-buttons-row">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin@reporting.app", "Admin@123")}
              className="demo-pill-btn"
            >
              👑 Admin (admin@reporting.app)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("bharti@reporting.app", "Pnr@123")}
              className="demo-pill-btn"
            >
              👷 Staff (bharti@reporting.app)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
