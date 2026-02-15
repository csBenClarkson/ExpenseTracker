# ExpenseTracker 💰

A personal expense tracker with recurring billing, multi-currency support, calendar views, and 12 beautiful themes.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

## Features

- **Recurring Billing** — one-time, daily, weekly, biweekly, monthly, bimonthly, quarterly, semi-annually, yearly, specific weekdays, and custom day intervals
- **Calendar View** — monthly/weekly grid, date range selection, expense details per day
- **Statistics** — category breakdown, payment method charts, monthly trends, top expenses
- **Multi-Currency** — real-time exchange rates with 24h caching and dual fallback APIs
- **12 Themes** — 7 dark + 5 light, glassmorphism design with CSS custom properties
- **Custom Icons** — emoji picker or image upload for categories and payment methods

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+, Flask 3.0+, SQLite3 |
| Frontend | Vanilla JS (ES6+ IIFE modules), Tailwind CSS |
| Charts | Chart.js 4.4 |
| Icons | Font Awesome 6 |
| Production | Gunicorn |

## Quick Start

### Windows
```bash
git clone https://github.com/yourusername/ExpenseTracker.git
cd ExpenseTracker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Linux
```bash
git clone https://github.com/yourusername/ExpenseTracker.git
cd ExpenseTracker
bash run.sh              # development
bash run.sh production   # gunicorn
```

Open `http://localhost:5000`, register an account, and start tracking.

## Project Structure

```
app.py              Flask routes & API
database.py         SQLite schema & migrations
config.py           SECRET_KEY, DATABASE path
static/css/style.css   12 themes + glassmorphism
static/js/
  app.js            Navigation, modals, init
  expenses.js       Expense CRUD & rendering
  calendar.js       Calendar grid & range selection
  statistics.js     Charts & analytics
  settings.js       Preferences, categories, payment methods
  utils.js          API wrapper, currency conversion
  dropdown.js       Custom dropdown enhancer
  iconUpload.js     Emoji picker & file upload
  tooltip.js        Tooltip system
templates/
  dashboard.html    Main SPA shell
  login.html        Login page
  register.html     Registration page
```

## API Endpoints

All endpoints require authentication (`@login_required`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/expenses` | List / create expenses |
| PUT/DELETE | `/api/expenses/<id>` | Update / delete expense |
| GET/POST | `/api/categories` | List / create categories |
| DELETE | `/api/categories/<id>` | Delete category |
| GET/POST | `/api/payment-methods` | List / create payment methods |
| DELETE | `/api/payment-methods/<id>` | Delete payment method |
| GET | `/api/statistics` | Expense stats & charts |
| GET | `/api/calendar/<year>/<month>` | Calendar data |
| POST | `/api/calendar/range` | Date range report |
| GET/PUT | `/api/settings` | User settings |
| GET | `/api/currency/rates` | Exchange rates (cached 24h) |

## Billing Intervals

| Interval | Description |
|----------|-------------|
| `once` | One-time payment |
| `daily` | Every day |
| `weekdays` | Monday–Friday |
| `weekends` | Saturday–Sunday |
| `specific_days` | Custom weekdays (e.g. Mon/Wed/Fri) |
| `weekly` | Every 7 days |
| `biweekly` | Every 14 days |
| `monthly` | Same date each month |
| `bimonthly` | Every 2 months |
| `quarterly` | Every 3 months |
| `semiannually` | Every 6 months |
| `yearly` | Annually |
| `custom` | Every N days |

## Customization

**New theme**: Add `[data-theme="name"]` CSS variables in `style.css`, a theme button in `dashboard.html`, and gradient entry in `settings.js` `THEME_GRADIENTS`.

**New interval**: Add occurrence logic in `app.py` calendar endpoint, option in `expenses.js` form builder, label in `utils.js` `intervalLabel`, and badge style in `style.css`.

## Troubleshooting

- **Reset database**: Delete `expense_tracker.db` and restart — tables auto-create with defaults
- **Currency API down**: App falls back to secondary API, then hardcoded rates
- **Theme issues**: Clear browser cache; verify theme name consistency across CSS/HTML/JS

## License

MIT — see [LICENSE](LICENSE).
