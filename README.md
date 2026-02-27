# CashMosaic

Personal finance dashboard. Upload CSVs from any bank, auto-categorize transactions, and visualize spending patterns.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Recharts
- **Backend**: Supabase (Postgres + Auth + Edge Functions)

## Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in order via the SQL editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_views.sql`
   - `supabase/migrations/003_functions.sql`
3. Run `supabase/seed.sql` to populate global categories and keyword rules

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Features
- **Smart CSV Upload** — works with any bank export; auto-detects columns
- **Two-tier Categorization** — global rules for common merchants + personal rules
- **Post-import Review** — batch-categorize uncategorized transactions
- **Dashboard** — KPI cards, income vs expenses chart, category breakdown, trends
- **Transaction Management** — filter, search, inline category edit, export
- **Rules Management** — view and manage your personal keyword rules
- **Admin Panel** — user account management (admin role only)
