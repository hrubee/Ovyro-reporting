"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Sign In Form States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register Form States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrgName, setRegOrgName] = useState("");
  const [regOutletName, setRegOutletName] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Handle Sign In
  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password. Please verify credentials or create a new account.");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  // 2. Handle Create New Account / Workspace
  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          orgName: regOrgName || `${regName}'s Kitchen`,
          outletName: regOutletName || "Main Facility",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      setSuccess("Account created! Signing you into your workspace...");

      // Automatically log the user in
      const loginRes = await signIn("credentials", {
        email: regEmail,
        password: regPassword,
        redirect: false,
      });

      if (loginRes?.error) {
        setTab("login");
        setLoginEmail(regEmail);
        setSuccess("Account created successfully! Please sign in with your password.");
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setTab("login");
    setLoginEmail(demoEmail);
    setLoginPassword(demoPass);
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

        {/* Tab Selector: Sign In vs Create Account */}
        <div className="login-tabs-bar">
          <button
            type="button"
            className={`login-tab-btn ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
              setSuccess("");
            }}
          >
            🔐 Sign In
          </button>
          <button
            type="button"
            className={`login-tab-btn ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
              setSuccess("");
            }}
          >
            ✨ Create Account
          </button>
        </div>

        {error && <div className="login-error">⚠️ {error}</div>}
        {success && <div className="login-success">✅ {success}</div>}

        {/* ─── TAB 1: SIGN IN ──────────────────────────────────────────────── */}
        {tab === "login" && (
          <>
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="login-email">Work Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@reporting.app"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
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
                  onClick={() => handleQuickLogin("supervisor@reporting.app", "Staff@123")}
                  className="demo-pill-btn"
                >
                  🛡️ Supervisor (supervisor@reporting.app)
                </button>
              </div>
            </div>
          </>
        )}

        {/* ─── TAB 2: CREATE NEW ACCOUNT & WORKSPACE ───────────────────────── */}
        {tab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="reg-name">Your Full Name *</label>
              <input
                id="reg-name"
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="e.g. Chef Marco"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Work Email Address *</label>
              <input
                id="reg-email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="marco@mykitchen.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password *</label>
              <input
                id="reg-password"
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-org">Organization / Brand Name (Optional)</label>
              <input
                id="reg-org"
                type="text"
                value={regOrgName}
                onChange={(e) => setRegOrgName(e.target.value)}
                placeholder="e.g. Skyline Grand Cafe"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-outlet">Initial Facility Name (Optional)</label>
              <input
                id="reg-outlet"
                type="text"
                value={regOutletName}
                onChange={(e) => setRegOutletName(e.target.value)}
                placeholder="e.g. Downtown Central Kitchen"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={loading}
            >
              {loading ? "Setting up workspace..." : "🚀 Create Workspace & Log In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
