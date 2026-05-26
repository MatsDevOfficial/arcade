const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const BAUD_RATE = 115200;
const DEMO_INTERVAL_MS = 1000;

let mainWindow = null;
let serialPort = null;
let parser = null;
let demoTimer = null;
let demoMode = true;

function broadcast(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function parseTelemetryLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }
  try {
    const data = JSON.parse(trimmed);
    if (typeof data !== "object" || data === null) {
      return null;
    }
    return {
      temp: data.temp === null || data.temp === undefined ? null : Number(data.temp),
      soil: Number(data.soil),
      mic: Number(data.mic),
      nodeOnline: Boolean(data.nodeOnline),
      source: "serial",
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

function stopDemo() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
}

function startDemo() {
  stopDemo();
  demoMode = true;
  broadcast("connection-status", {
    connected: false,
    demo: true,
    port: null,
    message: "Demo mode — connect USB to main ESP32-S3",
  });

  demoTimer = setInterval(() => {
    const t = 20 + Math.random() * 5;
    broadcast("telemetry", {
      temp: Math.round(t * 10) / 10,
      soil: Math.floor(30 + Math.random() * 40),
      mic: Math.floor(200 + Math.random() * 2800),
      nodeOnline: Math.random() > 0.15,
      source: "demo",
      timestamp: Date.now(),
    });
  }, DEMO_INTERVAL_MS);
}

async function listPorts() {
  const ports = await SerialPort.list();
  return ports.map((p) => ({
    path: p.path,
    manufacturer: p.manufacturer || "",
    vendorId: p.vendorId || "",
    productId: p.productId || "",
    friendlyName: p.friendlyName || p.path,
  }));
}

function disconnectSerial() {
  return new Promise((resolve) => {
    if (!serialPort || !serialPort.isOpen) {
      serialPort = null;
      parser = null;
      resolve();
      return;
    }
    serialPort.close(() => {
      serialPort = null;
      parser = null;
      resolve();
    });
  });
}

async function connectSerial(portPath) {
  await disconnectSerial();
  stopDemo();
  demoMode = false;

  return new Promise((resolve, reject) => {
    serialPort = new SerialPort({
      path: portPath,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    parser = serialPort.pipe(new ReadlineParser({ delimiter: "\n" }));

    parser.on("data", (line) => {
      const telemetry = parseTelemetryLine(line);
      if (telemetry) {
        broadcast("telemetry", telemetry);
      }
    });

    serialPort.on("error", (err) => {
      broadcast("connection-status", {
        connected: false,
        demo: false,
        port: portPath,
        message: err.message,
      });
    });

    serialPort.on("close", () => {
      if (!demoMode) {
        startDemo();
      }
    });

    serialPort.open((err) => {
      if (err) {
        serialPort = null;
        parser = null;
        startDemo();
        reject(err);
        return;
      }

      broadcast("connection-status", {
        connected: true,
        demo: false,
        port: portPath,
        message: `Connected at ${BAUD_RATE} baud`,
      });
      resolve();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0f14",
    title: "Smart Desk Assistant",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "src", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("list-ports", () => listPorts());

ipcMain.handle("connect-port", async (_event, portPath) => {
  if (!portPath) {
    throw new Error("No port selected");
  }
  await connectSerial(portPath);
  return { ok: true, port: portPath };
});

ipcMain.handle("disconnect-port", async () => {
  await disconnectSerial();
  startDemo();
  return { ok: true };
});

ipcMain.handle("get-connection", () => ({
  connected: serialPort?.isOpen ?? false,
  demo: demoMode,
}));

app.whenReady().then(() => {
  createWindow();
  startDemo();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (demoMode) {
        startDemo();
      }
    }
  });
});

app.on("window-all-closed", async () => {
  stopDemo();
  await disconnectSerial();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  stopDemo();
  await disconnectSerial();
});
