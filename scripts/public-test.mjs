import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
// Reuse a healthy Hatim backend when only its temporary tunnel needs restarting.
const reuseBackend = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(8000, "127.0.0.1", () => server.close(() => resolve(false)));
}).catch(async (error) => {
  if (error.code === "EADDRINUSE") {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/health", {
        signal: AbortSignal.timeout(3000),
      });
      const health = await response.json();
      if (
        response.ok &&
        health.status === "ok" &&
        health.version === "1.0.0" &&
        health.backend === "python" &&
        health.database === "postgresql" &&
        health.catalog_mode === "fictional-demo"
      ) {
        const web = await fetch("http://127.0.0.1:8000/", {
          signal: AbortSignal.timeout(3000),
        });
        if (web.ok && web.headers.get("content-type")?.includes("text/html")) {
          console.log("Reusing the running Hatim API on port 8000.");
          return true;
        }
      }
    } catch {
      // A busy port alone does not identify a usable Hatim backend.
    }
  }
  console.error(
    "Port 8000 is unavailable or is not serving Hatim and its web companion. Stop that server, then retry.",
  );
  process.exit(1);
});

const children = new Set();
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
function launch(command, args, stdio = "inherit") {
  const child = spawn(command, args, { cwd: root, env: process.env, stdio });
  children.add(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", () => children.delete(child));
  return child;
}

const binary = existsSync(".tools/cloudflared")
  ? ".tools/cloudflared"
  : "cloudflared";
const tunnel = launch(
  binary,
  [
    "tunnel",
    "--url",
    "http://127.0.0.1:8000",
    "--no-autoupdate",
    "--protocol",
    "http2",
  ],
  ["ignore", "pipe", "pipe"],
);
tunnel.on("exit", () => {
  if (!closing) stop(1);
});
const origin = await new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () =>
      reject(new Error("Cloudflare did not return a URL within 45 seconds.")),
    45000,
  );
  function inspect(chunk) {
    const text = chunk.toString();
    process.stdout.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      clearTimeout(timeout);
      resolve(match[0]);
    }
  }
  tunnel.stdout.on("data", inspect);
  tunnel.stderr.on("data", inspect);
  tunnel.once("error", reject);
  tunnel.once("exit", () => {
    clearTimeout(timeout);
    reject(new Error("Tunnel stopped."));
  });
}).catch((error) => {
  console.error(error.message);
  stop(1);
});
if (!closing) {
  const existing = existsSync(".env.local")
    ? readFileSync(".env.local", "utf8")
    : "";
  const otherSettings = existing
    .split("\n")
    .filter((line) => !/^EXPO_PUBLIC_API_URL=/.test(line))
    .join("\n")
    .trimEnd();
  writeFileSync(
    ".env.local",
    `${otherSettings}${otherSettings ? "\n" : ""}EXPO_PUBLIC_API_URL=${origin}\n`,
  );
  const compile = launch("uv", ["sync", "--project", "backend", "--locked"]);
  const compiled = await new Promise((resolve) =>
    compile.once("exit", resolve),
  );
  if (compiled !== 0) stop(1);
}
if (!closing) {
  const build = launch("npm", ["run", "web:build"]);
  const code = await new Promise((resolve) => build.once("exit", resolve));
  if (code !== 0) stop(1);
  else {
    if (!reuseBackend) {
      const server = launch("uv", [
        "run",
        "--project",
        "backend",
        "--env-file",
        "backend/.env.local",
        "uvicorn",
        "hatim.main:app",
        "--app-dir",
        "backend",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
      ]);
      server.on("exit", () => {
        if (!closing) stop(1);
      });
    }
    console.log(
      `\nPublic companion: ${origin}\nPublic origin saved to .env.local. Rebuild the native app to update invitations and the physical iPhone connection. The iOS simulator uses localhost.\nKeep this terminal open. Ctrl+C stops the tunnel${reuseBackend ? "; the existing API keeps running" : " and API"}.\n`,
    );
  }
}
