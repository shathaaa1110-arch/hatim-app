import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
// Fail before starting a new tunnel if an existing backend owns the port.
await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(8000, "127.0.0.1", () => server.close(resolve));
}).catch(() => {
  console.error("Port 8000 is in use. Stop the previous test server first.");
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
  const build = launch("npm", ["run", "web:build"]);
  const code = await new Promise((resolve) => build.once("exit", resolve));
  if (code !== 0) stop(1);
  else {
    const server = launch("uv", [
      "run",
      "--project",
      "backend",
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
    console.log(
      `\nPublic companion: ${origin}\nNative API origin saved to .env.local. Rebuild the iPhone app after a tunnel URL changes.\nKeep this terminal open. Ctrl+C stops both services.\n`,
    );
  }
}
