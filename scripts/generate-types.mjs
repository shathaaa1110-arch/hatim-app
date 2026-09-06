import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const commands = [
  [
    "uv",
    [
      "run",
      "--project",
      "backend",
      "python",
      "-c",
      'import sys,json; sys.path.insert(0,"backend"); from hatim.main import app; open("backend/openapi.json","w").write(json.dumps(app.openapi(),ensure_ascii=False,indent=2)+"\\n")',
    ],
  ],
  // The generator's TS 5 peer dependency is isolated from the app's Expo-supported TS 6.
  [
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
  ],
];
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
