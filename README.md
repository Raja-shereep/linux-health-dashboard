# SystemPulse — Linux System Health & Telemetry Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![Platform](https://img.shields.io/badge/Platform-Linux-orange.svg)](https://kernel.org/)

**SystemPulse** is a lightweight, real-time Linux health and monitoring dashboard. Built with a decoupled Node.js metrics collector and a high-performance React frontend, it streams host telemetry with sub-second latency over WebSockets.

---

## ⚡ Architecture Overview

```text
┌────────────────────────────────────────────────────────┐
│                      Linux Host                        │
│       (/proc, /sys, sysfs, hardware sensors)           │
└──────────────────────────┬─────────────────────────────┘
                           │ System Calls & Diagnostics
                           ▼
┌────────────────────────────────────────────────────────┐
│             Backend Agent (Node.js / Express)          │
│    • systeminformation metrics engine                  │
│    • 2-Second Non-Blocking Polling Interval            │
│    • WebSocket Broadcaster (Socket.IO)                 │
└──────────────┬──────────────────────────┬──────────────┘
               │ Event: 'metrics'         │ REST API
               │ (Real-Time Push)         │ (Fallback/Poll)
               ▼                          ▼
┌────────────────────────────────────────────────────────┐
│             Frontend UI (React 19 + Vite)              │
│    • Recharts Dynamic Area & Trend Lines               │
│    • Live Sortable / Searchable Process Manager        │
│    • Dark-Mode Glassmorphism Dashboard Engine          │
└────────────────────────────────────────────────────────┘
```

---

## ✨ Features

- **Live CPU Utilization**: Real-time overall, user-mode, and kernel-mode breakdown with animated area charts.
- **Memory & Swap Metrics**: Active vs. available RAM with dynamic consumption trendlines.
- **Storage & Mount Inspection**: Capacities and visual percentage indicators across all mounted filesystems.
- **Network Interface Throughput**: Real-time download/upload speed rates (`KB/s`, `MB/s`) with cumulative transfer totals.
- **Host Diagnostics**: Uptime counter, kernel version, OS distribution, logical core count, and system load averages (1m, 5m, 15m).
- **Interactive Process Manager**: Top 50 CPU-consuming processes with real-time filtering, instant search, and dynamic sorting by CPU % or Memory RSS.
- **Orchestrated Dev Environment**: Custom dual-process runner that launches backend and frontend concurrently with prefixed color logging.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Recharts | Dynamic reactive UI with SVG trendline visualizations |
| **Styling** | Vanilla Modern CSS | Dark-mode glassmorphic theme with fluid responsive grid |
| **Icons** | Lucide React | Clean, scalable system icons |
| **Backend** | Express 5, Node.js | Microservices REST API and static host |
| **Real-Time** | Socket.IO 4.8 | Bidirectional event streaming with automatic reconnection |
| **Hardware Telemetry** | `systeminformation` | Core Linux hardware and kernel metrics extraction |

---

## 🚀 Quick Start

### Prerequisites
- **Linux OS** (Ubuntu, Debian, Fedora, Arch, etc.)
- **Node.js** >= 18.x
- **npm** >= 9.x

### 1. Clone & Install

```bash
git clone https://github.com/Raja-shereep/linux-health-dashboard.git
cd linux-health-dashboard

# Install root orchestration, backend, and frontend dependencies
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Run the Development Server

Start both the backend collector and the frontend dashboard in a single command:

```bash
npm run dev
```

* **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
* **Backend API & WebSockets**: [http://localhost:3000](http://localhost:3000)

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Service health status check |
| `GET` | `/api/health` | Comprehensive host metrics snapshot (CPU, RAM, Disks, Network, Sensors) |
| `GET` | `/api/processes` | List of top 50 processes ordered by CPU usage |

### WebSocket Events

| Event | Channel | Payload |
| :--- | :--- | :--- |
| `metrics` | Client broadcast | Full telemetry payload emitted automatically every 2 seconds |

---

## 📁 Project Structure

```text
linux-health-dashboard/
├── backend/
│   ├── package.json        # Backend dependencies & scripts
│   └── server.js           # Express app & Socket.IO telemetry service
├── frontend/
│   ├── public/             # Static web assets
│   ├── src/
│   │   ├── App.jsx         # Main dashboard layout & state management
│   │   ├── App.css         # Modern dark-mode design system
│   │   └── main.jsx        # React root renderer
│   ├── package.json        # Frontend dependencies (React, Recharts, Lucide)
│   └── vite.config.js      # Vite build configuration
├── .gitignore              # Git ignore rules for node_modules and builds
├── LICENSE                 # MIT License
├── package.json            # Root workspace orchestration
├── README.md               # Documentation & architecture guide
└── start-dev.js            # Custom multi-process orchestrator
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

---

## 👤 Author

**Raja Shereep**
* GitHub: [@Raja-shereep](https://github.com/Raja-shereep)
* Email: [rshereep23@gmail.com](mailto:rshereep23@gmail.com)
