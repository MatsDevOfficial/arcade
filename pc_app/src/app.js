const MIC_MAX = 4000;
const SOIL_MAX = 100;
const WAVE_BARS = 32;

const el = {
  statusPill: document.getElementById("status-pill"),
  portSelect: document.getElementById("port-select"),
  btnConnect: document.getElementById("btn-connect"),
  btnDisconnect: document.getElementById("btn-disconnect"),
  valTemp: document.getElementById("val-temp"),
  valSoil: document.getElementById("val-soil"),
  valMic: document.getElementById("val-mic"),
  valNode: document.getElementById("val-node"),
  nodeDetail: document.getElementById("node-detail"),
  soilBar: document.getElementById("soil-bar"),
  micBar: document.getElementById("mic-bar"),
  waveform: document.getElementById("waveform"),
  sourceHint: document.getElementById("source-hint"),
  footerStatus: document.getElementById("footer-status"),
};

let waveHistory = Array(WAVE_BARS).fill(0);

function initWaveform() {
  el.waveform.innerHTML = "";
  for (let i = 0; i < WAVE_BARS; i++) {
    const bar = document.createElement("span");
    bar.style.height = "4px";
    el.waveform.appendChild(bar);
  }
}

function updateWaveform(mic) {
  const normalized = Math.min(1, mic / MIC_MAX);
  waveHistory.shift();
  waveHistory.push(normalized);
  const bars = el.waveform.querySelectorAll("span");
  bars.forEach((bar, i) => {
    const h = 4 + waveHistory[i] * 52;
    bar.style.height = `${h}px`;
    bar.style.opacity = 0.35 + waveHistory[i] * 0.65;
  });
}

function setConnectionUI(status) {
  const { connected, demo, port, message } = status;

  el.btnConnect.disabled = connected;
  el.btnDisconnect.disabled = !connected;

  if (connected) {
    el.statusPill.textContent = "Connected";
    el.statusPill.className = "pill pill-online";
    el.footerStatus.textContent = `Live · ${port}`;
  } else if (demo) {
    el.statusPill.textContent = "Demo";
    el.statusPill.className = "pill pill-demo";
    el.footerStatus.textContent = message || "Demo mode";
  } else {
    el.statusPill.textContent = "Offline";
    el.statusPill.className = "pill pill-offline";
    el.footerStatus.textContent = message || "Disconnected";
  }
}

function applyTelemetry(data) {
  const { temp, soil, mic, nodeOnline, source, timestamp } = data;

  if (temp === null || Number.isNaN(temp)) {
    el.valTemp.textContent = "N/A";
  } else {
    el.valTemp.textContent = temp.toFixed(1);
  }

  const soilVal = Number.isFinite(soil) ? Math.round(soil) : 0;
  el.valSoil.textContent = Number.isFinite(soil) ? `${soilVal}` : "—";
  el.soilBar.style.width = `${Math.min(100, Math.max(0, soilVal))}%`;

  const micVal = Number.isFinite(mic) ? Math.round(mic) : 0;
  el.valMic.textContent = Number.isFinite(mic) ? `${micVal}` : "—";
  const micPct = Math.min(100, (micVal / MIC_MAX) * 100);
  el.micBar.style.width = `${micPct}%`;
  updateWaveform(micVal);

  if (nodeOnline) {
    el.valNode.textContent = "Online";
    el.valNode.className = "card-value node-status online";
    el.nodeDetail.textContent = "ESP-NOW link active";
  } else {
    el.valNode.textContent = "Offline";
    el.valNode.className = "card-value node-status offline";
    el.nodeDetail.textContent = "No packets in last 10s";
  }

  const src = source === "serial" ? "USB serial" : "simulated demo";
  const time = new Date(timestamp).toLocaleTimeString();
  el.sourceHint.textContent = `Last update ${time} · ${src}`;
}

async function refreshPorts() {
  const ports = await window.smartDesk.listPorts();
  const current = el.portSelect.value;
  el.portSelect.innerHTML = '<option value="">Select port…</option>';

  const espHints = ["esp", "ch340", "cp210", "ftdi", "usb serial", "silicon labs"];
  ports.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.path;
    const label = p.friendlyName || p.path;
    const hint = `${p.manufacturer} ${label}`.toLowerCase();
    const likely = espHints.some((h) => hint.includes(h));
    opt.textContent = likely ? `★ ${label}` : label;
    el.portSelect.appendChild(opt);
  });

  if (current && [...el.portSelect.options].some((o) => o.value === current)) {
    el.portSelect.value = current;
  }
}

async function onConnect() {
  const path = el.portSelect.value;
  if (!path) {
    el.sourceHint.textContent = "Select a serial port first";
    return;
  }
  el.btnConnect.disabled = true;
  el.sourceHint.textContent = "Connecting…";
  try {
    await window.smartDesk.connectPort(path);
  } catch (err) {
    el.sourceHint.textContent = `Connect failed: ${err.message}`;
    el.btnConnect.disabled = false;
  }
}

async function onDisconnect() {
  await window.smartDesk.disconnectPort();
}

async function init() {
  initWaveform();
  await refreshPorts();
  setInterval(refreshPorts, 3000);

  const conn = await window.smartDesk.getConnection();
  setConnectionUI({
    connected: conn.connected,
    demo: !conn.connected,
    port: null,
    message: conn.connected ? "Connected" : "Demo mode",
  });

  window.smartDesk.onTelemetry(applyTelemetry);
  window.smartDesk.onConnectionStatus(setConnectionUI);

  el.btnConnect.addEventListener("click", onConnect);
  el.btnDisconnect.addEventListener("click", onDisconnect);
}

init();
