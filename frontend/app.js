// Helpers
const $ = s => document.querySelector(s);

let API = localStorage.getItem('API_URL') || 'http://127.0.0.1:8000';
$('#btnSettings').addEventListener('click', ()=>{
  const v = prompt('URL del backend (API_URL):', API);
  if(!v) return;
  API = v.trim();
  localStorage.setItem('API_URL', API);
  toast('API configurada');
});

function toYMDhms(v){
  if(!v) return '';
  const [d,t] = v.split('T');
  const ymd = d.replaceAll('-','');
  const [hh='00',mm='00'] = (t||'00:00').split(':');
  return `${ymd}${hh}${mm}00`;
}
function countUp(el, target){
  const end = Number(target)||0, start=0, dur=450, t0=performance.now();
  function step(t){ const k=Math.min(1,(t-t0)/dur); const val=start+(end-start)*k;
    el.textContent = (Math.round(val*100)/100).toFixed(2) + '%';
    if(k<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'), 1300); }

// Chart
let distChart;
function renderChart(rows){
  const ctx = document.getElementById('distChart');
  if(!ctx || typeof Chart==='undefined') return;
  const labels = rows.map(r=>r.resultado);
  const data = rows.map(r=>r.cantidad||0);
  const cfg = {
    type:'bar',
    data:{ labels, datasets:[{ label:'Cantidad', data, backgroundColor:'#7A1B56', borderColor:'#7A1B56', borderWidth:1, borderRadius:6 }]},
    options:{
      responsive:true,
      plugins:{ legend:{display:false} },
      scales:{ x:{ ticks:{color:'#555'}, grid:{color:'#eee'} }, y:{ beginAtZero:true, ticks:{color:'#555'}, grid:{color:'#eee'} } }
    }
  };
  if(distChart) distChart.destroy();
  distChart = new Chart(ctx, cfg);
}

// Render KPIs + tabla
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

// API
async function fetchKPIs(){
  const start = toYMDhms($('#start').value);
  const end   = toYMDhms($('#end').value);
  const campaign_id = $('#campaign_id').value.trim();
  const agent_id    = $('#agent_id').value.trim();

  const qs = new URLSearchParams();
  if(start) qs.append('start', start);
  if(end) qs.append('end', end);
  if(campaign_id) qs.append('campaign_id', campaign_id);
  if(agent_id) qs.append('agent_id', agent_id);

  const btn = $('#btnFetch'); const txt=btn.textContent; btn.textContent='Cargando…'; btn.disabled=true;
  try{
    const res = await fetch(`${API}/api/kpis?${qs.toString()}`);
    if(!res.ok) throw new Error(await res.text());
    const data = await res.json();
    window.__lastKPIs = data;
    render(data);
  }catch(e){ alert('Error al obtener KPIs: '+e.message); }
  finally{ btn.textContent=txt; btn.disabled=false; }
}

async function saveSnapshot(){
  if(!window.__lastKPIs) return alert('Primero aplicá filtros y obtené KPIs');
  const btn = $('#btnSave'); const txt=btn.textContent; btn.textContent='Guardando…'; btn.disabled=true;
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
    if(!res.ok) throw new Error(await res.text());
    const out = await res.json();
    toast('Snapshot #'+out.id+' guardado');
    await listSnapshots();
  }catch(e){ alert('Error guardando snapshot: '+e.message); }
  finally{ btn.textContent=txt; btn.disabled=false; }
}

async function listSnapshots(){
  try{
    const res = await fetch(`${API}/api/snapshots`);
    if(!res.ok) return;
    const rows = await res.json();
    const wrap = $('#snapshots'); wrap.innerHTML = '';
    (rows||[]).forEach(r=>{
      let k={}; try{ k = JSON.parse(r.kpis_json||'{}'); }catch{}
      const when = new Date(r.created_at).toLocaleString();
      const card = document.createElement('div');
      card.className = 'card item';
      card.innerHTML = `
        <div>
          <div style="font-weight:800">Snapshot #${r.id}</div>
          <div class="muted" style="font-size:12px">${when}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <span class="chip">Ctc <strong>${k.contactabilidad ?? '-' }%</strong></span>
          <span class="chip">PB <strong>${k.penetracion_bruta ?? '-' }%</strong></span>
          <span class="chip">PN <strong>${k.penetracion_neta ?? '-' }%</strong></span>
          <button class="btn" data-id="${r.id}">Ver</button>
        </div>`;
      card.querySelector('button').onclick = ()=>openSnapshot(r.id);
      wrap.appendChild(card);
    });
  }catch{}
}

// Modal
function openModal(html){ const m=$('#modal'); $('#modalBody').innerHTML=html; m.classList.add('show'); m.setAttribute('aria-hidden','false'); }
function closeModal(){ const m=$('#modal'); m.classList.remove('show'); m.setAttribute('aria-hidden','true'); }
$('#modalClose').addEventListener('click', closeModal);
$('#modalClose2').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e)=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });

