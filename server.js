// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'replace_me_with_strong_token';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'products.json');

const app = express();
app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.json({ limit: '1mb' }));

// Ensure data file exists
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}
ensureDataFile();

function readProducts() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}
function writeProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), 'utf8');
}

// Admin auth
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token === ADMIN_TOKEN) return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Public API: list public (non-private) products, optional ?section=...
app.get('/api/products', (req, res) => {
  const section = req.query.section;
  let items = readProducts().filter(p => !p.private);
  if (section) items = items.filter(p => (p.section || '').toUpperCase() === String(section).toUpperCase());
  res.json({ products: items });
});

// Admin API
app.get('/api/admin/products', requireAdmin, (req, res) => {
  res.json({ products: readProducts() });
});

app.post('/api/admin/add', requireAdmin, (req, res) => {
  const { product, section, price = 0, private: isPrivate } = req.body || {};
  if (!product || !section) return res.status(400).json({ error: 'product and section required' });
  const items = readProducts();
  const newItem = {
    id: 'p_' + Date.now(),
    product: String(product),
    section: String(section),
    price: Number(price || 0),
    private: !!isPrivate,
    createdAt: Date.now()
  };
  items.push(newItem);
  writeProducts(items);
  res.json({ ok: true, product: newItem });
});

app.delete('/api/admin/product/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  let items = readProducts();
  items = items.filter(p => p.id !== id);
  writeProducts(items);
  res.json({ ok: true });
});

// Fallback to index for other routes (keeps simple)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ruchiram server listening on http://localhost:${PORT} (PORT=${PORT})`);
});