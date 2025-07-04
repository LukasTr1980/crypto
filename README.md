# Kraken Pro Dashboard

A lightweight dashboard that fetches **portfolio, trades, deposits/withdrawals, rewards and live prices** from the Kraken Pro API and renders them in a responsive single‑page UI. The back‑end is written in TypeScript/Express, the front‑end is bundled with esbuild, and all code‑quality checks run automatically via **pre‑commit + Gitleaks**.

---

## ✨ Features

* **Live portfolio value** (EUR) calculated from your on‑exchange balances and real‑time ticker prices  
* Detailed tables for deposits, withdrawals, buys, sells, rewards and per‑coin P/L  
* Kraken pagination & rate‑limit handling built‑in  
* Hot‑reload dev workflow (`nodemon` + `esbuild --watch`)  
* Secret scanning on every commit & push (Gitleaks via pre‑commit) – no local binary required  

---

## 🚀 Quick start

```bash
# 1 – Python environment (for pre‑commit itself)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2 – Git hooks (Gitleaks auto‑compiled via Golang hook)
pre-commit install
pre-commit run --all-files     # optional full scan

# 3 – Node dependencies
npm install

# 4 – Start dev servers
npm run dev:server   # API (http://localhost:3000)
npm run dev:client   # front‑end bundler
```

---

## 🔑 Required environment variables

| key | description |
|-----|-------------|
| `KRAKEN_API_KEY`    | Kraken REST key with **query funds / ledgers / trades** permissions |
| `KRAKEN_API_SECRET` | matching secret |
| *(optional)* `NODE_ENV=production` | disables debug logs |

---

## 🛠️ Scripts

| command | what it does |
|---------|--------------|
| `npm run dev`        | parallel back‑end + front‑end watch mode |
| `npm run build`      | type‑checks & transpiles server to `dist/` + bundles front‑end |
| `npm run start:prod` | starts compiled server (`dist/server.js`) |

---
