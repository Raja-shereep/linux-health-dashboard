const { spawn } = require("node:child_process");
const path = require("node:path");

const rootDir = __dirname;
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

console.log("\x1b[36m%s\x1b[0m", "==================================================");
console.log("\x1b[36m%s\x1b[0m", " 🚀 Starting Linux Health Dashboard");
console.log("\x1b[36m%s\x1b[0m", "    Backend:  http://localhost:3000");
console.log("\x1b[36m%s\x1b[0m", "    Frontend: http://localhost:5173");
console.log("\x1b[36m%s\x1b[0m", "==================================================");

function runProcess(name, command, args, cwd, color) {
  const child = spawn(command, args, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
    shell: isWindows,
  });

  const prefix = `${color}[${name}]\x1b[0m `;

  child.stdout?.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) console.log(prefix + line);
    }
  });

  child.stderr?.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) console.error(prefix + line);
    }
  });

  child.on("error", (err) => {
    console.error(prefix + `Failed to start process: ${err.message}`);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(prefix + `Process stopped with signal ${signal}`);
    } else if (code !== null && code !== 0) {
      console.log(prefix + `Process exited with code ${code}`);
    }
  });

  return child;
}

const backend = runProcess("BACKEND", npmCmd, ["run", "dev"], backendDir, "\x1b[32m");
const frontend = runProcess("FRONTEND", npmCmd, ["run", "dev"], frontendDir, "\x1b[34m");

function cleanup() {
  console.log("\n\x1b[33mShutting down services...\x1b[0m");
  try { backend.kill("SIGINT"); } catch (_) {}
  try { frontend.kill("SIGINT"); } catch (_) {}
  setTimeout(() => process.exit(0), 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
