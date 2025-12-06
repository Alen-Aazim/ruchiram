// script.js - redesigned client logic
const PRODUCTS = ['Biriyaani','Soda','Uppilittathu','Popcorn','Ice cream'];

// API helpers
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

// Modal helpers + history for Android back support
function isModalOpen(){ const m = document.getElementById('orderModal'); return m && !m.classList.contains('hidden'); }
function openModal(){ const m = document.getElementById('orderModal'); if(!m) return; document.body.style.overflow='hidden'; m.classList.remove('hidden'); try{ if(!history.state || !history.state.modalOpen) history.pushState({modalOpen:true}, ''); }catch(e){} }
function closeModal(opts={fromPop:false}){ const m = document.getElementById('orderModal'); if(!m) return; m.classList.add('hidden'); document.body.style.overflow=''; if(!opts.fromPop){ try{ if(history.state && history.state.modalOpen) history.back(); }catch(e){} } }

// mount products on index and fill selects
function mountProducts(){
  const grid = document.getElementById('productGrid');
  if(grid){
    grid.innerHTML = '';
    PRODUCTS.forEach(p=>{
      const div = document.createElement('div');
      div.className = 'product-card';
      div.innerHTML = `<strong>${p}</strong><div class="small">Tap to order</div><div style="margin-top:10px"><button class="btn" data-product="${p}">Order</button></div>`;
      grid.appendChild(div);
    });
    grid.addEventListener('click', e=>{
      const btn = e.target.closest('button[data-product]');
      if(!btn) return;
      openModal();
      const sel = document.querySelector('#orderModal select[name="productName"]');
      if(sel) sel.value = btn.dataset.product;
    });
  }
  // fill selects
  document.querySelectorAll('select[name="productName"]').forEach(sel=>{
    sel.innerHTML = PRODUCTS.map(p=>`<option value="${p}">${p}</option>`).join('');
  });
}

// dot menu
function setupDotMenu(){
  const dot = document.getElementById('menuDot');
  const menu = document.getElementById('dotMenu');
  if(!dot||!menu) return;
  dot.addEventListener('click', ev=>{ ev.stopPropagation(); menu.classList.toggle('hidden'); });
  document.addEventListener('click', ()=>{ if(!menu.classList.contains('hidden')) menu.classList.add('hidden'); });
  menu.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click', ()=> {
    const sec = b.dataset.action;
    window.location = `orders.html#section=${sec}`;
  }));
  document.getElementById('viewDelivered')?.addEventListener('click', ()=> window.location='orders.html#filter=delivered');
  document.getElementById('viewAll')?.addEventListener('click', ()=> window.location='orders.html');
  document.getElementById('newOrderBtnTop')?.addEventListener('click', openModal);
}

// bind modal form
function bindModalForm(){
  const modal = document.getElementById('orderModal');
  if(!modal) return;
  modal.querySelector('#closeModal')?.addEventListener('click', ()=>closeModal());
  modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && isModalOpen()) closeModal(); });
  window.addEventListener('popstate', ()=>{ if(isModalOpen()) closeModal({fromPop:true}); });

  const form = document.getElementById('orderForm');
  if(!form) return;
  form.addEventListener('submit', async ev=>{
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
    if(r.success){
      alert('Order saved');
      form.reset();
      closeModal();
      if(location.pathname.endsWith('orders.html')) loadOrdersFromHash();
    } else {
      alert('Error: ' + (r.message||'unable to save'));
    }
  });
  document.getElementById('cancelBtn')?.addEventListener('click', ()=> closeModal());
}

// Orders dashboard functions
async function renderOrders(orders){
  const cont = document.getElementById('ordersList');
  const sum = document.getElementById('summary');
  if(!cont) return;
  cont.innerHTML = '';
  if(!orders || orders.length===0){
    cont.innerHTML = `<div class="card muted">No orders</div>`;
    if(sum) sum.textContent = '0 orders';
    return;
  }
  if(sum) sum.textContent = `${orders.length} order(s)`;
  orders.forEach(o=>{
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-top">
        <div>
          <strong>${escapeHtml(o.name)} — ${escapeHtml(o.productName)}</strong>
          <div class="meta">${new Date(o.createdAt).toLocaleString()} • Section ${o.section} • ₹${o.price} • Paid: ${o.paid ? 'Yes' : 'No'}</div>
        </div>
        <div class="order-actions">
          ${o.status !== 'delivered' ? `<button class="deliver" data-id="${o.id}">Deliver</button>` : `<span class="meta">Delivered</span>`}
          <button class="delete" data-id="${o.id}">Delete</button>
        </div>
      </div>
      ${o.status==='delivered' ? `<div class="meta">Delivered at ${new Date(o.deliveredAt||o.createdAt).toLocaleString()}</div>` : ''}
    `;
    cont.appendChild(card);
  });

  // bind actions
  cont.querySelectorAll('button.deliver').forEach(b=>{
    b.addEventListener('click', async ()=> {
      const id = b.dataset.id;
      if(!confirm('Mark this order delivered?')) return;
      await api.deliver(id);
      loadOrdersFromHash();
    });
  });
  cont.querySelectorAll('button.delete').forEach(b=>{
    b.addEventListener('click', async ()=> {
      const id = b.dataset.id;
      if(!confirm('Delete order?')) return;
      await api.deleteOrder(id);
      loadOrdersFromHash();
    });
  });
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }

async function loadOrdersFromHash(){
  const h = location.hash.slice(1);
  let q = '';
  let title = 'All Orders';
  if(h.includes('section=')){
    const m = h.match(/section=([A-E])/);
    if(m){ q = `section=${m[1]}`; title = `Section ${m[1]} Orders`; }
  } else if(h.includes('filter=delivered')){
    q = `status=delivered`; title = 'Delivered Orders';
  } else { q = ''; title = 'All Orders'; }
  document.getElementById('panelTitle')?.textContent = title;
  const res = await api.getOrders(q);
  if(res.success) renderOrders(res.orders);
  else document.getElementById('ordersList').innerText = 'Failed to load';
}

// init
document.addEventListener('DOMContentLoaded', ()=>{
  mountProducts();
  setupDotMenu();
  bindModalForm();

  // index page bindings
  document.getElementById('openNew')?.addEventListener('click', ()=> openModal());
  document.getElementById('fab')?.addEventListener('click', ()=> openModal());
  document.getElementById('newOrderBtnTop')?.addEventListener('click', ()=> openModal());
  document.getElementById('menuDot')?.addEventListener('click', ()=>{});
  document.getElementById('openNew')?.addEventListener('click', ()=>{});
  document.getElementById('cancelBtn')?.addEventListener('click', ()=> closeModal());

  // orders page bindings
  if(location.pathname.endsWith('orders.html')){
    document.getElementById('allOrdersBtn')?.addEventListener('click', ()=> { location.hash=''; loadOrdersFromHash(); });
    document.getElementById('deliveredBtn')?.addEventListener('click', ()=> { location.hash='filter=delivered'; loadOrdersFromHash(); });
    document.querySelectorAll('.sectionBtn').forEach(b=> b.addEventListener('click', ()=>{
      const s = b.dataset.section;
      location.hash = `section=${s}`;
      loadOrdersFromHash();
    }));
    document.getElementById('ordersNew')?.addEventListener('click', ()=> openModal());
    loadOrdersFromHash();
    window.addEventListener('hashchange', loadOrdersFromHash);
  }
});