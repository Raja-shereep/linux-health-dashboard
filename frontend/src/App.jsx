
import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, Cpu, HardDrive, MemoryStick, Network,
  Thermometer, Search, RefreshCw, Server, Clock,
} from "lucide-react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname
  ? `http://${window.location.hostname}:3000`
  : "http://localhost:3000");
const socket = io(API, { autoConnect: false });

function formatBytes(bytes = 0) {
  if (!Number.isFinite(Number(bytes))) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes);
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatRate(bytes = 0) {
  return `${formatBytes(bytes)}/s`;
}

function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function MetricCard({ title, value, subtitle, percent, icon: Icon }) {
  const safePercent = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, percent))
    : 0;

  return (
    <section className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon"><Icon size={19} /></span>
      </div>
      <div className="metric-value">{value}</div>
      {percent !== undefined && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${safePercent}%` }} />
        </div>
      )}
      <div className="metric-subtitle">{subtitle}</div>
    </section>
  );
}

function App() {
  const [metrics, setMetrics] = useState(null);
  const [processes, setProcesses] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("cpuPercent");
  const [sortDirection, setSortDirection] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  function changeSort(field) {
    if (sortBy === field) {
      setSortDirection((direction) =>
        direction === "desc" ? "asc" : "desc"
      );
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  }

  const refreshProcesses = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/processes`);
      if (!response.ok) throw new Error("Process API unavailable");
      const data = await response.json();
      setProcesses(data.processes || []);
    } catch {
      setError("Unable to retrieve process information");
    }
  }, []);

  const acceptMetrics = useCallback((data) => {
    setMetrics(data);
    setLastUpdated(new Date());
    setLoading(false);
    setError("");

    setHistory((previous) => [
      ...previous,
      {
        time: new Date().toLocaleTimeString(),
        cpu: Number(data.cpu?.usagePercent || 0),
        memory: Number(data.memory?.usagePercent || 0),
      },
    ].slice(-30));
  }, []);

  useEffect(() => {
    let active = true;

    async function initialFetch() {
      try {
        const [healthRes, procRes] = await Promise.allSettled([
          fetch(`${API}/api/health`),
          fetch(`${API}/api/processes`),
        ]);

        if (healthRes.status === "fulfilled" && healthRes.value.ok) {
          const data = await healthRes.value.json();
          if (active) acceptMetrics(data);
        } else if (active) {
          setError("Cannot connect to backend at 127.0.0.1:3000");
          setLoading(false);
        }

        if (procRes.status === "fulfilled" && procRes.value.ok) {
          const procData = await procRes.value.json();
          if (active) setProcesses(procData.processes || []);
        }
      } catch {
        if (active) {
          setError("Cannot connect to backend at 127.0.0.1:3000");
          setLoading(false);
        }
      }
    }

    socket.connect();
    socket.on("metrics", acceptMetrics);
    initialFetch();

    const processTimer = setInterval(() => {
      refreshProcesses();
    }, 5000);

    return () => {
      active = false;
      clearInterval(processTimer);
      socket.off("metrics", acceptMetrics);
      socket.disconnect();
    };
  }, [acceptMetrics, refreshProcesses]);

  const filteredProcesses = processes
    .filter((process) =>
      `${process.name} ${process.pid} ${process.user || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const first = Number(a[sortBy]) || 0;
      const second = Number(b[sortBy]) || 0;

      return sortDirection === "desc"
        ? second - first
        : first - second;
    });

  const cpu = metrics?.cpu?.usagePercent ?? 0;
  const memory = metrics?.memory?.usagePercent ?? 0;
  const disks = metrics?.disks || [];
  const networks = metrics?.network || [];
  const system = metrics?.system || {};

  return (
    <main className="dashboard">
      <header className="header">
        <div className="brand">
          <div className="brand-logo"><Activity size={24} /></div>
          <div>
            <h1>SystemPulse</h1>
            <p>Linux system health monitor</p>
          </div>
        </div>
        <div className="connection">
          <span className={`status-dot ${metrics ? "" : "offline"}`} />
          {metrics ? "Monitoring active" : "Disconnected"}
          <button className="icon-button" onClick={() => {
            fetch(`${API}/api/health`)
              .then((r) => r.json())
              .then(acceptMetrics)
              .catch(() => setError("Backend is unreachable"));
            refreshProcesses();
          }} aria-label="Refresh metrics">
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading && !metrics && (
        <div className="loading">Connecting to your Linux host…</div>
      )}

      <section className="host-panel">
        <div className="host-name">
          <Server size={20} />
          <div>
            <h2>{system.hostname || "Waiting for host…"}</h2>
            <p>{system.platform || "Linux"} · {system.kernel || "Kernel information unavailable"}</p>
          </div>
        </div>
        <div className="host-stat">
          <span><Cpu size={15} /> Logical cores</span>
          <strong>{system.cpuCores ?? "—"}</strong>
        </div>
        <div className="host-stat">
          <span><Clock size={15} /> Uptime</span>
          <strong>{formatUptime(system.uptimeSeconds)}</strong>
        </div>
        <div className="host-stat">
          <span>Load average</span>
          <strong>{system.loadAverage?.map((n) => Number(n).toFixed(2)).join(" / ") || "—"}</strong>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <h2>Resource overview</h2>
          <p>Live readings from your Linux machine</p>
        </div>
        <span className="live-label"><span className="status-dot" /> LIVE · 2 SEC</span>
      </div>

      <section className="metric-grid">
        <MetricCard title="CPU utilization" value={`${cpu.toFixed(1)}%`}
          subtitle={`${system.cpuCores ?? "—"} logical cores`}
          percent={cpu} icon={Cpu} />
        <MetricCard title="Memory usage" value={`${memory.toFixed(1)}%`}
          subtitle={`${formatBytes(metrics?.memory?.availableBytes)} available`}
          percent={memory} icon={MemoryStick} />
        <MetricCard title="Root disk usage"
          value={`${(disks.find((d) => d.mount === "/")?.usagePercent ?? 0).toFixed(1)}%`}
          subtitle={formatBytes(disks.find((d) => d.mount === "/")?.usedBytes) + " used"}
          percent={disks.find((d) => d.mount === "/")?.usagePercent ?? 0}
          icon={HardDrive} />
        <MetricCard title="CPU temperature"
          value={metrics?.temperature?.available
            ? `${metrics.temperature.mainCelsius}°C` : "N/A"}
          subtitle="Hardware sensor reading"
          icon={Thermometer} />
      </section>

      <section className="chart-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div><h3>CPU performance</h3><p>Recent utilization (%)</p></div>
            <span className="chart-number">{cpu.toFixed(1)}%</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#273244" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fill: "#8491a5", fontSize: 10 }}
                minTickGap={35} />
              <YAxis domain={[0, 100]} tick={{ fill: "#8491a5", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111a29", border: "1px solid #334155" }} />
              <Area type="monotone" dataKey="cpu" name="CPU"
                stroke="#38bdf8" fill="url(#cpuGradient)" strokeWidth={2}
                isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel chart-panel">
          <div className="panel-heading">
            <div><h3>Memory performance</h3><p>Recent utilization (%)</p></div>
            <span className="chart-number">{memory.toFixed(1)}%</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#273244" strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fill: "#8491a5", fontSize: 10 }}
                minTickGap={35} />
              <YAxis domain={[0, 100]} tick={{ fill: "#8491a5", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#111a29", border: "1px solid #334155" }} />
              <Area type="monotone" dataKey="memory" name="Memory"
                stroke="#a78bfa" fill="url(#memGradient)" strokeWidth={2}
                isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <div className="panel-heading">
            <div><h3>Network interfaces</h3><p>Current throughput</p></div>
            <Network size={19} />
          </div>
          {networks.length === 0 && <p className="empty">No network interfaces detected.</p>}
          {networks.map((net) => (
            <div className="network-row" key={net.interface}>
              <div className="interface-name">{net.interface}</div>
              <div className="network-rates">
                <span className="download">↓ {formatRate(net.receivedBytesPerSecond)}</span>
                <span className="upload">↑ {formatRate(net.sentBytesPerSecond)}</span>
              </div>
              <p className="muted">Received {formatBytes(net.totalReceivedBytes)} · Sent {formatBytes(net.totalSentBytes)}</p>
            </div>
          ))}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div><h3>Storage</h3><p>Mounted filesystems</p></div>
            <HardDrive size={19} />
          </div>
          {disks.map((disk) => (
            <div className="disk-row" key={`${disk.mount}-${disk.filesystem}`}>
              <div className="disk-label">
                <strong>{disk.mount}</strong>
                <span>{Number(disk.usagePercent).toFixed(1)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{
                  width: `${Math.max(0, Math.min(100, disk.usagePercent))}%`,
                }} />
              </div>
              <p className="muted">{formatBytes(disk.usedBytes)} of {formatBytes(disk.sizeBytes)}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="panel process-panel">
        <div className="panel-heading process-heading">
          <div><h3>Running processes</h3><p>Top processes reported by the host agent</p></div>
          <label className="search-box">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, PID, user…" />
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr>
              <th>PID</th><th>Process</th><th>User</th>
              <th>
                <button
                  className="sort-button"
                  onClick={() => changeSort("cpuPercent")}
                >
                  CPU % {sortBy === "cpuPercent"
                    ? (sortDirection === "desc" ? "↓" : "↑")
                    : "↕"}
                </button>
              </th>

              <th>
                <button
                  className="sort-button"
                  onClick={() => changeSort("memoryBytes")}
                >
                  Memory {sortBy === "memoryBytes"
                    ? (sortDirection === "desc" ? "↓" : "↑")
                    : "↕"}
                </button>
              </th>
              <th>State</th>
            </tr></thead>
            <tbody>
              {filteredProcesses.map((process) => (
                <tr key={process.pid}>
                  <td className="pid">{process.pid}</td>
                  <td className="process-name">{process.name}</td>
                  <td>{process.user || "—"}</td>
                  <td>{Number(process.cpuPercent || 0).toFixed(1)}%</td>
                  <td>{formatBytes(process.memoryBytes)}</td>
                  <td><span className="state-badge">{process.state || "unknown"}</span></td>
                </tr>
              ))}
              {filteredProcesses.length === 0 && (
                <tr><td colSpan="6" className="empty">No matching processes found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          Showing {filteredProcesses.length} processes · Refreshes every 5 seconds
        </div>
      </section>

      <footer className="footer">
        <span><Activity size={14} /> SystemPulse · Linux Monitoring</span>
        <span>Last updated: {lastUpdated?.toLocaleTimeString() || "Waiting…"}</span>
      </footer>
    </main>
  );
}

export default App;
