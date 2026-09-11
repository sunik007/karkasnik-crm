const STORAGE_KEY='karkasnik-crm-v1';
let state=load();

function load(){
  try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{clients:[],orders:[]}}catch{return{clients:[],orders:[]}}
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));renderAll()}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function money(v){return new Intl.NumberFormat('ru-RU').format(Number(v)||0)+' ₽'}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function clientName(id){return state.clients.find(c=>c.id===id)?.name||'Без клиента'}

function renderStats(){
  document.querySelector('#statClients').textContent=state.clients.length;
  document.querySelector('#statOrders').textContent=state.orders.length;
  document.querySelector('#statActive').textContent=state.orders.filter(o=>!['Завершён','Отказ'].includes(o.status)).length;
  document.querySelector('#statRevenue').textContent=money(state.orders.reduce((s,o)=>s+(Number(o.price)||0),0));
}

function renderClientOptions(){
  const sel=document.querySelector('#orderClient');
  if(!state.clients.length){sel.innerHTML='<option value="">Сначала добавьте клиента</option>';return}
  sel.innerHTML='<option value="">Выберите клиента</option>'+state.clients.map(c=>`<option value="${c.id}">${esc(c.name)} — ${esc(c.phone)}</option>`).join('');
}

function clientCard(c){
  const orderCount=state.orders.filter(o=>o.clientId===c.id).length;
  return `<article class="card"><div class="card-top"><div><h4>${esc(c.name)}</h4><div class="muted">${esc(c.phone)}${c.city?' · '+esc(c.city):''}</div></div><span class="badge">${orderCount} заказ.</span></div><div class="meta">${c.messenger?`<div>💬 ${esc(c.messenger)}</div>`:''}${c.address?`<div>📍 ${esc(c.address)}</div>`:''}<div>Источник: ${esc(c.source||'—')}</div>${c.comment?`<div>${esc(c.comment)}</div>`:''}</div><button class="danger-link" onclick="deleteClient('${c.id}')">Удалить клиента</button></article>`
}
function orderCard(o){
  const dates=[o.startDate&&`Начало: ${o.startDate}`,o.deadline&&`Сдача: ${o.deadline}`].filter(Boolean).join(' · ');
  return `<article class="card"><div class="card-top"><div><h4>${esc(clientName(o.clientId))}</h4><div class="muted">${esc(o.size||'Размер не указан')}${o.area?' · '+esc(o.area)+' м²':''}</div></div><span class="badge">${esc(o.status||'Новый')}</span></div><div class="meta"><div>${esc(o.package||'—')} · <strong>${money(o.price)}</strong></div>${o.prepayment?`<div>Предоплата: ${money(o.prepayment)}</div>`:''}${dates?`<div class="muted">${esc(dates)}</div>`:''}${o.comment?`<div>${esc(o.comment)}</div>`:''}</div><button class="danger-link" onclick="deleteOrder('${o.id}')">Удалить заказ</button></article>`
}

function renderClients(){
  const q=document.querySelector('#clientSearch').value.trim().toLowerCase();
  const list=state.clients.filter(c=>[c.name,c.phone,c.city,c.address,c.source].join(' ').toLowerCase().includes(q));
  document.querySelector('#clientList').innerHTML=list.length?list.slice().reverse().map(clientCard).join(''):'<div class="empty">Клиентов пока нет</div>';
}
function renderOrders(){
  const q=document.querySelector('#orderSearch').value.trim().toLowerCase();
  const list=state.orders.filter(o=>[clientName(o.clientId),o.size,o.status,o.package].join(' ').toLowerCase().includes(q));
  document.querySelector('#orderList').innerHTML=list.length?list.slice().reverse().map(orderCard).join(''):'<div class="empty">Заказов пока нет</div>';
}
function renderRecent(){
  const recent=state.orders.slice(-3).reverse();
  document.querySelector('#recentOrders').innerHTML=recent.length?recent.map(orderCard).join(''):'<div class="empty">Добавьте первый заказ</div>';
}
function renderAll(){renderStats();renderClientOptions();renderClients();renderOrders();renderRecent()}

window.deleteClient=id=>{
  if(!confirm('Удалить клиента и все его заказы?'))return;
  state.clients=state.clients.filter(c=>c.id!==id);
  state.orders=state.orders.filter(o=>o.clientId!==id);save();
};
window.deleteOrder=id=>{if(confirm('Удалить заказ?')){state.orders=state.orders.filter(o=>o.id!==id);save()}};

document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(v=>v.classList.remove('active'));
  document.querySelector('#'+btn.dataset.view).classList.add('active');btn.classList.add('active');
}));
document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>document.querySelector('#'+btn.dataset.open).showModal()));
document.querySelectorAll('.close').forEach(btn=>btn.addEventListener('click',()=>btn.closest('dialog').close()));
document.querySelector('#clientSearch').addEventListener('input',renderClients);
document.querySelector('#orderSearch').addEventListener('input',renderOrders);

document.querySelector('#clientForm').addEventListener('submit',e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);
  state.clients.push({id:uid(),name:f.get('name'),phone:f.get('phone'),messenger:f.get('messenger'),city:f.get('city'),address:f.get('address'),source:f.get('source'),date:f.get('date')||new Date().toISOString().slice(0,10),comment:f.get('comment')});
  e.currentTarget.reset();e.currentTarget.closest('dialog').close();save();
});
document.querySelector('#orderForm').addEventListener('submit',e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);if(!f.get('clientId'))return alert('Сначала выберите клиента');
  state.orders.push({id:uid(),clientId:f.get('clientId'),size:f.get('size'),area:f.get('area'),package:f.get('package'),price:f.get('price'),prepayment:f.get('prepayment'),status:f.get('status'),startDate:f.get('startDate'),deadline:f.get('deadline'),comment:f.get('comment')});
  e.currentTarget.reset();e.currentTarget.closest('dialog').close();save();
});
document.querySelector('#resetBtn').addEventListener('click',()=>{if(confirm('Очистить все данные CRM на этом устройстве?')){state={clients:[],orders:[]};save()}});

renderAll();
