# ExpenseTracker — AI Agent Instructions

## Architecture Overview

Single-file Flask backend (`app.py`) serving a SPA-like frontend. No build step — vanilla JS modules loaded via `<script>` tags from `static/js/`. All data lives in a single SQLite3 database (`expense_tracker.db`), auto-created on first run via `database.py` `SCHEMA`.

**Data flow:** Browser → Flask API (`/api/*` JSON endpoints) → SQLite3 → JSON responses → Frontend IIFE modules render DOM directly.

**Key domain concept:** Two distinct trackable types exist — **Expenses** (bills with recurring intervals) and **Consumption Items** (depletable goods like toothpaste with a daily `consuming_rate`). Both contribute to monthly cost totals and appear in calendar/statistics views.

## Project Layout

```
app.py              — All Flask routes: auth, CRUD APIs, statistics, calendar data
database.py         — get_db(), init_db(), SCHEMA string (6 tables, all per-user)
config.py           — SECRET_KEY, DATABASE path from env vars
static/css/style.css — 7 themes via CSS custom properties on [data-theme="..."]
static/js/utils.js  — ET.Utils: API wrapper, currency conversion, formatMoney, toast
static/js/app.js    — ET.App: view router, modal system, init bootstrap
static/js/expenses.js    — ET.Expenses: CRUD, board cards, table rendering
static/js/consumption.js — ET.Consumption: CRUD, progress bars, refill
static/js/calendar.js    — ET.Calendar: monthly grid, recurring occurrence calc
static/js/statistics.js  — ET.Statistics: Chart.js charts
static/js/settings.js    — ET.Settings: user prefs, category/payment method CRUD
templates/dashboard.html  — Main SPA shell (all 6 view sections in one page)
```

## Critical Patterns

### Backend API Convention
All API routes follow this exact pattern — **always replicate it** for new endpoints:
- Protected with `@login_required` decorator (returns 401 JSON for API, redirects for pages)
- User scoping: every query includes `WHERE user_id = ?` using `session['user_id']`
- JSON in/out: `request.get_json()` → `jsonify({...})`
- DB access via `get_db()` (request-scoped connection from Flask's `g`)
- Return `{'status': 'ok'}` on mutations; use `SELECT last_insert_rowid()` for new IDs

### Frontend Module System
All JS uses the **IIFE-on-`window.ET` namespace** pattern — no imports/bundler:
```javascript
window.ET = window.ET || {};
ET.ModuleName = (function () {
    // private state
    let _data = [];
    // public API returned at bottom
    return { load, render, ... };
})();
```
Modules communicate through `ET.Utils` (shared state: categories, paymentMethods, settings, displayCurrency) and `ET.App.refreshCurrentView()` / `ET.App.openModal()`.

### Currency Handling
Amounts are **stored in their original currency** in the DB. Conversion happens **client-side only** using `ET.Utils.convert(amount, fromCurrency, toCurrency)` with rates fetched from `/api/currency/rates`. The backend provides fallback hardcoded rates when the external API is unreachable. When adding views or touching amounts, always use `ET.Utils.convertAndFormat()` to display in the user's chosen display currency.

### Theming System
Themes are CSS-only via `[data-theme="name"]` selectors defining `--bg-from`, `--bg-via`, `--bg-to`, `--surface`, `--card`, `--accent`, etc. (20 custom properties per theme). Adding a new theme requires: CSS vars block in `style.css`, a `<button data-theme="...">` in `dashboard.html` theme dropdown, and an entry in `settings.js` `THEME_GRADIENTS`.

### Database Schema Conventions
- All user-owned tables have `user_id INTEGER NOT NULL` with `FOREIGN KEY → users(id) ON DELETE CASCADE`
- Booleans stored as `INTEGER` (0/1) — e.g., `is_active`, `auto_repurchase`
- Dates stored as `TEXT` in `YYYY-MM-DD` format
- Schema uses `CREATE TABLE IF NOT EXISTS` — safe to re-run; migrations require manual `ALTER TABLE`

### Billing Intervals
Expenses support: `once`, `daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`, `custom` (with `custom_interval_days`). The calendar endpoint in `app.py` computes all occurrences for a given month — **any new interval type must be added both in the calendar route's occurrence logic and the frontend interval badges/labels**.

## Running the App

```bash
# Development (Windows)
.venv/Scripts/python.exe app.py

# Development (Linux)
bash run.sh

# Production (Linux)
bash run.sh production   # uses gunicorn -w 4
```

The DB file auto-creates on first run. Deleting `expense_tracker.db` resets all data. New users get seeded default categories (12) and payment methods (6) via `seed_defaults()`.

## Adding a New Feature Checklist

1. **DB changes** → Add to `SCHEMA` in `database.py` (existing DBs need manual `ALTER TABLE`)
2. **API route** → Add in `app.py` following the `@login_required` + user-scoped pattern
3. **JS module** → Create `static/js/newmodule.js` using the IIFE-on-ET pattern, add `<script>` tag in `dashboard.html`
4. **View section** → Add `<section id="view-name" class="view-section hidden">` in `dashboard.html`
5. **Navigation** → Add `<a data-view="name" class="nav-link">` in the sidebar nav
6. **View router** → Add `case 'name':` in `ET.App.showView()` switch in `app.js`
