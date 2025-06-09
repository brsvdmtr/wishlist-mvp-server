const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = './data.json';

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// 📥 Создание нового списка
app.post('/api/wishlist', (req, res) => {
  const { title, items } = req.body;
  const id = uuidv4();

  const db = readDB();
  db[id] = { title, items };
  writeDB(db);

  res.json({ id });
});

// 📤 Получение списка по ID
app.get('/api/wishlist/:id', (req, res) => {
  const db = readDB();
  const data = db[req.params.id];

  if (data) res.json(data);
  else res.status(404).json({ error: 'Not found' });
});

// Telegram bot setup
const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
if (BOT_TOKEN) {
  const bot = new Telegraf(BOT_TOKEN);
  bot.start((ctx) => ctx.reply('Привет!')); // basic /start handler

  bot
    .launch()
    .then(() => console.log('Telegram bot started'))
    .catch((err) => console.error('Failed to start Telegram bot:', err));

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.log('TELEGRAM_TOKEN not provided, bot disabled');
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));