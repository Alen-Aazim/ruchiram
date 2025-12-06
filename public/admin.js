// admin.js
const API = '/api';
let token = '';

// DOM
const btnLogin = document.getElementById('btnLogin');
const tokenInput = document.getElementById('token');
const adminArea = document.getElementById('adminArea');
const btnFetchPublic = document.getElementById('btnFetchPublic');
const btnAddProd = document.getElementById('btnAddProd');
const prodName = document.getElementById('prodName');
const prodPrice = document.getElementById('prodPrice');
const prodSection = document.getElementById('prodSection');
const prodPrivate = document.getElementById('prodPrivate');
const allProducts = document.getElementById('allProducts');

btnLogin?.addEventListener('click', async () => {
  token = tokenInput.value.trim();
  if (!token) return alert('Enter ADMIN_TOKEN');
  const ok = await loadAdminProducts();
  if (ok) adminArea.style.display = 'block';
});

btnFetchPublic?.addEventListener('click', loadPublicProducts);

btnAddProd?.addEventListener('click', async () => {
  const body = {
    product: prodName.value.trim(),
    section: prodSection.value,
    price: Number(prodPrice.value || 0),
    private: !!prodPrivate.checked
  };
  if (!body.product) return alert('Enter product name');
  const res = await fetch(API + '/admin/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  if (res.status === 401) return alert('Unauthorized: check token');
  const j = await res.json();
  if (j.ok) {
    prodName.value = ''; prodPrice.value = '';
    loadAdminProducts();
  } else {
    alert('Error adding product');
  }
});

async function loadAdminProducts() {
  try {
    const res = await fetch(API + '/admin/products', { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { alert('Unauthorized'); return false; }
    const j = await res.json();
    renderProducts(j.products || [], true);
    return true;
  } catch (e) {
    alert('Error loading products');
    return false;
  }
}

async function loadPublicProducts() {
  try {
    const res = await fetch(API + '/products');
    const j = await res.json();
    renderProducts(j.products || [], false);
  } catch (e) {
    alert('Error loading public products');
  }
}

function renderProducts(list, adminMode) {
  allProducts.innerHTML = '';
  if (!list.length) { allProducts.textContent = 'No products yet.'; return; }
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'product-item';
    el.innerHTML = `<div><strong>${escapeHtml(p.product)}</strong><div class="muted">${escapeHtml(p.section)} • ₹${p.price||0}</div></div>`;
    if (adminMode) {
      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = 'Delete';
      del.addEventListener('click', () => removeProduct(p.id));
      el.appendChild(del);
    }
    allProducts.appendChild(el);
  });
}

async function removeProduct(id) {
  if (!confirm('Delete this product?')) return;
  const res = await fetch(API + '/admin/product/' + encodeURIComponent(id), { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  if (res.status === 401) return alert('Unauthorized');
  loadAdminProducts();
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }