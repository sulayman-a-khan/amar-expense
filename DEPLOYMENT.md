# Deployment Guide — Amar Hishab

You said you already have a MongoDB Atlas cluster + connection URI. This guide is ordered so you only need to slow down on the parts that are new (Cloudinary, Vercel env setup).

---

## ⚠️ Security note — read this first

Your `.env.local` contains a **real MongoDB username/password in plaintext**, and this file has now passed through an upload/chat session. Treat that password as compromised:

1. In Atlas → **Database Access** → edit your database user → **Edit Password** → generate a new one.
2. Update `MONGODB_URI` everywhere you use it (local `.env.local`, and later, Vercel env vars) with the new password.
3. Never commit `.env.local` to git — your `.gitignore` already excludes `.env*`, so you're safe there as long as you don't force-add it.

---

## Part 1 — MongoDB Atlas (you already have this — just confirm 3 things)

1. **Network Access**: Atlas → **Network Access** → confirm `0.0.0.0/0` (allow from anywhere) is added, *or* add it now. Vercel's serverless functions run from rotating IPs, so without this, your API routes will fail to connect in production.
2. **Database user permissions**: Atlas → **Database Access** → your user should have **Read and write to any database** (or scoped to `amar_hishab`).
3. **Database name in the URI**: confirm the URI path segment is `/amar_hishab` (or whatever DB name you want) — Mongoose/your `db.js` will create collections automatically on first write, no manual schema setup needed in Atlas itself.

That's it — no new cluster needed.

---

## Part 2 — Cloudinary Setup (new — needed for expense receipt photos)

1. Go to [cloudinary.com](https://cloudinary.com) → sign up for the free tier (generous enough for personal use — 25 GB storage, 25 GB bandwidth/month).
2. After signup, you land on the **Dashboard**. Copy these three values shown near the top:
   - **Cloud name**
   - **API Key**
   - **API Secret** (click "reveal" to see it)
3. Open `.env.local` in the project and replace the placeholder values:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name
CLOUDINARY_API_KEY=your_actual_api_key
CLOUDINARY_API_SECRET=your_actual_api_secret
```

4. You do **not** need to create an upload preset — the app uses **signed uploads** (`/api/upload-signature` generates a secure signature server-side), which is safer than unsigned presets since nothing public can upload to your account without going through your server first.
5. (Optional) In Cloudinary → **Settings** → **Upload** → you can set a default folder structure, but the app already organizes uploads under `amar_hishab/expenses/` automatically — no action needed.

---

## Part 3 — Push to GitHub

If you haven't already:

```bash
cd "amar app"
git init
git add .
git commit -m "Initial commit"
```

Create a new repo on [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/amar-hishab.git
git branch -M main
git push -u origin main
```

Double-check `.env.local` did **not** get committed:
```bash
git ls-files | grep .env
```
This should return nothing. If it shows `.env.local`, stop and run `git rm --cached .env.local` before pushing.

---

## Part 4 — Vercel Deployment

1. Go to [vercel.com/new](https://vercel.com/new) → sign in with GitHub.
2. **Import** your `amar-hishab` repository.
3. Vercel auto-detects Next.js — leave Build Command (`next build`) and Output Directory as default.
4. Before clicking Deploy, expand **Environment Variables** and add these one by one (copy values straight from your `.env.local`):

| Key | Value | Notes |
|---|---|---|
| `MONGODB_URI` | your Atlas connection string | Use the **rotated** password from Part 0 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name | Public — safe to expose to browser |
| `CLOUDINARY_API_KEY` | your Cloudinary API key | |
| `CLOUDINARY_API_SECRET` | your Cloudinary API secret | Never prefix this with `NEXT_PUBLIC_` |

5. Click **Deploy**. First build takes ~1–2 minutes.
6. Once deployed, Vercel gives you a URL like `amar-hishab.vercel.app`. Open it — the dashboard should load, auto-seeding 3 default bikes and 3 wallets on first visit (handled by `/api/dashboard`'s GET handler).

### Updating env vars later
If you ever rotate the Mongo password or Cloudinary keys again: Vercel Project → **Settings** → **Environment Variables** → edit → then **Deployments** → latest → **Redeploy** (env var changes need a redeploy to take effect).

---

## Part 5 — Add to Home Screen (PWA-style, no app store needed)

Since this is a mobile-first web app and not a packaged native app:

- **Android (Chrome)**: open the Vercel URL → tap the **⋮** menu → **Add to Home screen**.
- **iPhone (Safari)**: open the URL → tap the **Share** icon → **Add to Home Screen**.

The app already sets `theme-color` and `apple-mobile-web-app-capable` meta tags in `layout.js`, so it opens full-screen without browser chrome once added.

---

## Troubleshooting

- **"Failed to connect to MongoDB" in Vercel logs**: almost always the Network Access IP allowlist (Part 1, step 1). Double-check `0.0.0.0/0` is added in Atlas.
- **Dashboard is slow to load, or shows no bikes / no way to add them**: this was fixed in the latest version — the dashboard now runs all its database queries in parallel instead of one-by-one, and any load failure shows a visible error with a "Try Again" button instead of silently showing an empty dashboard. You can also now add/edit/remove bikes directly from the dashboard (tap "+ Add Bike" or tap any existing bike card).
  - If it's *still* slow after updating: your Atlas cluster region and your Vercel deployment region may be geographically far apart. In Atlas → your cluster → check the region (e.g. `us-east-1`). In Vercel → Project Settings → Functions → check the deployment region. For lowest latency from Bangladesh, a cluster/region in `ap-south-1` (Mumbai) or similar is much faster than `us-east-1`.
- **Receipt photo upload fails**: check the 3 Cloudinary env vars are spelled exactly as above (case-sensitive) and that you redeployed after adding them.
- **Dashboard shows ৳0 everywhere on first load**: this is expected if you chose to start with zero balances — the app seeds 3 default bikes and empty wallets on the very first GET to `/api/dashboard`. Use the Transfer or Income forms to add your real starting cash.
