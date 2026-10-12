
const express = require("express");
const cors = require("cors");
const http = require("node:http");
const os = require("node:os");
const si = require("systeminformation");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Linux System Health Dashboard",
    status: "running",
  });
});

async function collectMetrics() {
  const [load, memory, filesystems, network, temperature, osInfo] =
    await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.cpuTemperature(),
      si.osInfo(),
    ]);

  return {
    timestamp: new Date().toISOString(),

    system: {
      hostname: os.hostname(),
      platform: osInfo.distro,
      kernel: osInfo.kernel,
      uptimeSeconds: os.uptime(),
      cpuCores: os.cpus().length,
      loadAverage: os.loadavg(),
    },

    cpu: {
      usagePercent: load.currentLoad,
      userPercent: load.currentLoadUser,
      systemPercent: load.currentLoadSystem,
    },

    memory: {
      totalBytes: memory.total,
      usedBytes: memory.used,
      freeBytes: memory.free,
      availableBytes: memory.available,
      usagePercent:
        ((memory.total - memory.available) / memory.total) * 100,
      swapTotalBytes: memory.swaptotal,
      swapUsedBytes: memory.swapused,
    },

    disks: filesystems.map((disk) => ({
      filesystem: disk.fs,
      mount: disk.mount,
      sizeBytes: disk.size,
      usedBytes: disk.used,
      usagePercent: disk.use,
    })),

    network: network.map((iface) => ({
      interface: iface.iface,
      receivedBytesPerSecond: iface.rx_sec,
      sentBytesPerSecond: iface.tx_sec,
      totalReceivedBytes: iface.rx_bytes,
      totalSentBytes: iface.tx_bytes,
    })),

    temperature: {
      mainCelsius: temperature.main,
      available: temperature.main !== -1,
    },
  };
}

app.get("/api/health", async (req, res) => {
  try {
    res.json(await collectMetrics());
  } catch (error) {
    console.error("Metrics collection failed:", error.message);
    res.status(500).json({ error: "Unable to collect system metrics" });
  }
});

app.get("/api/processes", async (req, res) => {
  try {
    const data = await si.processes();
    const processes = data.list
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, 50)
      .map((process) => ({
        pid: process.pid,
        name: process.name,
        cpuPercent: process.cpu,
        memoryBytes: process.memRss,
        state: process.state,
        user: process.user,
      }));

    res.json({
      totalProcesses: data.all,
      runningProcesses: data.running,
      processes,
    });
  } catch (error) {
    console.error("Process collection failed:", error.message);
    res.status(500).json({ error: "Unable to collect processes" });
  }
});

// Push metrics to connected dashboard clients every 2 seconds.
io.on("connection", (socket) => {
  console.log("Dashboard connected:", socket.id);
});

let collecting = false;

setInterval(async () => {
  if (collecting) return;

  collecting = true;
  try {
    io.emit("metrics", await collectMetrics());
  } catch (error) {
    console.error("Live metrics failed:", error.message);
  } finally {
    collecting = false;
  }
}, 2000);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Monitoring API running at http://localhost:${PORT}`);
});
