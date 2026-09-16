import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const policy = JSON.parse(
  readFileSync(resolve(root, "architecture.json")),
).frontend;
const errors = [];
const graph = new Map();
const label = (file) => relative(root, file);
const feature = (file) => label(file).match(/^src\/features\/([^/]+)\//)?.[1];
function walk(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = resolve(folder, entry.name);
    return entry.isDirectory()
      ? walk(file)
      : /\.tsx?$/.test(file)
        ? [file]
        : [];
  });
}
const files = [resolve(root, "App.tsx"), ...walk(resolve(root, "src"))];
for (const file of files) {
  if (file.endsWith(".d.ts")) continue;
  const edges = new Set();
  graph.set(file, edges);
  const owner = feature(file);
  if (owner && !Object.hasOwn(policy, owner))
    errors.push(`${label(file)}: feature missing from architecture.json`);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(source) === "require")
    ) {
      if (node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]))
        imports.push(node.arguments[0].text);
      else
        errors.push(`${label(file)}: dynamic module paths cannot be checked`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const path of imports) {
    if (!path.startsWith(".")) {
      if (path.startsWith("@/") || path.startsWith("src/"))
        errors.push(
          `${label(file)}: use relative imports so feature boundaries remain checkable`,
        );
      continue;
    }
    const base = resolve(dirname(file), path);
    if ([".jpg", ".png", ".ttf"].includes(extname(base))) continue;
    const target = [
      base + ".ts",
      base + ".tsx",
      base + ".d.ts",
      resolve(base, "index.ts"),
    ].find(existsSync);
    if (!target) {
      errors.push(`${label(file)}: unresolved local module ${path}`);
      continue;
    }
    edges.add(target);
    const targetOwner = feature(target);
    if (
      label(file).startsWith("src/shared/") &&
      !label(target).startsWith("src/shared/")
    )
      errors.push(`${label(file)}: shared code cannot import ${label(target)}`);
    if (owner && label(target).startsWith("src/application/"))
      errors.push(`${label(file)}: features cannot import app composition`);
    if (targetOwner && owner !== targetOwner) {
      if (owner && !(policy[owner] ?? []).includes(targetOwner))
        errors.push(`${label(file)}: ${owner} cannot depend on ${targetOwner}`);
      if (target !== resolve(root, "src/features", targetOwner, "index.ts"))
        errors.push(
          `${label(file)}: import ${targetOwner} through its public index.ts`,
        );
    }
  }
}
const visited = new Set();
const active = new Set();
function checkCycles(file, path = []) {
  if (active.has(file)) {
    errors.push(`Import cycle: ${[...path, file].map(label).join(" -> ")}`);
    return;
  }
  if (visited.has(file)) return;
  active.add(file);
  for (const next of graph.get(file) ?? []) checkCycles(next, [...path, file]);
  active.delete(file);
  visited.add(file);
}
for (const file of graph.keys()) checkCycles(file);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Architecture: ${graph.size} frontend modules, public feature imports, no dependency cycles.`,
  );
