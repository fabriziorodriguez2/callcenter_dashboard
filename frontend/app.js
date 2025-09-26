const $ = s => document.querySelector(s);
let API = localStorage.getItem('API_URL') || 'http://127.0.0.1:8000';

function toast(msg){
  const el = $('#toast'); if(!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 1500);
}
function toYMDhms(v){
  if(!v) return '';
  const [d,t] = v.split('T');
  const ymd = d.replaceAll('-','');
  const [hh='00',mm='00'] = (t||'00:00').split(':');
  return `${ymd}${hh}${mm}00`;
}
function countUp(el, target){
  const end = Number(target)||0, start=0, dur=380, t0=performance.now();
  const step = t => {
    const k=Math.min(1,(t-t0)/dur);
    const val=start+(end-start)*k;
    el.textContent = (Math.round(val*100)/100).toFixed(2) + '%';
    if(k<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ======================== AUTOCOMPLETE ===========================
function debounce(fn, ms = 220){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

function makeAC({input, listBox, fetcher, formatItem}) {
  let items = [];
  let active = -1;

  function render(){
    listBox.innerHTML = '';
    if (!items.length) { listBox.classList.remove('show'); return; }
    items.forEach((it, i) => {
      const div = document.createElement('div');
      div.className = 'ac-item' + (i===active ? ' active' : '');
      div.setAttribute('role','option');
      div.innerHTML = formatItem(it);
      // mousedown evita perder el focus antes del click
      div.addEventListener('mousedown', (e) => { e.preventDefault(); apply(it); });
      listBox.appendChild(div);
    });
    listBox.classList.add('show');
  }

  function hide(){ listBox.classList.remove('show'); active = -1; }

  function apply(it){
    // Precisión: dejamos el ID en el input; guardamos label legible en data-label (por si lo querés usar)
    input.value = String(it.id);
    input.dataset.label = it._label || '';
    hide();
  }

  async function search(term){
    try{
      const rows = await fetcher(term);
      items = rows.map(r => ({ id:r.id, _label:r.label, _meta:r.meta || '' }));
      render();
    }catch{
      items = []; hide();
    }
  }

  input.addEventListener('focus', () => search(input.value.trim()));
  input.addEventListener('input', debounce(e => search(e.target.value.trim()), 220));
  input.addEventListener('keydown', (e) => {
    if (!listBox.classList.contains('show')) return;
    const max = items.length - 1;
    if (e.key === 'ArrowDown'){ e.preventDefault(); active = Math.min(max, active + 1); render(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); active = Math.max(0, active - 1); render(); }
    else if (e.key === 'Enter'){ if (active >= 0) { e.preventDefault(); apply(items[active]); } }
    else if (e.key === 'Escape'){ hide(); }
  });
  input.addEventListener('blur', () => setTimeout(hide, 120)); // deja tiempo al click
}

async function fetchCampaignsAC(term){
  const qs = term ? `?q=${encodeURIComponent(term)}` : '';
  const res = await fetch(`${API}/api/campaigns${qs}`);
  if(!res.ok) return [];
  const rows = await res.json();
  return rows.map(r => ({ id: r.id, label: r.nombre, meta: r.codigo }));
}

async function fetchAgentsAC(term){
  const qs = term ? `?q=${encodeURIComponent(term)}` : '';
  const res = await fetch(`${API}/api/agents${qs}`);
  if(!res.ok) return [];
  const rows = await res.json();
  return rows.map(r => ({ id: r.id, label: r.nombre_completo, meta: r.usuario }));
}

function acItemTemplate(it){
  return `<span>${it._label}</span><small>${it._meta || ''}</small>`;
}

// ========================= CHART & RENDER ========================
let distChart;
function renderChart(rows){
  const ctx = document.getElementById('distChart');
  if(!ctx || typeof Chart==='undefined') return;
  const labels = rows.map(r=>r.resultado);
  const data = rows.map(r=>r.cantidad||0);

  const css = getComputedStyle(document.documentElement);
  const axis = css.getPropertyValue('--muted').trim();
  const grid = css.getPropertyValue('--border').trim();
  const color = css.getPropertyValue('--accent').trim();

  const cfg = {
    type:'bar',
    data:{ labels, datasets:[{ label:'Cantidad', data, backgroundColor:color, borderColor:color, borderWidth:1, borderRadius:2 }]},
    options:{
      responsive:true, plugins:{ legend:{display:false} },
      scales:{ x:{ ticks:{color:axis}, grid:{color:grid} }, y:{ beginAtZero:true, ticks:{color:axis}, grid:{color:grid} } }
    }
  };
  if(distChart) distChart.destroy();
  distChart = new Chart(ctx, cfg);
}

function render(data){
  const k = data?.kpis || {contactabilidad:0,penetracion_bruta:0,penetracion_neta:0};
  countUp($('#kpi_contact'), Number(k.contactabilidad||0));
  countUp($('#kpi_pb'), Number(k.penetracion_bruta||0));
  countUp($('#kpi_pn'), Number(k.penetracion_neta||0));

  renderChart(data?.distribution||[]);

  const tb = document.querySelector('#distTable tbody');
  tb.innerHTML = '';
  (data?.distribution||[]).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.resultado}</td><td>${r.cantidad}</td>`;
    tb.appendChild(tr);
  });
}

// ======================== API CALLS ==============================
async function fetchKPIs(){
  console.log('[DBG] click Aplicar');
  const start = toYMDhms($('#start').value);
  const end   = toYMDhms($('#end').value);
  const campaign_id = $('#campaign_id').value.trim();
  const agent_id    = $('#agent_id').value.trim();

  const qs = new URLSearchParams();
  if(start) qs.append('start', start);
  if(end)   qs.append('end', end);
  if(campaign_id) qs.append('campaign_id', campaign_id);
  if(agent_id)    qs.append('agent_id', agent_id);

  const btn = $('#btnFetch'); const backup = btn.textContent;
  btn.textContent='Aplicando…'; btn.disabled=true;
  try{
    const url = `${API}/api/kpis${qs.toString()?`?${qs.toString()}`:''}`;
    console.log('[DBG] GET', url);
    const res = await fetch(url);
    const txt = await res.text();
    console.log('[DBG] status', res.status, 'body', txt);
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}\n${txt}`);
    const data = JSON.parse(txt);
    window.__lastKPIs = data;
    render(data);
  }catch(e){
    alert('Error al obtener KPIs:\n' + (e?.message || e));
  }finally{
    btn.textContent = backup; btn.disabled = false;
  }
}

async function saveSnapshot(){
  if(!window.__lastKPIs) return alert('Primero aplicá filtros y obtené KPIs');
  const btn = $('#btnSave'); const backup = btn.textContent;
  btn.textContent='Guardando…'; btn.disabled=true;
  try{
    const payload = {
      filters: window.__lastKPIs.filters,
      kpis: window.__lastKPIs.kpis,
      distribution: window.__lastKPIs.distribution
    };
    const res = await fetch(`${API}/api/snapshots`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(`${res.status} ${res.statusText} - ${await res.text()}`);
    await listSnapshots();
    toast('Snapshot guardado');
  }catch(e){
    alert('Error guardando snapshot:\n' + (e?.message || e));
  }finally{
    btn.textContent = backup; btn.disabled = false;
  }
}

async function listSnapshots(){
  try{
    const res = await fetch(`${API}/api/snapshots`);
    if(!res.ok) return;
    const rows = await res.json();
    const wrap = $('#snapshots'); wrap.innerHTML = '';
    (rows||[]).forEach(r=>{
      let k={}; try{ k = JSON.parse(r.kpis_json||'{}'); }catch{}
      const when = r.created_at ? new Date(r.created_at).toLocaleString() : '';
      const card = document.createElement('div'); card.className = 'item';
      card.innerHTML = `
        <div>
          <div style="font-weight:700">Snapshot #${r.id}</div>
          <div class="meta">${when}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="pill">Ctc <strong>${k.contactabilidad ?? '-' }%</strong></span>
          <span class="pill">PB <strong>${k.penetracion_bruta ?? '-' }%</strong></span>
          <span class="pill">PN <strong>${k.penetracion_neta ?? '-' }%</strong></span>
          <button class="btn" data-id="${r.id}">Ver</button>
        </div>`;
      card.querySelector('button').onclick = ()=>openSnapshot(r.id);
      const container = document.createElement('div'); container.className='card'; container.appendChild(card);
      wrap.appendChild(container);
    });
  }catch{}
}

// =========================== MODAL ===============================
function openModal(html){
  const m = $('#modal'); if(!m) return;
  $('#modalBody').innerHTML = html;
  m.classList.add('show'); m.setAttribute('aria-hidden','false');
}
function closeModal(){
  const m = $('#modal'); if(!m) return;
  m.classList.remove('show'); m.setAttribute('aria-hidden','true');
}

function prettyFilters(f){
  if(!f) return '';
  const map = {
    start: 'Desde',
    end: 'Hasta',
    campaign_id: 'Campaña (filtro)',
    agent_id: 'Agente (filtro)',
    campaign_label: 'Campaña',
    agent_label: 'Agente'
  };
  const order = ['campaign_label','agent_label','campaign_id','agent_id','start','end'];
  const keys = Object.keys(f).sort((a,b)=> order.indexOf(a)-order.indexOf(b));
  return keys.map(k=>{
    const label = map[k] || k;
    return `<div class="kv"><span>${label}</span><strong>${f[k] ?? ''}</strong></div>`;
  }).join('');
}

async function openSnapshot(id){
  const x = await fetch(`${API}/api/snapshots/${id}`).then(r=>r.json());
  let k={}, f={}, d=[];
  try{ k = JSON.parse(x.kpis_json||x.kpis||'{}'); }catch{}
  try{ f = JSON.parse(x.filters_json||x.filters||'{}'); }catch{}
  try{ d = JSON.parse(x.distribution_json||x.distribution||'[]'); }catch{}

  const distRows = (Array.isArray(d)?d:[]).map(r=>`<tr><td>${r.resultado}</td><td>${r.cantidad}</td></tr>`).join('');
  const filtersList = prettyFilters(f) || '<span class="meta">Sin filtros</span>';

  const html = `
    <div class="kpi-row">
      <div><div class="kpi-lg">${(k.contactabilidad??'-')}%</div><div class="meta">Contactabilidad</div></div>
      <div><div class="kpi-lg">${(k.penetracion_bruta??'-')}%</div><div class="meta">Penetración Bruta</div></div>
      <div><div class="kpi-lg">${(k.penetracion_neta??'-')}%</div><div class="meta">Penetración Neta</div></div>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <div class="kv-grid">${filtersList}</div>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Resultado</th><th>Cantidad</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
    </div>`;
  openModal(html);
}

// ========================= INIT =================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[DBG] DOM listo, app.js activo');

  // Config botón ⚙️
  $('#btnSettings')?.addEventListener('click', ()=>{
    const v = prompt('URL del backend (API_URL):', API);
    if(!v) return;
    API = v.trim();
    localStorage.setItem('API_URL', API);
    toast('API configurada');
  });

  // Fechas por defecto (últimos 7 días)
  const end = new Date();
  const start = new Date(); start.setDate(end.getDate()-7);
  const pad=n=>String(n).padStart(2,'0');
  const toLocal=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  $('#start').value = toLocal(start);
  $('#end').value = toLocal(end);

  // Listeners principales
  $('#btnFetch')?.addEventListener('click', fetchKPIs);
  $('#btnSave')?.addEventListener('click', saveSnapshot);
  $('#modalClose')?.addEventListener('click', closeModal);
  $('#modalClose2')?.addEventListener('click', closeModal);
  $('#modal')?.addEventListener('click', (e)=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });

  // Autocomplete (dropdowns)
  makeAC({
    input: document.getElementById('campaign_id'),
    listBox: document.getElementById('campaignListBox'),
    fetcher: fetchCampaignsAC,
    formatItem: acItemTemplate
  });
  makeAC({
    input: document.getElementById('agent_id'),
    listBox: document.getElementById('agentListBox'),
    fetcher: fetchAgentsAC,
    formatItem: acItemTemplate
  });

  // Health check
  try{
    const r = await fetch(`${API}/api/health`);
    if(!r.ok) throw new Error();
  }catch{
    toast('Configurá la API (⚙️)');
  }

  // Snapshots y primer fetch
  await listSnapshots();
  await fetchKPIs();
});
