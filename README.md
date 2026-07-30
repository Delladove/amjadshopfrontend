# AMJC Wholesale

A wholesale/retail management app for Amjad Magic Center — bills (walk-in &
booking), product catalog with barcodes, a customer-facing storefront, and a
tablet-friendly warehouse packing screen. Rebuilt as a real client/server app
(previously a single self-contained HTML file) so multiple devices — an
admin's phone, a wall-mounted warehouse tablet, a customer kiosk — can share
the same live data.

## Architecture

```
amjc-wholesale/
├── backend/     Node.js + Express API, SQLite database
├── frontend/    React + Vite single-page app
└── docker-compose.yml   run both with one command
```

- **Frontend**: React (Vite) SPA. Talks to the backend over plain `fetch`
  calls via `frontend/src/api/*.js`. Uses React Query for data fetching/caching.
- **No WebSockets** — the Warehouse screen re-checks for new/updated orders on
  a timer (default every 4s, see `VITE_WAREHOUSE_POLL_MS`). This keeps the
  system simple and easy to reason about; it can be swapped for real-time
  push later without changing the data model.

## Running it locally


The SQLite file and uploaded images persist on your host machine under
`backend/data/` and `backend/uploads/` even if you rebuild the containers.

### Option B — running each service directly with Node

Requires Node.js 18+.

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env
npm install
npm run seed      # optional: adds a few demo categories/products
npm run dev        # http://localhost:4000

# Terminal 2 — frontend
cd frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

Open http://localhost:5173 — that's the app.

## Using it from other devices (e.g. the warehouse tablet)

Since there's no backend URL hardcoded in the frontend build — it's read from
`VITE_API_URL` at build/dev time — to let a tablet or phone on the same Wi-Fi
reach this app:

1. Find this machine's LAN IP (e.g. `192.168.1.50`).
2. Set `VITE_API_URL=http://192.168.1.50:4000` in `frontend/.env` (or as a
   Docker build arg in `docker-compose.yml`).
3. Add that same LAN URL to the backend's `CORS_ORIGIN` in `backend/.env`
   (comma-separated if you need more than one), e.g.
   `CORS_ORIGIN=http://localhost:5173,http://192.168.1.50:5173`.
4. On the tablet, open `http://192.168.1.50:5173` (or `:8080` if using Docker)
   in its browser and switch to the Warehouse role.

This is exactly what makes the warehouse tablet a genuinely separate device
that sees bills created on the admin's phone — they're both just browsers
pointed at the same backend/database.

## The three roles

Switched via the pill control at the top of the screen:

- **Admin** — Home / Bills / Products / Accounts (bottom nav). Create bills,
  manage products & categories, print barcodes, view the dashboard.
- **Customer** — a public storefront view (continuous scroll of every
  category), WhatsApp ordering. Meant to be opened via a shared link
  (`/customer?cat=<category-slug>`).
- **Warehouse** — tablet-optimized. Shows bills needing packing split into
  Walk-in/Booking tabs, and a focused one-item-at-a-time packing flow.

