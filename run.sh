#!/bin/bash
echo "=== ExpenseTracker Setup ==="

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
export FLASK_APP=app.py
export SECRET_KEY="${SECRET_KEY:-$(python3 -c 'import secrets; print(secrets.token_hex(32))')}"

# Run with gunicorn for production
if [ "$1" = "production" ]; then
    echo "Starting in production mode on port ${PORT:-5000}..."
    export FLASK_DEBUG=False
    gunicorn -w 4 -b 0.0.0.0:${PORT:-5000} app:app
else
    echo "Starting in development mode on port 5000..."
    export FLASK_DEBUG=True
    python3 app.py
fi
