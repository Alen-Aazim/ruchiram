// script.js - shared by index.html and orders.html
const PRODUCTS = [
  'Biriyaani',
  'Soda',
  'Uppilittathu',
  'Popcorn',
  'Ice cream'
];

// Helpers
const api = {
  getOrders: async (params='') => {
    const res = await fetch('/api/orders' + (params ? `?${params}` : ''));
    return res.json();
  },
  addOrder: async (body) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    return res.json();
  },
  deliver: async (id) => {
    const res = await fetch(`/api/orders/${id}/deliver`, { method: 'PUT' });
    return res.json();
  },
  deleteOrder: async (id) => {
    const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    return res.json();
  }
};

function isModalOpen() {
  const m = document.getElementById('orderModal');
  return m && !m.classList.contains('hidden');
}

function openOrderModal() {
  const modal = document.getElementById('orderModal');
  if (!modal) return;
  // prevent background scroll
  document.body.style.overflow = 'hidden';
  modal.classList.remove('hidden');

  // push history state so that back button closes modal
  try {
    if (!history.state || !history.state.modalOpen) {
      history.pushState({ modalOpen: true }, '');
    }
  } catch (e) {
    // ignore
  }
}

function closeOrderModal({ fromPopState=false } = {}) {
  const modal = document.getElementById('orderModal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';

  // if not coming from popstate, and history state was pushed, go back so browser back remains consistent
  if (!fromPopState) {
    try {
      if (history.state && history.state.modalOpen) {
        history.back();
      }
    } catch (e) {}
  }
}

function mountProductsGrid() {
  const grid = document.getElementById('productGrid');
  const sel = document.getElementById('productSelect');
  if (grid) {
    grid.innerHTML = '';
    PRODUCTS.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card product-card';
      card.innerHTML = `<strong>${p}</strong><div class="small">Tap to order</div><div style="margin-top:8px"><button class="btn" data-product="${p}">Order</button></div>`;
      grid.appendChild(card);
    });
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-product]');
      if (!btn) return;
      openOrderModal();
      // set product in modal selects (if present)
      const productSelect = document.querySelector('#orderModal select[name="productName"]');
      if (productSelect) productSelect.value = btn.dataset.product;
    });
  }
  if (sel) {
    sel.innerHTML = PRODUCTS.map(p => `<option value="${p}">${p}</option>`).join('');
  }
}

function setupDotMenu() {
  const dot = document.getElementById('menuDot');
  const menu = document.getElementById('dotMenu');
  if (!dot || !menu) return;
  dot.addEventListener('click', (ev) => {
    ev.stopPropagation();
    menu.classList.toggle('hidden');
  });
  // close menu when clicking outside
  document.addEventListener('click', () => {
    if (!menu.classList.contains('hidden')) menu.classList.add('hidden');
  });

  menu.querySelectorAll('button[data-action]').forEach(b => {
    b.addEventListener('click', () => {
      const sec = b.dataset.action;
      window.location = `orders.html#section=${sec}`;
    });
  });
  document.getElementById('viewDelivered')?.addEventListener('click', () => window.location='orders.html#filter=delivered');
  document.getElementById('viewAll')?.addEventListener('click', () => window.location='orders.html');
  document.getElementById('newOrderBtn')?.addEventListener('click', openOrderModal);
}

// Modal & form
function bindModalForm() {
  const modal = document.getElementById('orderModal');
  if (!modal) return;

  const closeBtn = modal.querySelector('#closeModal');
  if (closeBtn) closeBtn.addEventListener('click', () => closeOrderModal());

  // close when clicking backdrop (but not modal-card)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeOrderModal();
  });

  // close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModalOpen()) {
      closeOrderModal();
    }
  });

  // handle popstate to close modal when user presses browser back
  window.addEventListener('popstate', (ev) => {
    // if modal is open and the popped state is NOT modalOpen, then close modal
    if (isModalOpen()) {
      // mark fromPopState true so closeOrderModal doesn't call history.back() again
      closeOrderModal({ fromPopState: true });
    }
  });

  const form = modal.querySelector('#orderForm');
  if (!form) return;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const body = {
      name: fd.get('name'),
      productName: fd.get('productName'),
      price: fd.get('price'),
      paid: fd.get('paid') === 'yes',
      section: fd.get('section')
    };
    const r = await api.addOrder(body);
    if (r.success) {
      alert('Order saved!');
      form.reset();
      closeOrderModal();
      if (window.location.pathname.endsWith('orders.html')) {
        loadOrdersFromHash();
      }
    } else {
      alert('Error: ' + (r.message || 'unable to save'));
    }
  });
}

// Orders page logic
async function renderOrders(orders) {
  const container = document.getElementById('ordersList');
  const title = document.getElementById('panelTitle');
  if (!container) return;
  container.innerHTML = '';
  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="small">No orders found</div>';
    return;
  }
  orders.forEach(o => {
    const item = document.createElement('div');
    item.className = 'order-item';
    item.innerHTML = `
      <div class="order-meta">
        <strong>${o.name} — ${o.productName}</strong>
        <div class="small">Price: ${o.price} • Paid: ${o.paid ? 'Yes' : 'No'} • Section: ${o.section} • Status: ${o.status}</div>
        <div class="small">Created: ${new Date(o.createdAt).toLocaleString()}</div>
      </div>
      <div class="order-actions">
        ${o.status !== 'delivered' ? `<button class="deliverBtn" data-id="${o.id}">Mark Delivered</button>` : `<button class="ghost" disabled>Delivered</button>`}
        <button class="deleteBtn" data-id="${o.id}">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.deliverBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await api.deliver(id);
      loadOrdersFromHash();
    });
  });
  container.querySelectorAll('.deleteBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this order?')) return;
      await api.deleteOrder(btn.dataset.id);
      loadOrdersFromHash();
    });
  });
}

async function loadOrdersFromHash() {
  const h = location.hash.slice(1);
  let q = '';
  let title = 'All Orders';
  if (h.includes('section=')) {
    const m = h.match(/section=([A-E])/);
    if (m) {
      q = `section=${m[1]}`;
      title = `Section ${m[1]} Orders`;
    }
  } else if (h.includes('filter=delivered')) {
    q = `status=delivered`;
    title = 'Delivered Orders';
  } else {
    q = '';
    title = 'All Orders';
  }
  document.getElementById('panelTitle')?.textContent = title;
  const res = await api.getOrders(q);
  if (res.success) renderOrders(res.orders);
  else document.getElementById('ordersList').innerText = 'Failed to load';
}

document.addEventListener('DOMContentLoaded', () => {
  mountProductsGrid();
  setupDotMenu();
  bindModalForm();

  if (window.location.pathname.endsWith('orders.html')) {
    document.getElementById('allOrdersBtn')?.addEventListener('click', () => { location.hash=''; loadOrdersFromHash(); });
    document.getElementById('deliveredBtn')?.addEventListener('click', () => { location.hash='filter=delivered'; loadOrdersFromHash(); });
    document.querySelectorAll('.sectionBtn')?.forEach(b => b.addEventListener('click', () => {
      const s = b.dataset.section;
      location.hash=`section=${s}`;
      loadOrdersFromHash();
    }));
    document.getElementById('openNewOrder')?.addEventListener('click', openOrderModal);

    loadOrdersFromHash();
    window.addEventListener('hashchange', loadOrdersFromHash);
  }
});