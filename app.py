import os
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

app = Flask(__name__)
app.secret_key = 'prototype_secret_key'

DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'project.db')

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')

    # Pre-seed a test user
    cursor.execute('SELECT username FROM users WHERE username = ?', ('admin',))
    if not cursor.fetchone():
        password_hash = generate_password_hash('admin123')
        cursor.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                       ('admin', 'admin@example.com', password_hash))
        print("Pre-seeded user: admin / admin123")

    conn.commit()
    conn.close()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('home'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, password_hash FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        conn.close()

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('home'))
        else:
            flash('Invalid username or password', 'error')

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')

        conn = get_db()
        cursor = conn.cursor()

        # Check if username or email already exists
        cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        if cursor.fetchone():
            flash('Username or email already exists', 'error')
            conn.close()
            return render_template('register.html')

        # Create new user
        password_hash = generate_password_hash(password)
        cursor.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                       (username, email, password_hash))
        conn.commit()
        conn.close()

        flash('Registration successful! Please login.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/home')
@login_required
def home():
    user_id = session.get('user_id')
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, description, created_at FROM projects WHERE created_by = ? ORDER BY created_at DESC', (user_id,))
    projects = cursor.fetchall()
    conn.close()
    return render_template('home.html', username=session.get('username'), projects=projects)

@app.route('/projects/create', methods=['POST'])
@login_required
def create_project():
    name = request.form.get('name')
    description = request.form.get('description')
    user_id = session.get('user_id')

    if name:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
                       (name, description, user_id))
        conn.commit()
        conn.close()
        flash('Project created successfully!', 'success')

    return redirect(url_for('home'))

@app.route('/projects/delete/<int:project_id>', methods=['POST'])
@login_required
def delete_project(project_id):
    user_id = session.get('user_id')
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM projects WHERE id = ? AND created_by = ?', (project_id, user_id))
    conn.commit()
    conn.close()
    flash('Project deleted.', 'success')
    return redirect(url_for('home'))

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    init_db()
    app.run(debug=True)