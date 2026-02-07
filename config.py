import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-expense-tracker-secret-key-change-in-production')
DATABASE = os.path.join(BASE_DIR, os.environ.get('DATABASE', 'expense_tracker.db'))
DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
