# Railway Deployment Guide — Reporting SaaS

This guide explains how to deploy **Reporting Software** as a multi-tenant SaaS application on [Railway](https://railway.app) with a PostgreSQL database.

---

## 1. Create a New Project on Railway

1. Go to your [Railway Dashboard](https://railway.app/dashboard).
2. Click **New Project** $\rightarrow$ **Provision PostgreSQL**.
3. Railway will provision a dedicated PostgreSQL database and automatically expose `DATABASE_URL`.

---

## 2. Deploy from GitHub

1. Click **+ New** $\rightarrow$ **GitHub Repo**.
2. Select your newly pushed GitHub repository containing this project.
3. Railway will automatically detect Next.js and read [railway.json](file:///Users/hrushi/Downloads/Desktop%20offline/vibe%20coding/Reporting%20software%20/hygiene-app/railway.json).

---

## 3. Configure Environment Variables in Railway

In your Railway web service settings under **Variables**, set the following:

| Variable | Recommended Value | Notes |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Connects directly to the Railway PostgreSQL database |
| `AUTH_SECRET` | Generate a 32-character random string | e.g. `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Your Railway public domain |
| `NODE_ENV` | `production` | Production mode |

---

## 4. Automatic Database Sync & Seeding

The provided [railway.json](file:///Users/hrushi/Downloads/Desktop%20offline/vibe%20coding/Reporting%20software%20/hygiene-app/railway.json) automatically executes:
1. `npx prisma generate && npm run build` during build time.
2. `npx prisma db push` and `npm run db:seed` during first deployment start to populate default organizations, outlets, and templates.

---

## 5. Default Demo Credentials

Once deployed, you can immediately log in with:

- **Admin Account**:
  - Email: `admin@reporting.app`
  - Password: `Admin@123`
- **Supervisor Account**:
  - Email: `aboli@reporting.app`
  - Password: `Pnr@123`
- **Staff / Operator Account**:
  - Email: `bharti@reporting.app`
  - Password: `Pnr@123`
