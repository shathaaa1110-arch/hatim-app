import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const build = spawnSync(
  "dotnet",
  ["build", "backend/Hatim.Api", "--configuration", "Release"],
  { cwd: root, stdio: "inherit" },
);
if (build.status !== 0) process.exit(build.status ?? 1);

// Generate from the real .NET endpoints without opening or modifying group data.
const temp = mkdtempSync(join(tmpdir(), "hatim-openapi-"));
const api = spawn(
  "dotnet",
  [
    "backend/Hatim.Api/bin/Release/net10.0/Hatim.Api.dll",
    "--contentRoot",
    join(root, "backend/Hatim.Api"),
    "--urls",
    "http://127.0.0.1:0",
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      HATIM_DB: join(temp, "schema.sqlite3"),
      ASPNETCORE_ENVIRONMENT: "Production",
    },
    stdio: ["ignore", "pipe", "inherit"],
  },
);
const exited = new Promise((resolve) => api.once("exit", resolve));
try {
  const origin = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(new Error("OpenAPI server did not start within 30 seconds.")),
      30000,
    );
    let output = "";
    const finish = (error, address) => {
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve(address);
    };
    api.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = output.match(
        /Now listening on: (http:\/\/127\.0\.0\.1:\d+)/,
      );
      if (match) finish(null, match[1]);
    });
    api.once("error", (error) => finish(error));
    api.once("exit", (code) =>
      finish(new Error(`OpenAPI server exited (${code}).`)),
    );
  });
  const response = await fetch(`${origin}/api/openapi.json`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(`OpenAPI export failed (${response.status}).`);
  const schema = await response.json();
  // An ephemeral listener URL is not part of the API contract.
  delete schema.servers;
  writeFileSync(
    join(root, "backend/openapi.json"),
    JSON.stringify(schema, null, 2) + "\n",
  );
} finally {
  api.kill("SIGTERM");
  await exited;
  rmSync(temp, { recursive: true, force: true });
}
// Isolate the generator's TS 5 peer dependency from Expo's TypeScript 6.
const result = spawnSync(
  "npx",
  [
    "--yes",
    "--package",
    "openapi-typescript@7.13.0",
    "--package",
    "typescript@5.9.3",
    "openapi-typescript",
    "backend/openapi.json",
    "-o",
    "src/api/schema.d.ts",
  ],
  { cwd: root, stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const formatted = spawnSync(
  "npx",
  ["prettier", "--write", "src/api/schema.d.ts"],
  { cwd: root, stdio: "inherit" },
);
process.exitCode = formatted.status ?? 1;
