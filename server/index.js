import express from 'express';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const DB_PATH = path.join(__dirname, 'project.db');

let db;

// Initialize database
async function initDb() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Pre-seed admin user
  const existingAdmin = db.exec("SELECT id FROM users WHERE username = 'admin'");
  if (existingAdmin.length === 0 || existingAdmin[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', ['admin', 'admin@example.com', hash]);
    saveDb();
    console.log('Pre-seeded user: admin / admin123');
  }
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
}

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: 'prototype_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Routes

// Register
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;

  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = runSql('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);

  req.session.userId = result.lastInsertRowid;
  req.session.username = username;

  res.json({ message: 'Registration successful', user: { id: result.lastInsertRowid, username } });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const user = queryOne('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.userId = user.id;
  req.session.username = user.username;

  res.json({ message: 'Login successful', user: { id: user.id, username: user.username } });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

// Get current user
app.get('/api/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: { id: req.session.userId, username: req.session.username } });
});

// Get user's projects
app.get('/api/projects', requireAuth, (req, res) => {
  const projects = queryAll('SELECT id, name, description, created_at FROM projects WHERE created_by = ? ORDER BY created_at DESC', [req.session.userId]);
  res.json({ projects });
});

// Create project
app.post('/api/projects', requireAuth, (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const result = runSql('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)', [name, description, req.session.userId]);

  res.json({ message: 'Project created', project: { id: result.lastInsertRowid, name, description, created_at: new Date().toISOString() } });
});

// Delete project
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  const project = queryOne('SELECT id FROM projects WHERE id = ? AND created_by = ?', [id, req.session.userId]);
  if (!project) {
    return res.status(404).json({ error: 'Project not found or unauthorized' });
  }

  runSql('DELETE FROM projects WHERE id = ?', [id]);
  res.json({ message: 'Project deleted' });
});

const PORT = 3001;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});