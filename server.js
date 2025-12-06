// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token';
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'products.json');

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

// Ensure data folder & file
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
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

// Simple admin auth middleware
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim();
    if (token === ADMIN_TOKEN) return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
}

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Public API: get products (only non-private by default)
app.get('/api/products', (req, res) => {
  const section = req.query.section || null;
  const showPrivate = false; // public endpoint doesn't show private items
  let products = readProducts().filter(p => !p.private);
  if (section) products = products.filter(p => (p.section || '').toUpperCase() === section.toUpperCase());
  res.json({ products });
});

// Public API for orders (optional): This template uses browser localStorage for orders.
// If you later want server-side orders, we can add endpoints /api/orders etc.

// Admin endpoints (require ADMIN_TOKEN)
app.get('/api/admin/products', requireAdmin, (req, res) => {
  const products = readProducts();
  res.json({ products });
});

app.post('/api/admin/add', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.product || !body.section) {
    return res.status(400).json({ error: 'product and section are required' });
  }
  const products = readProducts();
  const id = 'p_' + Date.now();
  const item = {
    id,
    product: String(body.product).trim(),
    section: String(body.section).trim(),
    price: body.price ? Number(body.price) : 0,
    private: !!body.private, // true => only visible to admin
    createdAt: Date.now()
  };
  products.push(item);
  writeProducts(products);
  res.json({ ok: true, product: item });
});

app.delete('/api/admin/product/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  let products = readProducts();
  products = products.filter(p => p.id !== id);
  writeProducts(products);
  res.json({ ok: true });
});

// Fallback to index.html for SPA routes (if you want)
app.get('*', (req, res, next) => {
  // allow static files to be served normally
  const url = req.originalUrl || '';
  if (url.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start
app.listen(PORT, () => {
  console.log(`Ruchiram server started on port ${PORT}`);
});