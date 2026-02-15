
# ExpenseTracker — AI Agent Coding Guide

## Architecture & Data Flow

- **Single-file Flask backend** (`app.py`) exposes all API endpoints and routes, serving a SPA frontend.
- **Frontend**: Pure ES6+ JS modules (IIFE-on-`window.ET`), loaded via `<script>` tags from `static/js/`.
- **Database**: All data in a single SQLite3 file (`expense_tracker.db`), schema in `database.py` (`SCHEMA`).
- **Data flow**: Browser ⇄ Flask `/api/*` (JSON) ⇄ SQLite3 ⇄ JSON ⇄ JS modules render DOM directly.
- **Domain**: **Expenses** with flexible recurring billing intervals. Expenses appear in board, calendar, and statistics views with multi-currency conversion.

## Key Conventions & Patterns

- **API endpoints**: Always use `@login_required`, user scoping (`WHERE user_id = ?`), JSON in/out, DB via `get_db()`, return `{'status': 'ok'}` for mutations, use `SELECT last_insert_rowid()` for new IDs.
- **Frontend modules**: IIFE pattern on `window.ET`. Example:
    ```js
    window.ET = window.ET || {};
    ET.Module = (function () {
        // ...private state...
        return { load, render, ... };
    })();
    ```
- **Module communication**: Use `ET.Utils` for shared state (categories, paymentMethods, settings, displayCurrency). Use `ET.App.refreshCurrentView()` and `ET.App.openModal()` for view updates.
- **Currency**: Amounts stored in original currency. All conversion is client-side via `ET.Utils.convert()` and `ET.Utils.convertAndFormat()`, using `/api/currency/rates` (with fallback rates if API fails).
- **Themes**: CSS custom properties on `[data-theme="name"]` in `static/css/style.css`. Add new themes by updating CSS, `dashboard.html` theme dropdown, and `THEME_GRADIENTS` in `settings.js`.
- **Database**: All user tables have `user_id INTEGER NOT NULL` with `ON DELETE CASCADE`. Booleans as `INTEGER` (0/1). Dates as `TEXT` (`YYYY-MM-DD`). Schema uses `CREATE TABLE IF NOT EXISTS` (migrations require manual `ALTER TABLE`).
- **Billing intervals**: Supported: `once`, `daily`, `weekdays`, `weekends`, `specific_days`, `weekly`, `biweekly`, `monthly`, `bimonthly`, `quarterly`, `semiannually`, `yearly`, `custom` (with `custom_interval_days`). **Any new interval must be added in `app.py` (calendar logic), `expenses.js` (form + labels), `utils.js` (intervalLabel), and `style.css` (badge).**

## Project Structure (Key Files)

- `app.py`: All Flask routes, API, calendar/statistics logic
- `database.py`: DB schema, migrations, `get_db()`
- `static/js/expenses.js`: Expense CRUD, board/table rendering
- `static/js/calendar.js`: Calendar grid, recurring logic
- `static/js/utils.js`: API wrapper, currency, formatting
- `static/js/settings.js`: User prefs, theme logic
- `static/css/style.css`: All themes, glassmorphism, variables
- `templates/dashboard.html`: SPA shell, all views, theme dropdown

## Developer Workflows

- **Windows dev**: `.venv/Scripts/python.exe app.py`
- **Linux dev**: `bash run.sh`
- **Production**: `bash run.sh production` (uses gunicorn)
- **DB reset**: Delete `expense_tracker.db` and restart app
- **First run**: DB auto-creates, default categories/payment methods seeded

## Adding Features (Checklist)

1. **DB changes**: Update `SCHEMA` in `database.py` (manual `ALTER TABLE` for existing DBs)
2. **API**: Add route in `app.py` (use `@login_required`, user scoping)
3. **Frontend**: New JS module in `static/js/`, IIFE-on-ET pattern, add `<script>` to `dashboard.html`
4. **Views**: Add `<section id="..." class="view-section hidden">` in `dashboard.html`
5. **Navigation**: Add `<a data-view="..." class="nav-link">` in sidebar
6. **Router**: Add `case '...'` in `ET.App.showView()` in `app.js`

## Examples & Integration Points

- **Expense interval logic**: See `app.py` (calendar endpoint) and `expenses.js` (interval badges)
- **Theme addition**: Update `style.css`, `dashboard.html`, and `settings.js`
- **Currency fallback**: `/api/currency/rates` uses primary API → Fawazahmed0 CDN fallback → hardcoded rates

---
For more, see [README.md](../../README.md) and in-file comments. When in doubt, follow the IIFE-on-ET pattern and user-scoped API conventions.
