import sqlite3
from flask import g, current_app


def get_db():
    """Get database connection for the current request context."""
    if '_database' not in g:
        g._database = sqlite3.connect(current_app.config['DATABASE'])
        g._database.row_factory = sqlite3.Row
        g._database.execute("PRAGMA foreign_keys = ON")
    return g._database


def close_db(e=None):
    """Close database connection at end of request."""
    db = g.pop('_database', None)
    if db is not None:
        db.close()


def migrate_db(db):
    """Apply migrations to existing databases."""
    cursor = db.cursor()
    
    # Check if columns exist, if not add them
    cursor.execute("PRAGMA table_info(categories)")
    categories_cols = {row[1] for row in cursor.fetchall()}
    
    if 'icon_type' not in categories_cols:
        db.execute("ALTER TABLE categories ADD COLUMN icon_type TEXT DEFAULT 'emoji'")
    if 'icon_data' not in categories_cols:
        db.execute("ALTER TABLE categories ADD COLUMN icon_data TEXT")
    
    cursor.execute("PRAGMA table_info(payment_methods)")
    payment_cols = {row[1] for row in cursor.fetchall()}
    
    if 'icon_type' not in payment_cols:
        db.execute("ALTER TABLE payment_methods ADD COLUMN icon_type TEXT DEFAULT 'emoji'")
    if 'icon_data' not in payment_cols:
        db.execute("ALTER TABLE payment_methods ADD COLUMN icon_data TEXT")
    
    # Check expenses table for new interval columns
    cursor.execute("PRAGMA table_info(expenses)")
    expenses_cols = {row[1] for row in cursor.fetchall()}
    
    if 'specific_days' not in expenses_cols:
        db.execute("ALTER TABLE expenses ADD COLUMN specific_days TEXT")

    # Drop legacy consumption_items table if it exists
    db.execute("DROP TABLE IF EXISTS consumption_items")
    
    # Create icon_uploads table if it doesn't exist
    db.execute("""
        CREATE TABLE IF NOT EXISTS icon_uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            data BLOB NOT NULL,
            mime_type TEXT DEFAULT 'image/png',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    db.commit()


def init_db(app):
    """Initialize database with schema."""
    app.teardown_appcontext(close_db)
    with app.app_context():
        db = get_db()
        db.executescript(SCHEMA)
        migrate_db(db)
        db.commit()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    display_currency TEXT DEFAULT 'USD',
    currency_api_url TEXT DEFAULT 'https://api.exchangerate-api.com/v4/latest/',
    grid_columns INTEGER DEFAULT 3,
    color_scheme TEXT DEFAULT 'ocean',
    custom_colors TEXT DEFAULT '{}',
    date_format TEXT DEFAULT 'YYYY-MM-DD',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    icon_type TEXT DEFAULT 'emoji',
    icon_data TEXT,
    color TEXT DEFAULT '#6366f1',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '💳',
    icon_type TEXT DEFAULT 'emoji',
    icon_data TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    category_id INTEGER,
    payment_method_id INTEGER,
    billing_date DATE NOT NULL,
    billing_interval TEXT DEFAULT 'once',
    custom_interval_days INTEGER DEFAULT 0,
    specific_days TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS icon_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    data BLOB NOT NULL,
    mime_type TEXT DEFAULT 'image/png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""