async function openSnapshot(id){
  const x = await fetch(`${API}/api/snapshots/${id}`).then(r=>r.json());
  let k={}, f={}, d=[];
  try{ k = JSON.parse(x.kpis_json||x.kpis||'{}'); }catch{}
  try{ f = JSON.parse(x.filters_json||x.filters||'{}'); }catch{}
  try{ d = JSON.parse(x.distribution_json||x.distribution||'[]'); }catch{}

  const distRows = (Array.isArray(d)?d:[]).map(r=>`<tr><td>${r.resultado}</td><td>${r.cantidad}</td></tr>`).join('');
  const filtersList = Object.entries(f).map(([k,v])=>`<div class="kv"><span>${k}</span><strong>${v ?? ''}</strong></div>`).join('');

  const html = `
    <div class="kpi-row">
      <div><div class="kpi-lg">${(k.contactabilidad??'-')}%</div><div class="muted" style="font-size:12px">Contactabilidad</div></div>
      <div><div class="kpi-lg">${(k.penetracion_bruta??'-')}%</div><div class="muted" style="font-size:12px">Penetración Bruta</div></div>
      <div><div class="kpi-lg">${(k.penetracion_neta??'-')}%</div><div class="muted" style="font-size:12px">Penetración Neta</div></div>
    </div>
    <hr style="border:none;border-top:1px solid #e6e6ef;margin:14px 0">
    <div class="kv-wrap">${filtersList || '<span class="muted" style="font-size:12px">Sin filtros</span>'}</div>
    <hr style="border:none;border-top:1px solid #e6e6ef;margin:14px 0">
    <div class="table-wrap"><table><thead><tr><th>Resultado</th><th>Cantidad</th></tr></thead><tbody>${distRows}</tbody></table></div>`;
  openModal(html);
}

// Events
$('#btnFetch').addEventListener('click', fetchKPIs);
$('#btnSave').addEventListener('click', saveSnapshot);

// Init
listSnapshots();

function yyyymmdd(dateStr){
  if(!dateStr) return '';
  return dateStr.replaceAll('-',''); // 'YYYY-MM-DD' -> 'YYYYMMDD'
}

function openTableModal(title, headers, rows){
  const thead = `<thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${
    rows.map(r=>`<tr>${headers.map(h=>`<td>${r[h]??''}</td>`).join('')}</tr>`).join('')
  }</tbody>`;
  const html = `<h3 style="margin-top:0">${title}</h3>
    <div class="table-wrap"><table>${thead}${tbody}</table></div>`;
  openModal(html);
}

// --- Gestiones por operador y fecha ---
async function queryGestiones(){
  const op = $('#q_op_id').value.trim();
  const d  = yyyymmdd($('#q_date').value);
  if(!op || !d) return alert('Completa ID operador y fecha');

  const url = `${API}/api/consultas/gestiones?operator_id=${encodeURIComponent(op)}&date=${encodeURIComponent(d)}`;
  const res = await fetch(url);
  if(!res.ok) return alert(await res.text());
  const data = await res.json();
  if(!data.length) return openTableModal('Gestiones', ['mensaje'], [{mensaje:'Sin resultados'}]);

  const headers = ['id','campaña','id_contacto','nombre1','apellido1','resultado','timestamp'];
  openTableModal('Gestiones del operador', headers, data);
}

// --- Contactos No contesta por campaña ---
async function queryNoContesta(){
  const camp = $('#q_campaign').value.trim();
  if(!camp) return alert('Completa ID campaña');

  const url = `${API}/api/consultas/no_contesta?campaign_id=${encodeURIComponent(camp)}`;
  const res = await fetch(url);
  if(!res.ok) return alert(await res.text());
  const data = await res.json();
  const headers = ['id','ci','nombre1','apellido1'];
  openTableModal(`No contesta (campaña ${camp})`, headers, data.length?data:[{id:'-',ci:'-',nombre1:'Sin',apellido1:'resultados'}]);
}

// --- Rendimiento (usa filtros de arriba) ---
async function queryRendimiento(){
  const start = toYMDhms($('#start').value);
  const end   = toYMDhms($('#end').value);
  const campaign_id = $('#campaign_id').value.trim();
  const agent_id    = $('#agent_id').value.trim();

  const qs = new URLSearchParams();
  if(start && end){ qs.append('start', start); qs.append('end', end); }
  if(campaign_id) qs.append('campaign_id', campaign_id);
  if(agent_id) qs.append('agent_id', agent_id);

  const url = `${API}/api/consultas/rendimiento?`+qs.toString();
  const res = await fetch(url);
  if(!res.ok) return alert(await res.text());
  const data = await res.json();
  const headers = ['campaña','operador','gestiones','efectivas','exitosas','contactabilidad','penetracion_bruta','penetracion_neta'];
  openTableModal('Rendimiento', headers, data.length?data:[{campaña:'-',operador:'-',gestiones:0,efectivas:0,exitosas:0,contactabilidad:0,penetracion_bruta:0,penetracion_neta:0}]);
}

// --- Buscar contacto por teléfono / CI ---
async function queryBuscar(){
  const tel = $('#q_tel').value.trim();
  const ci  = $('#q_ci').value.trim();
  if(!tel && !ci) return alert('Ingresá teléfono o CI');
  const qs = new URLSearchParams();
  if(tel) qs.append('telefono', tel);
  if(ci)  qs.append('ci', ci);
  const url = `${API}/api/consultas/contactos?${qs.toString()}`;
  const res = await fetch(url);
  if(!res.ok) return alert(await res.text());
  const data = await res.json();
  const headers = ['id','ci','nombre1','apellido1','telefono'];
  openTableModal('Búsqueda de contactos', headers, data.length?data:[{id:'-',ci:'-',nombre1:'Sin',apellido1:'resultados',telefono:'-'}]);
}

// Listeners
$('#btnQGestiones').addEventListener('click', queryGestiones);
$('#btnQNoContesta').addEventListener('click', queryNoContesta);
$('#btnQRend').addEventListener('click', queryRendimiento);
$('#btnQBuscar').addEventListener('click', queryBuscar);
