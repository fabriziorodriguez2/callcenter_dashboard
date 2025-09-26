const API = localStorage.getItem('API_URL') || 'http://127.0.0.1:8000';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function fetchKPIs() {
  const start = $('#start').value.trim();
  const end = $('#end').value.trim();
  const campaign_id = $('#campaign_id').value.trim();
  const agent_id = $('#agent_id').value.trim();
  const params = new URLSearchParams();
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  if (campaign_id) params.append('campaign_id', campaign_id);
  if (agent_id) params.append('agent_id', agent_id);

  const res = await fetch(`${API}/api/kpis?` + params.toString());
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  renderKpis(data);
  window.__lastKPIs = data; // para snapshot
}

function renderKpis(data){
  $('#kpi_contact').textContent = (data.kpis.contactabilidad ?? 0) + ' %';
  $('#kpi_pb').textContent = (data.kpis.penetracion_bruta ?? 0) + ' %';
  $('#kpi_pn').textContent = (data.kpis.penetracion_neta ?? 0) + ' %';

  // Tabla distribución
  const tbody = $('#distTable tbody');
  tbody.innerHTML = '';
  const dist = data.distribution || [];
  let max = 1;
  dist.forEach(r => { if (r.cantidad > max) max = r.cantidad; });

  // Barras simples sin librerías
  const bars = $('#bars');
  bars.innerHTML = '';
  dist.forEach(r => {
    const h = Math.round((r.cantidad / max) * 150) + 8;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = h + 'px';
    bar.title = `${r.resultado}: ${r.cantidad}`;
    const label = document.createElement('span');
    label.textContent = r.cantidad;
    bar.appendChild(label);
    bars.appendChild(bar);

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.resultado}</td><td>${r.cantidad}</td>`;
    tbody.appendChild(tr);
  });

  // Top resumen
  const tbody2 = $('#topTable tbody');
  tbody2.innerHTML = '';
  (data.top_resumen || []).forEach(row => {
    const nombreAgente = `${row.agente_nombre ?? ''} ${row.agente_apellido ?? ''}`.trim();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${row.campaña}</td><td>${nombreAgente}</td><td>${row.gestiones}</td>`;
    tbody2.appendChild(tr);
  });
}

async function saveSnapshot(){
  if (!window.__lastKPIs) return alert('Primero aplicá filtros y obtené KPIs');
  const payload = {
    filters: window.__lastKPIs.filters,
    kpis: window.__lastKPIs.kpis,
    distribution: window.__lastKPIs.distribution
  };
  const res = await fetch(`${API}/api/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(await res.text());
  await listSnapshots();
}

async function listSnapshots(){
  const res = await fetch(`${API}/api/snapshots`);
  if (!res.ok) return;
  const rows = await res.json();
  const container = $('#snapshots');
  container.innerHTML = '';
  rows.forEach(r => {
    const card = document.createElement('div');
    card.className = 'kpi';
    const k = JSON.parse(r.kpis_json);
    const f = JSON.parse(r.filters_json);
    card.innerHTML = `
      <div><strong>ID:</strong> ${r.id} • <strong>Fecha:</strong> ${new Date(r.created_at).toLocaleString()}</div>
      <div><strong>Filtros:</strong> ${JSON.stringify(f)}</div>
      <div><strong>KPIs:</strong> Contactabilidad ${k.contactabilidad}% • PB ${k.penetracion_bruta}% • PN ${k.penetracion_neta}%</div>
      <button data-id="${r.id}">Ver</button>
    `;
    card.querySelector('button').onclick = async () => {
      const x = await fetch(`${API}/api/snapshots/${r.id}`).then(r=>r.json());
      alert('Snapshot #' + x.id + '\n' + JSON.stringify(x, null, 2));
    };
    container.appendChild(card);
  });
}

$('#btnFetch').onclick = fetchKPIs;
$('#btnSave').onclick = saveSnapshot;

listSnapshots().catch(()=>{});
