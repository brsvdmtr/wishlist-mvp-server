const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'wishlist-secret';
const DB_FILE = path.join(__dirname, 'db.json');

const app = express();
app.use(cors());
app.use(express.json());

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function ensureUser(db, telegramId) {
  if (!db.users[telegramId]) {
    db.users[telegramId] = { wishlists: {} };
  }
  return db.users[telegramId];
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth', (req, res) => {
  const { telegramId } = req.body;
  if (!telegramId) {
    return res.status(400).json({ error: 'telegramId is required' });
  }
  const db = loadDB();
  ensureUser(db, telegramId);
  saveDB(db);
  const token = jwt.sign({ telegramId }, JWT_SECRET);
  res.json({ token });
});

app.use('/api', authMiddleware);

app.get('/api/wishlists', (req, res) => {
  const db = loadDB();
  const user = ensureUser(db, req.user.telegramId);
  res.json(user.wishlists);
});

app.post('/api/wishlists', (req, res) => {
  const { title, items = [] } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  const db = loadDB();
  const user = ensureUser(db, req.user.telegramId);
  const id = uuidv4();
  user.wishlists[id] = { title, items };
  saveDB(db);
  res.json({ id });
});

app.get('/api/wishlists/:id', (req, res) => {
  const db = loadDB();
  const user = ensureUser(db, req.user.telegramId);
  const list = user.wishlists[req.params.id];
  if (!list) return res.status(404).json({ error: 'Not found' });
  res.json(list);
});

app.put('/api/wishlists/:id', (req, res) => {
  const { title, items } = req.body;
  const db = loadDB();
  const user = ensureUser(db, req.user.telegramId);
  if (!user.wishlists[req.params.id]) {
    return res.status(404).json({ error: 'Not found' });
  }
  user.wishlists[req.params.id] = { title, items };
  saveDB(db);
  res.json({ success: true });
});

app.delete('/api/wishlists/:id', (req, res) => {
  const db = loadDB();
  const user = ensureUser(db, req.user.telegramId);
  if (!user.wishlists[req.params.id]) {
    return res.status(404).json({ error: 'Not found' });
  }
  delete user.wishlists[req.params.id];
  saveDB(db);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
