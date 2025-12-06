// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'orders.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ensure data file exists
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ orders: [] }, null, 2));
    }
    const raw = fs.readFileSync(DATA_FILE);
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data:', err);
    return { orders: [] };
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API: get all orders (with optional ?section= and ?status= filters)
app.get('/api/orders', (req, res) => {
  const data = readData();
  let orders = data.orders || [];
  const { section, status } = req.query;
  if (section) orders = orders.filter(o => o.section === section);
  if (status) orders = orders.filter(o => o.status === status);
  res.json({ success: true, orders });
});

// API: add new order
app.post('/api/orders', (req, res) => {
  const data = readData();
  const orders = data.orders || [];
  const { name, productName, price, paid, section } = req.body;

  if (!name || !productName || !price || !section) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const id = Date.now().toString();
  const newOrder = {
    id,
    name,
    productName,
    price: Number(price),
    paid: paid === true || paid === 'yes' || paid === 'Yes' || paid === 'YES',
    section,
    status: 'new',
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);
  writeData({ orders });
  res.json({ success: true, order: newOrder });
});

// API: mark order delivered
app.put('/api/orders/:id/deliver', (req, res) => {
  const id = req.params.id;
  const data = readData();
  const orders = data.orders || [];
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });
  orders[idx].status = 'delivered';
  orders[idx].deliveredAt = new Date().toISOString();
  writeData({ orders });
  res.json({ success: true, order: orders[idx] });
});

// API: delete order
app.delete('/api/orders/:id', (req, res) => {
  const id = req.params.id;
  const data = readData();
  const orders = data.orders || [];
  const newOrders = orders.filter(o => o.id !== id);
  writeData({ orders: newOrders });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Ruchiram server running on http://localhost:${PORT}`);
});