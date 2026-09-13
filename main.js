function calcularPupila(mouseX, mouseY, ojoX, ojoY, maxRadio){

    const deltaX  = mouseX - ojoX;
    const deltaY = mouseY - ojoY;
    
    const angulo = Math.atan2(deltaX, deltaY);
    const distancia = Math.hypot(deltaX, deltaY);

    const maxDistancia = Math.min(distancia, maxRadio);

    const objetivoX = Math.sin(angulo) * maxDistancia
    const objetivoY = Math.cos(angulo) * maxDistancia

    return{x: objetivoX, y: objetivoY};

}


function centroElemento(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function obtenerMedidas(element){
    const elemento = document.querySelector(element);

    const computedStyle = window.getComputedStyle(elemento);

    const width = parseFloat(computedStyle.width);
    const height = parseFloat(computedStyle.height);

    return {
        h: height,
        w: width
    }

}

document.addEventListener('mousemove', (evento) =>{

    function transform(pupila, x, y){
        pupila.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
    

const mouseX = evento.clientX;
const mouseY = evento.clientY;

const pupila = document.getElementById('pupila')
// const pupila2 = document.getElementById('pupila2')



const {x: ojoX, y: ojoY} = centroElemento(pupila);
// const {x: ojoX2, y: ojoY2} = centroElemento(pupila2);


const {h: pupilaH, w: pupilaW} = obtenerMedidas('.pupila')
const {h: eyeH, w: eyeW} = obtenerMedidas('.eye')

// const {h: pupilaH2, w: pupilaW2} = obtenerMedidas('.pupila')
// const {h: eyeH2, w: eyeW2} = obtenerMedidas('.eye')


const maxRadio = Math.min((eyeW - pupilaW) / 2, (eyeH - pupilaH) / 2)
// const maxRadio2 = Math.min((eyeW2 - pupilaW2) / 2, (eyeH2 - pupilaH2) / 2)


const {x, y} = calcularPupila(mouseX, mouseY, ojoX, ojoY, maxRadio);
// const {x: x2, y: y2} = calcularPupila(mouseX, mouseY, ojoX2, ojoY2, maxRadio2);


transform(pupila, x, y)
transform(pupila2, x2, y2)


});

const ESP32_SKETCH = `#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

WebServer server(80);

void handleLista() {
  if (server.method() == HTTP_OPTIONS) {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
    return;
  }

  StaticJsonDocument<1024> doc;
  deserializeJson(doc, server.arg("plain"));
  JsonArray items = doc["items"].as<JsonArray>();

  for (JsonVariant item : items) {
    Serial.println(item.as<String>());
    // Aqui procesas cada elemento: encender un pin, mover un servo, etc.
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "OK");
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
  }
  Serial.println(WiFi.localIP());

  server.on("/lista", HTTP_POST, handleLista);
  server.on("/lista", HTTP_OPTIONS, handleLista);
  server.begin();
}

void loop() {
  server.handleClient();
}`;

  let state = {
    config: { ip: '192.168.1.50', port: '80', endpoint: '/lista' },
    items: [],
    history: [],
    view: 'enviar',
    status: 'idle'
  };

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function prefersReducedMotion(){
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function buildUrl(){
    const { ip, port, endpoint } = state.config;
    const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    return `http://${ip}:${port}${path}`;
  }

  /* ---------- render templates ---------- */
  function renderEnviar(){
    const count = state.items.length;
    return `
      <div class="field-row">
        <input type="text" id="itemInput" placeholder="Ej. Encender LED 1" maxlength="80" autocomplete="off">
        <button type="button" class="btn btn--ghost" data-action="add-item">Agregar</button>
      </div>
      <ul class="chip-list" id="chipList" aria-live="polite">
        ${state.items.map((it,i)=>`<li class="chip"><span>${escapeHtml(it)}</span><button type="button" data-action="remove-item" data-index="${i}" aria-label="Quitar ${escapeHtml(it)}">×</button></li>`).join('')}
      </ul>
      <p class="empty-note" id="emptyNote" style="display:${count ? 'none' : 'block'}">Tu lista está vacía. Agrega el primer elemento arriba.</p>
      <button type="button" class="btn btn--primary btn--block" id="sendBtn" data-action="send" ${count ? '' : 'disabled'}>Enviar lista al ESP32${count ? ' (' + count + ')' : ''}</button>
      <p class="hint">Se enviará como JSON a <code id="urlPreview">${escapeHtml(buildUrl())}</code></p>
    `;
  }

  function renderHistorial(){
    if (!state.history.length){
      return `<p class="empty-note">Aún no has enviado nada. Cuando envíes una lista, aparecerá aquí.</p>`;
    }
    return `<ul class="history-list">
      ${state.history.map(h => `
        <li class="history-row ${h.ok ? 'is-ok' : 'is-error'}">
          <div class="history-row__meta">
            <span>${new Date(h.time).toLocaleString()}</span>
            <span>${h.ok ? 'Enviado' : 'Error'}</span>
          </div>
          <p class="history-row__items">${escapeHtml(h.items.join(', '))}</p>
          ${h.message ? `<p class="history-row__msg">${escapeHtml(h.message)}</p>` : ''}
        </li>
      `).join('')}
    </ul>`;
  }

  function renderGuia(){
    return `
      <ol class="guide-steps">
        <li>Conecta el ESP32 y este dispositivo a la misma red WiFi.</li>
        <li>Abre el panel de conexión con el botón del borde izquierdo e ingresa la IP, el puerto y la ruta de tu ESP32.</li>
        <li>El ESP32 debe exponer un endpoint HTTP que reciba una petición <code>POST</code> con este formato:</li>
      </ol>
      <pre class="code-block"><code>{
  "items": ["Encender LED 1", "Apagar bomba"],
  "ts": "2026-09-13T10:00:00.000Z"
}</code></pre>
      <p class="hint">Ejemplo de sketch para el ESP32 (librerías WebServer y ArduinoJson), con encabezados CORS para que el navegador acepte la respuesta:</p>
      <pre class="code-block"><code>${escapeHtml(ESP32_SKETCH)}</code></pre>
      <p class="hint">¿La petición falla desde esta vista previa? Los navegadores bloquean conexiones http:// dentro de páginas https (contenido mixto). Descarga este archivo y ábrelo directamente en tu navegador, o sírvelo desde tu propia red local, para que la conexión funcione.</p>
    `;
  }

  const views = { enviar: renderEnviar, historial: renderHistorial, guia: renderGuia };

  function renderPanel(){
    const body = document.getElementById('panelBody');
    body.innerHTML = views[state.view]();
  }

  /* ---------- tabs / view switching (morph) ---------- */
  function updateTabsUI(){
    document.querySelectorAll('.tab').forEach(btn=>{
      btn.classList.toggle('is-active', btn.dataset.view === state.view);
    });
    moveIndicator();
  }
  function moveIndicator(){
    const active = document.querySelector('.tab.is-active');
    const indicator = document.getElementById('tabIndicator');
    if (!active || !indicator) return;
    indicator.style.width = active.offsetWidth + 'px';
    indicator.style.transform = `translateX(${active.offsetLeft}px)`;
  }
  function switchView(view){
    if (view === state.view) return;
    state.view = view;
    updateTabsUI();
    if (document.startViewTransition && !prefersReducedMotion()){
      document.startViewTransition(() => renderPanel());
    } else {
      renderPanel();
    }
  }

  /* ---------- list items ---------- */
  function renderChipList(){
    const list = document.getElementById('chipList');
    if (!list) return;
    list.innerHTML = state.items.map((it,i)=>`<li class="chip"><span>${escapeHtml(it)}</span><button type="button" data-action="remove-item" data-index="${i}" aria-label="Quitar ${escapeHtml(it)}">×</button></li>`).join('');
  }
  function syncEnviarUI(){
    const empty = document.getElementById('emptyNote');
    const sendBtn = document.getElementById('sendBtn');
    const count = state.items.length;
    if (empty) empty.style.display = count ? 'none' : 'block';
    if (sendBtn){
      sendBtn.disabled = count === 0;
      sendBtn.textContent = `Enviar lista al ESP32${count ? ' (' + count + ')' : ''}`;
    }
  }
  function addItem(){
    const input = document.getElementById('itemInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    state.items.push(val);
    input.value = '';
    const list = document.getElementById('chipList');
    if (list){
      const li = document.createElement('li');
      li.className = 'chip';
      li.innerHTML = `<span>${escapeHtml(val)}</span><button type="button" data-action="remove-item" data-index="${state.items.length - 1}" aria-label="Quitar ${escapeHtml(val)}">×</button>`;
      list.appendChild(li);
    }
    syncEnviarUI();
    input.focus();
  }
  function removeItem(index){
    const list = document.getElementById('chipList');
    const li = list ? list.children[index] : null;
    if (!li){
      state.items.splice(index, 1);
      syncEnviarUI();
      return;
    }
    li.classList.add('chip--leaving');
    setTimeout(() => {
      state.items.splice(index, 1);
      renderChipList();
      syncEnviarUI();
    }, prefersReducedMotion() ? 0 : 180);
  }

  /* ---------- status ---------- */
  function setStatus(s){
    state.status = s;
    const dot = document.getElementById('statusDot');
    const pill = document.getElementById('statusPill');
    const labelMap = { idle: 'Sin verificar', sending: 'Enviando…', ok: 'Enviado', error: 'Error' };
    ['is-idle','is-sending','is-ok','is-error'].forEach(c => { dot.classList.remove(c); pill.classList.remove(c); });
    dot.classList.add('is-' + s);
    pill.classList.add('is-' + s);
    pill.textContent = labelMap[s] || s;
  }

  /* ---------- config ---------- */
  function updateTargetLabel(){
    const el = document.getElementById('targetLabel');
    if (el) el.textContent = `${state.config.ip}:${state.config.port}${state.config.endpoint}`;
    const preview = document.getElementById('urlPreview');
    if (preview) preview.textContent = buildUrl();
  }
  async function saveConfig(){
    const ip = document.getElementById('cfgIp').value.trim();
    const port = document.getElementById('cfgPort').value.trim();
    const path = document.getElementById('cfgPath').value.trim();
    if (ip) state.config.ip = ip;
    if (port) state.config.port = port;
    if (path) state.config.endpoint = path.startsWith('/') ? path : '/' + path;
    updateTargetLabel();
    setStatus('idle');
    await persistConfig();
    const drawer = document.getElementById('drawer');
    if (drawer.hidePopover) drawer.hidePopover();
  }
  async function testConnection(){
    const ip = document.getElementById('cfgIp').value.trim() || state.config.ip;
    const port = document.getElementById('cfgPort').value.trim() || state.config.port;
    const url = `http://${ip}:${port}/`;
    const result = document.getElementById('testResult');
    result.textContent = 'Probando…';
    try {
      await fetch(url, { method: 'GET', mode: 'no-cors' });
      result.textContent = 'El dispositivo respondió en esa dirección.';
    } catch (e) {
      result.textContent = 'No se pudo alcanzar esa dirección (red, IP o contenido mixto http/https).';
    }
  }

  /* ---------- history ---------- */
  function addHistoryEntry(entry){
    state.history.unshift(entry);
    state.history = state.history.slice(0, 25);
    persistHistory();
    if (state.view === 'historial') renderPanel();
  }

  /* ---------- send ---------- */
  async function sendList(){
    if (!state.items.length) return;
    setStatus('sending');
    const url = buildUrl();
    const payload = { items: [...state.items], ts: new Date().toISOString() };
    let ok = false, message = '';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      ok = res.ok;
      message = ok ? `HTTP ${res.status}` : `El ESP32 respondió con error ${res.status}`;
    } catch (err) {
      ok = false;
      message = 'No se pudo contactar al ESP32 (revisa IP, red o CORS).';
    }
    setStatus(ok ? 'ok' : 'error');
    addHistoryEntry({ items: payload.items, time: Date.now(), ok, message });
    if (ok){
      state.items = [];
      renderChipList();
      syncEnviarUI();
    }
  }

  /* ---------- persistence (falls back silently outside claude.ai) ---------- */
  async function persistConfig(){
    try {
      if (window.storage) await window.storage.set('esp32-config', JSON.stringify(state.config), false);
    } catch (e) { /* storage not available in this context */ }
  }
  async function persistHistory(){
    try {
      if (window.storage) await window.storage.set('esp32-history', JSON.stringify(state.history), false);
    } catch (e) { /* storage not available in this context */ }
  }
  async function loadPersisted(){
    try {
      if (window.storage){
        const cfg = await window.storage.get('esp32-config', false);
        if (cfg && cfg.value) state.config = { ...state.config, ...JSON.parse(cfg.value) };
      }
    } catch (e) { /* key may not exist yet */ }
    try {
      if (window.storage){
        const hist = await window.storage.get('esp32-history', false);
        if (hist && hist.value) state.history = JSON.parse(hist.value);
      }
    } catch (e) { /* key may not exist yet */ }
  }

  /* ---------- wiring ---------- */
  function bindGlobalEvents(){
    document.getElementById('saveBtn').addEventListener('click', saveConfig);
    document.getElementById('testBtn').addEventListener('click', testConnection);

    document.getElementById('tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab');
      if (btn) switchView(btn.dataset.view);
    });

    document.getElementById('panelBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'add-item') addItem();
      else if (action === 'remove-item') removeItem(Number(btn.dataset.index));
      else if (action === 'send') sendList();
    });
    document.getElementById('panelBody').addEventListener('keydown', (e) => {
      if (e.target && e.target.id === 'itemInput' && e.key === 'Enter'){
        e.preventDefault();
        addItem();
      }
    });

    const trigger = document.querySelector('.config-trigger');
    const drawer = document.getElementById('drawer');
    drawer.addEventListener('toggle', (e) => {
      const isOpen = e.newState === 'open';
      trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen){
        document.getElementById('cfgIp').value = state.config.ip;
        document.getElementById('cfgPort').value = state.config.port;
        document.getElementById('cfgPath').value = state.config.endpoint;
        document.getElementById('testResult').textContent = '';
      }
    });

    window.addEventListener('resize', moveIndicator);
  }

  (async function init(){
    await loadPersisted();
    updateTargetLabel();
    renderPanel();
    updateTabsUI();
    bindGlobalEvents();
  })();



