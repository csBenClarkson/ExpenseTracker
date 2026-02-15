from flask import (Flask, render_template, request, redirect,
                   url_for, session, jsonify, g)
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from database import init_db, get_db
import config
import requests as http_requests
import json
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = config.SECRET_KEY
app.config['DATABASE'] = config.DATABASE

# Initialize database
init_db(app)


# ─── Helpers ────────────────────────────────────────────────────────────────────

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            if request.is_json or request.path.startswith('/api/'):
                return jsonify({'error': 'Unauthorized'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


def seed_defaults(user_id):
    """Create default categories and payment methods for a new user."""
    db = get_db()
    db.execute('INSERT INTO user_settings (user_id) VALUES (?)', (user_id,))
    categories = [
        ('Housing', '🏠', '#6366f1'), ('Food & Dining', '🍔', '#f59e0b'),
        ('Transport', '🚗', '#10b981'), ('Entertainment', '🎬', '#ec4899'),
        ('Shopping', '🛍️', '#8b5cf6'), ('Health', '💊', '#ef4444'),
        ('Utilities', '💡', '#06b6d4'), ('Education', '📚', '#f97316'),
        ('Subscriptions', '🔄', '#a855f7'), ('Insurance', '🛡️', '#14b8a6'),
        ('Savings', '🏦', '#22c55e'), ('Other', '📌', '#64748b'),
    ]
    for name, icon, color in categories:
        db.execute('INSERT INTO categories (user_id,name,icon,color) VALUES (?,?,?,?)',
                   (user_id, name, icon, color))
    methods = [
        ('Cash', '💵'), ('Credit Card', '💳'), ('Debit Card', '🏧'),
        ('Bank Transfer', '🏦'), ('PayPal', '🅿️'), ('Crypto', '₿'),
    ]
    for name, icon in methods:
        db.execute('INSERT INTO payment_methods (user_id,name,icon) VALUES (?,?,?)',
                   (user_id, name, icon))
    db.commit()


# ─── Auth Routes ────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return redirect(url_for('dashboard') if 'user_id' in session else url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username=?', (username,)).fetchone()
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('dashboard'))
        return render_template('login.html', error='Invalid username or password')
    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')
        errors = []
        if not username or not password:
            errors.append('All fields are required')
        elif len(username) < 3:
            errors.append('Username must be at least 3 characters')
        if len(password) < 6:
            errors.append('Password must be at least 6 characters')
        if password != confirm:
            errors.append('Passwords do not match')
        if errors:
            return render_template('register.html', error='; '.join(errors))

        db = get_db()
        if db.execute('SELECT id FROM users WHERE username=?', (username,)).fetchone():
            return render_template('register.html', error='Username already taken')

        db.execute('INSERT INTO users (username, password_hash) VALUES (?,?)',
                   (username, generate_password_hash(password)))
        user_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
        seed_defaults(user_id)
        session['user_id'] = user_id
        session['username'] = username
        return redirect(url_for('dashboard'))
    return render_template('register.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=session.get('username'))


# ─── Expense API ────────────────────────────────────────────────────────────────

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    db = get_db()
    rows = db.execute('''
        SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
               p.name as payment_method_name, p.icon as payment_method_icon
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN payment_methods p ON e.payment_method_id = p.id
        WHERE e.user_id = ? ORDER BY e.billing_date DESC
    ''', (session['user_id'],)).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/expenses', methods=['POST'])
@login_required
def create_expense():
    d = request.get_json()
    db = get_db()
    db.execute('''
        INSERT INTO expenses
        (user_id, title, description, amount, currency, category_id, payment_method_id,
         billing_date, billing_interval, custom_interval_days, specific_days, is_active)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    ''', (session['user_id'], d['title'], d.get('description', ''),
          float(d['amount']), d.get('currency', 'USD'),
          d.get('category_id'), d.get('payment_method_id'),
          d['billing_date'], d.get('billing_interval', 'once'),
          int(d.get('custom_interval_days', 0)),
          d.get('specific_days'),
          int(d.get('is_active', 1))))
    db.commit()
    eid = db.execute('SELECT last_insert_rowid()').fetchone()[0]
    return jsonify({'status': 'ok', 'id': eid})


@app.route('/api/expenses/<int:eid>', methods=['PUT'])
@login_required
def update_expense(eid):
    d = request.get_json()
    db = get_db()
    db.execute('''
        UPDATE expenses SET title=?, description=?, amount=?, currency=?, category_id=?,
        payment_method_id=?, billing_date=?, billing_interval=?, custom_interval_days=?,
        specific_days=?, is_active=?, updated_at=CURRENT_TIMESTAMP 
        WHERE id=? AND user_id=?
    ''', (d['title'], d.get('description', ''), float(d['amount']),
          d.get('currency', 'USD'), d.get('category_id'),
          d.get('payment_method_id'), d['billing_date'],
          d.get('billing_interval', 'once'),
          int(d.get('custom_interval_days', 0)),
          d.get('specific_days'),
          int(d.get('is_active', 1)), eid, session['user_id']))
    db.commit()
    return jsonify({'status': 'ok'})


@app.route('/api/expenses/<int:eid>', methods=['DELETE'])
@login_required
def delete_expense(eid):
    db = get_db()
    db.execute('DELETE FROM expenses WHERE id=? AND user_id=?', (eid, session['user_id']))
    db.commit()
    return jsonify({'status': 'ok'})


# ─── Categories API ─────────────────────────────────────────────────────────────

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    db = get_db()
    return jsonify([dict(r) for r in db.execute(
        'SELECT * FROM categories WHERE user_id=? ORDER BY name',
        (session['user_id'],)).fetchall()])


@app.route('/api/categories', methods=['POST'])
@login_required
def create_category():
    d = request.get_json()
    db = get_db()
    db.execute('INSERT INTO categories (user_id,name,icon,icon_type,icon_data,color) VALUES (?,?,?,?,?,?)',
               (session['user_id'], d['name'], d.get('icon', '📁'), d.get('icon_type', 'emoji'),
                d.get('icon_data'), d.get('color', '#6366f1')))
    db.commit()
    return jsonify({'status': 'ok', 'id': db.execute('SELECT last_insert_rowid()').fetchone()[0]})


@app.route('/api/categories/<int:cid>', methods=['PUT'])
@login_required
def update_category(cid):
    d = request.get_json()
    db = get_db()
    db.execute('UPDATE categories SET name=?,icon=?,icon_type=?,icon_data=?,color=? WHERE id=? AND user_id=?',
               (d['name'], d.get('icon', '📁'), d.get('icon_type', 'emoji'),
                d.get('icon_data'), d.get('color', '#6366f1'), cid, session['user_id']))
    db.commit()
    return jsonify({'status': 'ok'})


@app.route('/api/categories/<int:cid>', methods=['DELETE'])
@login_required
def delete_category(cid):
    db = get_db()
    db.execute('DELETE FROM categories WHERE id=? AND user_id=?', (cid, session['user_id']))
    db.commit()
    return jsonify({'status': 'ok'})


# ─── Payment Methods API ────────────────────────────────────────────────────────

@app.route('/api/payment-methods', methods=['GET'])
@login_required
def get_payment_methods():
    db = get_db()
    return jsonify([dict(r) for r in db.execute(
        'SELECT * FROM payment_methods WHERE user_id=? ORDER BY name',
        (session['user_id'],)).fetchall()])


@app.route('/api/payment-methods', methods=['POST'])
@login_required
def create_payment_method():
    d = request.get_json()
    db = get_db()
    db.execute('INSERT INTO payment_methods (user_id,name,icon,icon_type,icon_data) VALUES (?,?,?,?,?)',
               (session['user_id'], d['name'], d.get('icon', '💳'), d.get('icon_type', 'emoji'),
                d.get('icon_data')))
    db.commit()
    return jsonify({'status': 'ok', 'id': db.execute('SELECT last_insert_rowid()').fetchone()[0]})


@app.route('/api/payment-methods/<int:pid>', methods=['DELETE'])
@login_required
def delete_payment_method(pid):
    db = get_db()
    db.execute('DELETE FROM payment_methods WHERE id=? AND user_id=?',
               (pid, session['user_id']))
    db.commit()
    return jsonify({'status': 'ok'})


# ─── Settings API ───────────────────────────────────────────────────────────────

@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    db = get_db()
    s = db.execute('SELECT * FROM user_settings WHERE user_id=?',
                   (session['user_id'],)).fetchone()
    if not s:
        db.execute('INSERT INTO user_settings (user_id) VALUES (?)', (session['user_id'],))
        db.commit()
        s = db.execute('SELECT * FROM user_settings WHERE user_id=?',
                       (session['user_id'],)).fetchone()
    return jsonify(dict(s))


@app.route('/api/settings', methods=['PUT'])
@login_required
def update_settings():
    d = request.get_json()
    db = get_db()
    db.execute('''
        UPDATE user_settings SET display_currency=?, currency_api_url=?,
        grid_columns=?, color_scheme=?, custom_colors=?, date_format=? WHERE user_id=?
    ''', (d.get('display_currency', 'USD'),
          d.get('currency_api_url', 'https://api.exchangerate-api.com/v4/latest/'),
          int(d.get('grid_columns', 3)),
          d.get('color_scheme', 'ocean'),
          d.get('custom_colors', '{}'),
          d.get('date_format', 'YYYY-MM-DD'),
          session['user_id']))
    db.commit()
    return jsonify({'status': 'ok'})


# ─── Currency API ────────────────────────────────────────────────────────────────

@app.route('/api/currency/rates')
@login_required
def get_currency_rates():
    base = request.args.get('base', 'USD')
    db = get_db()
    s = db.execute('SELECT currency_api_url FROM user_settings WHERE user_id=?',
                   (session['user_id'],)).fetchone()
    api_url = s['currency_api_url'] if s else 'https://api.exchangerate-api.com/v4/latest/'

    # Try primary API
    try:
        resp = http_requests.get(f'{api_url}{base}', timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return jsonify(data.get('rates', {}))
    except Exception:
        pass

    # Try fallback API (Fawazahmed0)
    try:
        fallback_url = f'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base.lower()}.json'
        resp = http_requests.get(fallback_url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        rates_raw = data.get(base.lower(), {})
        # Convert keys to uppercase to match expected format
        rates = {k.upper(): v for k, v in rates_raw.items() if isinstance(v, (int, float))}
        if rates:
            return jsonify(rates)
    except Exception:
        pass

    # Hardcoded fallback rates (approximate, base USD)
    fallback = {
        'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'JPY': 149.5, 'CNY': 7.24,
        'CAD': 1.36, 'AUD': 1.53, 'CHF': 0.88, 'KRW': 1320, 'INR': 83.1,
        'SGD': 1.34, 'HKD': 7.82, 'TWD': 31.5, 'MXN': 17.1, 'BRL': 4.97,
        'SEK': 10.4, 'NOK': 10.5, 'DKK': 6.87, 'NZD': 1.63, 'THB': 35.2,
        'RUB': 91.5, 'ZAR': 18.9, 'PHP': 56.2, 'MYR': 4.72, 'IDR': 15600,
    }
    if base != 'USD' and base in fallback:
        rate = fallback[base]
        return jsonify({k: round(v / rate, 6) for k, v in fallback.items()})
    return jsonify(fallback)


# ─── Statistics API ──────────────────────────────────────────────────────────────

@app.route('/api/stats/summary')
@login_required
def get_stats_summary():
    db = get_db()
    uid = session['user_id']
    now = datetime.now()
    month_start = now.replace(day=1).strftime('%Y-%m-%d')
    next_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1).strftime('%Y-%m-%d')

    # This month's one-time expenses
    month_total = db.execute('''
        SELECT COALESCE(SUM(amount),0) as total FROM expenses
        WHERE user_id=? AND billing_date >= ? AND billing_date < ?
    ''', (uid, month_start, next_month)).fetchone()['total']

    # Active recurring expenses
    recurring = db.execute('''
        SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total FROM expenses
        WHERE user_id=? AND billing_interval != 'once' AND is_active=1
    ''', (uid,)).fetchone()

    # Category breakdown for current month
    categories = db.execute('''
        SELECT c.name, c.icon, c.color, COALESCE(SUM(e.amount),0) as total
        FROM expenses e LEFT JOIN categories c ON e.category_id=c.id
        WHERE e.user_id=? AND e.billing_date >= ? AND e.billing_date < ?
        GROUP BY e.category_id ORDER BY total DESC
    ''', (uid, month_start, next_month)).fetchall()

    # Monthly totals for past 12 months
    monthly = []
    for i in range(11, -1, -1):
        dt = now - timedelta(days=i * 30)
        ms = dt.replace(day=1).strftime('%Y-%m-%d')
        me = (dt.replace(day=1) + timedelta(days=32)).replace(day=1).strftime('%Y-%m-%d')
        t = db.execute(
            'SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE user_id=? AND billing_date>=? AND billing_date<?',
            (uid, ms, me)).fetchone()['t']
        monthly.append({'month': dt.strftime('%Y-%m'), 'total': round(t, 2)})

    # Total expenses count
    total_count = db.execute(
        'SELECT COUNT(*) as c FROM expenses WHERE user_id=?', (uid,)).fetchone()['c']

    # Top expenses this month
    top_expenses = db.execute('''
        SELECT e.title, e.amount, e.currency, c.icon as category_icon, c.color as category_color
        FROM expenses e LEFT JOIN categories c ON e.category_id=c.id
        WHERE e.user_id=? AND e.billing_date >= ? AND e.billing_date < ?
        ORDER BY e.amount DESC LIMIT 5
    ''', (uid, month_start, next_month)).fetchall()

    # Payment method breakdown
    payment_breakdown = db.execute('''
        SELECT p.name, p.icon, COALESCE(SUM(e.amount),0) as total
        FROM expenses e LEFT JOIN payment_methods p ON e.payment_method_id=p.id
        WHERE e.user_id=? AND e.billing_date >= ? AND e.billing_date < ?
        GROUP BY e.payment_method_id ORDER BY total DESC
    ''', (uid, month_start, next_month)).fetchall()

    return jsonify({
        'month_total': round(month_total, 2),
        'recurring_count': recurring['count'],
        'recurring_total': round(recurring['total'], 2),
        'total_count': total_count,
        'categories': [dict(c) for c in categories],
        'monthly_totals': monthly,
        'top_expenses': [dict(e) for e in top_expenses],
        'payment_breakdown': [dict(p) for p in payment_breakdown],
    })


# ─── Calendar Data ──────────────────────────────────────────────────────────────

@app.route('/api/calendar')
@login_required
def get_calendar_data():
    """Get expense occurrences for a given month."""
    year = int(request.args.get('year', datetime.now().year))
    month = int(request.args.get('month', datetime.now().month))
    db = get_db()
    uid = session['user_id']

    expenses = db.execute('''
        SELECT e.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
               p.name as payment_method_name, p.icon as payment_method_icon
        FROM expenses e
        LEFT JOIN categories c ON e.category_id = c.id
        LEFT JOIN payment_methods p ON e.payment_method_id = p.id
        WHERE e.user_id = ? AND e.is_active = 1
    ''', (uid,)).fetchall()

    # Build day-by-day data
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]
    cal_data = {}

    for day in range(1, days_in_month + 1):
        date_str = f'{year}-{month:02d}-{day:02d}'
        cal_data[date_str] = []

    for exp in expenses:
        e = dict(exp)
        billing = datetime.strptime(e['billing_date'], '%Y-%m-%d')
        interval = e['billing_interval']

        occurrences = []
        if interval == 'once':
            if billing.year == year and billing.month == month:
                occurrences.append(billing.day)
        elif interval == 'daily':
            for d in range(1, days_in_month + 1):
                dt = datetime(year, month, d)
                if dt >= billing:
                    occurrences.append(d)
        elif interval == 'weekdays':
            # Monday-Friday only (weekday() returns 0-6, 0=Monday, 6=Sunday)
            for d in range(1, days_in_month + 1):
                dt = datetime(year, month, d)
                if dt >= billing and dt.weekday() < 5:  # 0-4 = Mon-Fri
                    occurrences.append(d)
        elif interval == 'weekends':
            # Saturday-Sunday only
            for d in range(1, days_in_month + 1):
                dt = datetime(year, month, d)
                if dt >= billing and dt.weekday() >= 5:  # 5-6 = Sat-Sun
                    occurrences.append(d)
        elif interval == 'weekly':
            dt = billing
            while dt.year < year or (dt.year == year and dt.month < month):
                dt += timedelta(days=7)
            while dt.month == month and dt.year == year:
                if dt >= billing:
                    occurrences.append(dt.day)
                dt += timedelta(days=7)
        elif interval == 'biweekly':
            dt = billing
            while dt.year < year or (dt.year == year and dt.month < month):
                dt += timedelta(days=14)
            while dt.month == month and dt.year == year:
                if dt >= billing:
                    occurrences.append(dt.day)
                dt += timedelta(days=14)
        elif interval == 'monthly':
            target_day = min(billing.day, days_in_month)
            dt = datetime(year, month, target_day)
            if dt >= billing:
                occurrences.append(target_day)
        elif interval == 'quarterly':
            dt = billing
            while dt < datetime(year, month, 1):
                m = dt.month + 3
                y = dt.year + (m - 1) // 12
                m = ((m - 1) % 12) + 1
                target_day = min(dt.day, calendar.monthrange(y, m)[1])
                dt = datetime(y, m, target_day)
            if dt.year == year and dt.month == month:
                occurrences.append(dt.day)
        elif interval == 'yearly':
            if billing.month == month:
                target_day = min(billing.day, days_in_month)
                dt = datetime(year, month, target_day)
                if dt >= billing:
                    occurrences.append(target_day)
        elif interval == 'custom' and e['custom_interval_days'] > 0:
            dt = billing
            interval_days = e['custom_interval_days']
            while dt.year < year or (dt.year == year and dt.month < month):
                dt += timedelta(days=interval_days)
            while dt.month == month and dt.year == year:
                if dt >= billing:
                    occurrences.append(dt.day)
                dt += timedelta(days=interval_days)
        elif interval == 'specific_days' and e.get('specific_days'):
            # specific_days is comma-separated weekday numbers (0=Mon, 6=Sun)
            selected_days = [int(x.strip()) for x in e['specific_days'].split(',') if x.strip().isdigit()]
            for d in range(1, days_in_month + 1):
                dt = datetime(year, month, d)
                if dt >= billing and dt.weekday() in selected_days:
                    occurrences.append(d)
        elif interval == 'bimonthly':
            dt = billing
            while dt < datetime(year, month, 1):
                m = dt.month + 2
                y = dt.year + (m - 1) // 12
                m = ((m - 1) % 12) + 1
                target_day = min(dt.day, calendar.monthrange(y, m)[1])
                dt = datetime(y, m, target_day)
            if dt.year == year and dt.month == month:
                occurrences.append(dt.day)
        elif interval == 'semiannually':
            dt = billing
            while dt < datetime(year, month, 1):
                m = dt.month + 6
                y = dt.year + (m - 1) // 12
                m = ((m - 1) % 12) + 1
                target_day = min(dt.day, calendar.monthrange(y, m)[1])
                dt = datetime(y, m, target_day)
            if dt.year == year and dt.month == month:
                occurrences.append(dt.day)

        for day in occurrences:
            date_str = f'{year}-{month:02d}-{day:02d}'
            if date_str in cal_data:
                cal_data[date_str].append({
                    'id': e['id'], 'title': e['title'], 'amount': e['amount'],
                    'currency': e['currency'], 'category_name': e['category_name'],
                    'category_icon': e['category_icon'], 'category_color': e['category_color'],
                    'payment_method_name': e['payment_method_name'],
                    'billing_interval': e['billing_interval'],
                })

    return jsonify(cal_data)


if __name__ == '__main__':
    app.run(debug=config.DEBUG, host='0.0.0.0', port=5000)
