# ExpenseTracker 💰

A modern, feature-rich web application for tracking expenses and consumption items with beautiful themes, currency conversion, and intelligent recurring billing management.

![ExpenseTracker](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

## ✨ Features

### 💳 Expense Management
- **Recurring Billing Intervals**: Support for one-time, daily, weekly, biweekly, monthly, quarterly, yearly, and custom intervals
- **Advanced Scheduling**: Specific days of week (Mon-Fri), specific dates of month (1st, 15th, 30th), weekdays-only, and weekends-only options
- **Multi-Currency Support**: Track expenses in different currencies with automatic conversion
- **Categories & Payment Methods**: Organize expenses with customizable categories and payment methods
- **Custom Icons**: Use emojis or upload your own images (PNG, JPG, WebP, SVG) for categories and payment methods
- **Active/Inactive Tracking**: Mark expenses as active or inactive without deleting them
- **Smart Filtering**: Filter by category, payment method, billing interval, and search by keywords

### 🧴 Consumption Items
- **Depletable Goods Tracking**: Monitor items like toothpaste, soap, shampoo, etc.
- **Consumption Rate**: Set daily consumption percentage (e.g., 3.33% per day = 30 days supply)
- **Visual Progress Bars**: See current stock levels at a glance
- **Empty Date Prediction**: Automatic calculation of when items will run out
- **Auto-Restock**: Option to automatically mark items as refilled when empty
- **Monthly Cost Analysis**: Track how much you spend per month on consumables

### 📅 Calendar View
- **Monthly Grid**: Visual calendar showing all expenses for any given month
- **Occurrence Calculation**: Automatically computes recurring expense occurrences
- **Date Range Reports**: Custom date range selection with total cost calculation
- **Quick Add**: Add expenses directly from calendar dates
- **Daily Details**: Click any date to see all expenses and total cost

### 📊 Statistics & Analytics
- **Monthly Overview**: Current month total, recurring total, and consumption total
- **Category Breakdown**: Pie chart showing expense distribution by category
- **Payment Method Analysis**: Donut chart of spending by payment method
- **Top Expenses**: Quick view of your highest recurring costs
- **Trend Analysis**: Monthly spending trends over time
- **Average Monthly Cost**: Calculate your average monthly expenses

### 🎨 Theming
- **12 Beautiful Themes**: 7 dark themes and 5 light themes
  - **Dark**: Ocean, Sunset, Forest, Lavender, Midnight, Rose, Aurora
  - **Light**: Neutral, Warm, Cool, Green, Purple
- **Glassmorphism Design**: Modern glass-like UI elements with transparency and blur
- **CSS Custom Properties**: Seamless theme switching without page reload
- **Persistent Preferences**: Your theme choice is saved automatically

### 💱 Currency Features
- **Real-time Exchange Rates**: Integration with currency conversion API
- **24-Hour Caching**: Smart caching reduces API calls and improves performance
- **Rate Limiting**: Prevents API spam (max 3 manual refreshes per minute)
- **Fallback Rates**: Hardcoded rates ensure app works even when API is down
- **Display Currency**: Set your preferred currency for all amounts
- **Original Currency Preservation**: Stores amounts in their original currency

### 🎯 User Experience
- **Custom Confirmation Modals**: Beautiful glassmorphic confirmation dialogs instead of browser alerts
- **Tooltips Everywhere**: Helpful hints on all buttons and interactive elements
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Keyboard Shortcuts**: Efficient navigation and modal controls
- **Toast Notifications**: Non-intrusive success/error messages
- **Board & Table Views**: Switch between card grid and table layouts
- **Search & Sort**: Powerful filtering and sorting options

## 🛠️ Tech Stack

### Backend
- **Python 3.8+**: Modern Python with type hints
- **Flask 3.0+**: Lightweight web framework
- **SQLite3**: Simple, file-based database
- **Gunicorn**: Production-ready WSGI server

### Frontend
- **Vanilla JavaScript**: No framework dependencies, pure ES6+ modules
- **IIFE Pattern**: Modular architecture using Immediately Invoked Function Expressions
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Beautiful, responsive charts
- **Font Awesome**: Icon library

### Architecture
- **Single Page Application (SPA)**: Client-side routing without page reloads
- **RESTful API**: JSON-based API endpoints
- **Session Authentication**: Secure user sessions with Flask
- **Database Migrations**: Non-destructive schema updates

## 📦 Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Windows

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ExpenseTracker.git
cd ExpenseTracker
```

2. **Create virtual environment**
```bash
python -m venv .venv
.venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set environment variables** (optional)
```bash
# Create a .env file or set system environment variables
set SECRET_KEY=your-secret-key-here
set DATABASE=expense_tracker.db
```

5. **Run the application**
```bash
python app.py
```

The app will be available at `http://localhost:5000`

### Linux

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/ExpenseTracker.git
cd ExpenseTracker
```

2. **Run the setup script**
```bash
bash run.sh
```

This will:
- Create a virtual environment
- Install dependencies
- Start the development server

For production mode:
```bash
bash run.sh production
```

## 🚀 Usage

### First Time Setup

1. **Register an Account**: Create your user account on the registration page
2. **Configure Settings**: 
   - Choose your display currency
   - Select a theme
   - Set up default categories (12 provided by default)
   - Add payment methods (6 provided by default)

### Adding Expenses

1. Navigate to **Dashboard** or **Expenses** view
2. Click **Add Expense** button
3. Fill in details:
   - Title (required)
   - Description (optional)
   - Amount and currency
   - Category and payment method
   - Billing date
   - Billing interval (once, daily, weekly, etc.)
4. For custom intervals, select:
   - **Specific days**: Choose Mon-Sun
   - **Specific dates**: Enter dates like `1,15,30`
   - **Custom**: Set interval in days

### Adding Consumption Items

1. Navigate to **Dashboard** or **Expenses** view
2. Click **Add Consumption** button
3. Enter:
   - Item name (e.g., "Toothpaste")
   - Price and currency
   - Daily consumption rate (default: 3.33% = 30 days)
   - Current stock level (0-100%)
   - Category
   - Auto-restock option

### Viewing Analytics

1. Go to **Statistics** view
2. Explore:
   - Monthly totals
   - Category breakdown chart
   - Payment method distribution
   - Top expenses list

### Calendar Features

1. Navigate to **Calendar** view
2. View monthly grid with all expenses
3. Click dates to see details
4. Use date range selector for custom reports
5. Add expenses directly from calendar

### Settings & Customization

1. Go to **Settings** view
2. Customize:
   - Display currency
   - Theme (12 options)
   - Grid columns for dashboard
   - Date format
   - Categories (add/edit/delete)
   - Payment methods (add/edit/delete)
   - Custom icons with emoji picker or file upload

## 📁 Project Structure

```
ExpenseTracker/
├── app.py                  # Flask routes and API endpoints
├── database.py             # Database schema and migrations
├── config.py               # Configuration (SECRET_KEY, DATABASE path)
├── requirements.txt        # Python dependencies
├── run.sh                  # Linux startup script
├── static/
│   ├── css/
│   │   └── style.css       # All styles including 12 themes
│   └── js/
│       ├── app.js          # Main controller, navigation, modals
│       ├── utils.js        # API wrapper, currency conversion
│       ├── expenses.js     # Expense CRUD and rendering
│       ├── consumption.js  # Consumption item management
│       ├── calendar.js     # Calendar grid and date calculations
│       ├── statistics.js   # Charts and analytics
│       ├── settings.js     # User preferences and settings
│       ├── dropdown.js     # Custom dropdown enhancements
│       └── iconUpload.js   # Icon picker with emoji and file upload
└── templates/
    ├── base.html           # Base template layout
    ├── login.html          # Login page
    ├── register.html       # Registration page
    └── dashboard.html      # Main SPA with all views
```

## 🗄️ Database Schema

### Users
- `id`, `username`, `password_hash`, `created_at`

### Expenses
- `id`, `user_id`, `title`, `description`, `amount`, `currency`
- `category_id`, `payment_method_id`, `billing_date`
- `billing_interval`, `custom_interval_days`
- `specific_days` (JSON array for Mon-Sun)
- `specific_dates` (comma-separated dates of month)
- `is_active`, `created_at`, `updated_at`

### Consumption Items
- `id`, `user_id`, `name`, `description`, `price`, `currency`
- `category_id`, `consuming_rate`, `current_level`
- `last_refill`, `estimated_empty`, `auto_repurchase`
- `created_at`, `updated_at`

### Categories
- `id`, `user_id`, `name`, `icon`, `icon_type`, `icon_data`, `color`

### Payment Methods
- `id`, `user_id`, `name`, `icon`, `icon_type`, `icon_data`

### User Settings
- `user_id`, `display_currency`, `currency_api_url`
- `grid_columns`, `color_scheme`, `date_format`, `custom_colors`

## 🔐 Security Features

- **Password Hashing**: Werkzeug security for password storage
- **Session Management**: Flask session with secret key
- **User Isolation**: All data scoped to authenticated user
- **SQL Injection Protection**: Parameterized queries throughout
- **CSRF Protection**: Session-based authentication
- **Input Validation**: Client and server-side validation

## 🌐 API Endpoints

All API endpoints are protected and require authentication.

### Expenses
- `GET /api/expenses` - Get all user expenses
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/<id>` - Update expense
- `DELETE /api/expenses/<id>` - Delete expense

### Consumption Items
- `GET /api/consumption` - Get all consumption items
- `POST /api/consumption` - Create item
- `PUT /api/consumption/<id>` - Update item
- `DELETE /api/consumption/<id>` - Delete item
- `POST /api/consumption/<id>/refill` - Refill to 100%

### Categories & Payment Methods
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `DELETE /api/categories/<id>` - Delete category
- `GET /api/payment-methods` - Get all payment methods
- `POST /api/payment-methods` - Create payment method
- `DELETE /api/payment-methods/<id>` - Delete payment method

### Statistics & Calendar
- `GET /api/statistics` - Get expense statistics
- `GET /api/calendar/<year>/<month>` - Get calendar data
- `POST /api/calendar/range` - Get date range report

### Settings & Currency
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings
- `GET /api/currency/rates` - Get exchange rates

## 🎨 Customization

### Adding New Themes

1. Add theme colors to [style.css](static/css/style.css):
```css
[data-theme="mytheme"] {
    --bg-from: #yourcolor;
    --bg-via: #yourcolor;
    --bg-to: #yourcolor;
    --text-primary: #yourcolor;
    --text-secondary: #yourcolor;
    --accent: #yourcolor;
    /* ... more variables */
}
```

2. Add theme option in [dashboard.html](templates/dashboard.html):
```html
<button data-theme="mytheme" class="theme-option">
    <span class="theme-dot" style="background:linear-gradient(...)"></span>
    My Theme
</button>
```

3. Add gradient to [settings.js](static/js/settings.js):
```javascript
const THEME_GRADIENTS = {
    // ...
    'mytheme': 'linear-gradient(135deg, #color1, #color2)'
};
```

### Adding Custom Billing Intervals

Modify the interval logic in:
- [app.py](app.py) - Calendar endpoint occurrence calculation
- [expenses.js](static/js/expenses.js) - Frontend interval options
- [utils.js](static/js/utils.js) - Interval label formatting

## 🐛 Troubleshooting

### Database Issues
```bash
# Delete database to reset (WARNING: deletes all data)
rm expense_tracker.db
# Restart app to recreate
python app.py
```

### Currency API Not Working
The app includes fallback exchange rates. Check:
1. Internet connection
2. API endpoint in settings (default: exchangerate-api.com)
3. Rate limiting (max 3 manual refreshes/minute)

### Theme Not Applying
1. Clear browser cache
2. Check browser console for CSS errors
3. Verify theme name matches in CSS, HTML, and JS

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🤖 GitHub Actions

### Auto-Rebase proxy_fix Branch

This repository includes an automated workflow that keeps the `proxy_fix` branch up-to-date with `master`. The workflow:

- **Triggers**: Automatically runs when commits are pushed to the `master` branch
- **Action**: Rebases the `proxy_fix` branch onto the latest `master` changes
- **Result**: The `proxy_fix` branch always includes the latest master updates while preserving the proxy middleware fixes

The workflow handles rebase conflicts gracefully - if conflicts are detected, the workflow fails and requires manual intervention. This ensures the proxy fix patches are never lost due to automatic merging.

**Workflow file**: [`.github/workflows/auto-rebase-proxy-fix.yml`](.github/workflows/auto-rebase-proxy-fix.yml)

## 🙏 Acknowledgments

- [Flask](https://flask.palletsprojects.com/) - Web framework
- [Chart.js](https://www.chartjs.org/) - Charts library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Font Awesome](https://fontawesome.com/) - Icon library
- [ExchangeRate-API](https://www.exchangerate-api.com/) - Currency conversion


**Made with ❤️ and lots of ☕**
\* Yes I poured a lot of coffee into AI machines
