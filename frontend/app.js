// ====== Helpers generales ======
const $ = (sel) => document.querySelector(sel);

// Tema claro/oscuro (sólido)
(function initTheme(){
  const saved = localStorage.getItem('theme');
  const isDark = saved ? saved === 'dark' : false;
  document.body.classList.toggle('theme-dark', isDark);
  const t = $('#themeToggle');
  if (t){ t.checked = isDark; t.addEventListener('change', () => {
    const on = t.checked; document.body.classList.toggle('theme-dark', on);
    localStorage.setItem('theme', on ? 'dark' : 'light');
  }); }
})();

// API base configurable (botón flotante)
let API = localStorage.getItem('API_URL') || 'http://127.0.0.1:8000';
$('#btnSettings').addEventListener('click', ()=>{
  const v = prompt('URL del backend (API_URL):', API);
  if(!v) return; API = v.trim(); localStorage.setItem('API_URL', API);
  showToast('API configurada');
});

// Utilidades
function toYMDhms(datetimeLocal){
  if(!datetimeLocal) return '';
  const [d,t] = datetimeLocal.split('T');
  const ymd = d.replaceAll('-', '');
  const [HH='00',MM='00'] = (t||'00:00').split(':');
  return `${ymd}${HH}${MM}00`;
}
function countUp(el, target){
  const end = Number(target)||0; const start = 0; const dur = 500;
  const t0 = performance.now();
  function step(t){
    const k = Math.min(1,(t-t0)/dur); const v = start + (end-start)*k;
    el.textContent = (Math.round(v*100)/100).toFixed(2) + ' %';
    if(k<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function showToast(msg){ const el = $('#toast'); el.textContent = msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 1400); }

// ====== Render ======
function renderBars(dist){
  const container = $('#bars'); container.innerHTML = '';
  if(!dist || !dist.length){ container.innerHTML = '<div class="muted">Sin datos</div>'; return; }
  const max = Math.max(...dist.map(d=>d.cantidad||0), 1);
  dist.forEach(d=>{
    const h = Math.round((d.cantidad/max)*170)+10;
    const bar = document.createElement('div'); bar.className = 'bar'; bar.style.height = '10px';
    bar.innerHTML = `<div class="tip"><strong>${d.resultado}</strong> · ${d.cantidad}</div>`;
    container.appendChild(bar); requestAnimationFrame(()=>{ bar.style.height = h+'px'; });
  });
}
function renderTables(dist, resumen){
  const tbody = document.querySelector('#distTable tbody'); tbody.innerHTML = '';
  (dist||[]).forEach(r=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.resultado}</td><td>${r.cantidad}</td>`; tbody.appendChild(tr); });
  const tbody2 = document.querySelector('#topTable tbody'); tbody2.innerHTML = '';
  (resumen||[]).forEach(row=>{
    const nombre = `${row.agente_nombre||''} ${row.agente_apellido||''}`.trim();
    const camp = row.campaña || row.campana || '';
    const tr = document.createElement('tr'); tr.innerHTML = `<td>${camp}</td><td>${nombre}</td><td>${row.gestiones}</td>`; tbody2.appendChild(tr);
  });
}
function renderKpis(data){
  const k = data?.kpis || {contactabilidad:0,penetracion_bruta:0,penetracion_neta:0};
  countUp($('#kpi_contact'), Number(k.contactabilidad||0));
  countUp($('#kpi_pb'), Number(k.penetracion_bruta||0));
  countUp($('#kpi_pn'), Number(k.penetracion_neta||0));
  renderBars(data?.distribution||[]);
  renderTables(data?.distribution||[], data?.top_resumen||[]);
}

// ====== API ======
async function fetchKPIs(){
  const start = toYMDhms($('#start').value);
  const end   = toYMDhms($('#end').value);
  const campaign_id = $('#campaign_id').value.trim();
  const agent_id    = $('#agent_id').value.trim();

  const params = new URLSearchParams();
  if(start) params.append('start', start);
  if(end) params.append('end', end);
  if(campaign_id) params.append('campaign_id', campaign_id);
  if(agent_id) params.append('agent_id', agent_id);

  const btn = $('#btnFetch'); const old = btn.textContent; btn.textContent = 'Cargando…'; btn.disabled = true;
  try{
    const res = await fetch(`${API}/api/kpis?${params.toString()}`);
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json(); window.__lastKPIs = data; renderKpis(data);
  }catch(e){ alert('Error al obtener KPIs: '+e.message); }
  finally{ btn.textContent = old; btn.disabled = false; }
}

async function saveSnapshot(){
  if(!window.__lastKPIs) return alert('Primero aplicá filtros y obtené KPIs');
  const btn = $('#btnSave'); const old = btn.textContent; btn.textContent = 'Guardando…'; btn.disabled = true;
  try{
    const payload = { filters: window.__lastKPIs.filters, kpis: window.__lastKPIs.kpis, distribution: window.__lastKPIs.distribution };
    const res = await fetch(`${API}/api/snapshots`,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ throw new Error(await res.text()); }
    const out = await res.json(); showToast('Snapshot #'+out.id+' guardado'); await listSnapshots();
  }catch(e){ alert('Error guardando snapshot: '+e.message); }
  finally{ btn.textContent = old; btn.disabled = false; }
}

async function listSnapshots(){
  try{
    const res = await fetch(`${API}/api/snapshots`);
    if(!res.ok) return; const rows = await res.json(); const wrap = $('#snapshots'); wrap.innerHTML = '';
    (rows||[]).forEach(r=>{
      let k={}, f={}; try{ k = JSON.parse(r.kpis_json); f = JSON.parse(r.filters_json); }catch{}
      const card = document.createElement('div'); card.className = 'card';
      const dt = new Date(r.created_at); const when = dt.toLocaleString();
      card.innerHTML = `
        <div class="row">
          <div>
            <div class="snap-title">Snapshot #${r.id}</div>
            <div class="muted small">${when}</div>
          </div>
          <div class="right">
            <span class="chip">Ctc: <strong>&nbsp;${k.contactabilidad ?? '-'}%</strong></span>
            <span class="chip">PB: <strong>&nbsp;${k.penetracion_bruta ?? '-'}%</strong></span>
            <span class="chip">PN: <strong>&nbsp;${k.penetracion_neta ?? '-'}%</strong></span>
            <button class="btn" data-id="${r.id}">Ver</button>
          </div>
        </div>`;
      card.querySelector('button').onclick = () => openSnapshot(r.id);
      wrap.appendChild(card);
    });
  }catch{}
}

// ====== Modal de snapshot ======
function openModal(html){ const m = $('#modal'); $('#modalBody').innerHTML = html; m.classList.add('show'); m.setAttribute('aria-hidden','false'); }
function closeModal(){ const m = $('#modal'); m.classList.remove('show'); m.setAttribute('aria-hidden','true'); }
$('#modalClose').addEventListener('click', closeModal);
$('#modalClose2').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e)=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });

async function openSnapshot(id){
  const x = await fetch(`${API}/api/snapshots/${id}`).then(r=>r.json());
  let k={}, f={}, d=[]; try{ k = JSON.parse(x.kpis_json||x.kpis||'{}'); }catch{}
  try{ f = JSON.parse(x.filters_json||x.filters||'{}'); }catch{}
  try{ d = JSON.parse(x.distribution_json||x.distribution||'[]'); }catch{}

  const distRows = (Array.isArray(d)?d:[]).map(r=>`<tr><td>${r.resultado}</td><td>${r.cantidad}</td></tr>`).join('');
  const filtersList = Object.entries(f).map(([k,v])=>`<div class="kv"><span>${k}</span><strong>${v ?? ''}</strong></div>`).join('');
  const html = `
    <div class="modal-grid">
      <div class="modal-card">
        <div class="modal-subtitle">KPIs</div>
        <div class="kpi-row">
          <div><div class="kpi-lg">${(k.contactabilidad??'-')}%</div><div class="muted small">Contactabilidad</div></div>
          <div><div class="kpi-lg">${(k.penetracion_bruta??'-')}%</div><div class="muted small">Penetración Bruta</div></div>
          <div><div class="kpi-lg">${(k.penetracion_neta??'-')}%</div><div class="muted small">Penetración Neta</div></div>
        </div>
      </div>
      <div class="modal-card">
        <div class="modal-subtitle">Filtros</div>
        <div class="kv-wrap">${filtersList || '<span class="muted small">Sin filtros</span>'}</div>
      </div>
      <div class="modal-card full">
        <div class="modal-subtitle">Distribución</div>
        <div class="table-wrap"><table><thead><tr><th>Resultado</th><th>Cantidad</th></tr></thead><tbody>${distRows}</tbody></table></div>
      </div>
    </div>`;
  openModal(html);
}

// ====== Eventos ======
$('#btnFetch').addEventListener('click', fetchKPIs);
$('#btnSave').addEventListener('click', saveSnapshot);

// Carga inicial
listSnapshots();
