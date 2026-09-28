import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
const action = process.argv[2] ?? "up";
const commands = {
  up: ["up", "--detach", "--wait", "postgres"],
  stop: ["stop", "postgres"],
  status: ["ps", "postgres"],
};
if (!Object.hasOwn(commands, action)) {
  console.error("Usage: node scripts/database.mjs [up|stop|status]");
  process.exit(1);
}
if (action === "up") {
  if (!existsSync(".env.postgres.local")) {
    writeFileSync(
      ".env.postgres.local",
      `POSTGRES_USER=hatim\nPOSTGRES_DB=hatim\nPOSTGRES_PASSWORD=${randomBytes(32).toString("hex")}\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
  if (!existsSync("backend/.env.local")) {
    const settings = parseEnv(readFileSync(".env.postgres.local", "utf8"));
    const user = encodeURIComponent(settings.POSTGRES_USER);
    const password = encodeURIComponent(settings.POSTGRES_PASSWORD);
    const database = encodeURIComponent(settings.POSTGRES_DB);
    writeFileSync(
      "backend/.env.local",
      `DATABASE_URL=postgresql://${user}:${password}@127.0.0.1:5432/${database}\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
}
const result = spawnSync("docker", ["compose", ...commands[action]], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
