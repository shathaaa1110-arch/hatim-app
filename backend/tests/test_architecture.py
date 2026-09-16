"""Keep feature boundaries enforceable as the product grows; no database required."""

import ast
import importlib.util
import json
from pathlib import Path

from hatim.main import app

ROOT = Path(__file__).parents[2]
PACKAGE = ROOT / "backend/hatim"
POLICY = json.loads((ROOT / "architecture.json").read_text())["backend"]


def module_name(file):
    parts = file.relative_to(PACKAGE.parent).with_suffix("").parts
    return ".".join(parts[:-1] if parts[-1] == "__init__" else parts)


def imports(file, modules):
    name = module_name(file)
    package = name if file.name == "__init__.py" else name.rpartition(".")[0]
    for node in ast.walk(ast.parse(file.read_text())):
        if isinstance(node, ast.Import):
            yield from (alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            target = importlib.util.resolve_name("." * node.level + (node.module or ""), package)
            for alias in node.names:
                child = f"{target}.{alias.name}"
                yield child if child in modules else target


def test_backend_dependency_boundaries_and_cycles():
    modules = {module_name(file): file for file in PACKAGE.rglob("*.py")}
    graph = {}
    errors = []
    for name, file in modules.items():
        targets = set(imports(file, modules))
        graph[name] = targets & modules.keys()
        parts = name.split(".")
        owner = parts[2] if name.startswith("hatim.features.") else None
        if owner:
            assert owner in POLICY, f"Register {owner} in architecture.json"
        for target in targets:
            if name.startswith("hatim.domain."):
                assert not target.startswith(
                    (
                        "fastapi",
                        "psycopg",
                        "hatim.features",
                        "hatim.integrations",
                        "hatim.core.db",
                        "hatim.main",
                    )
                ), f"Pure domain cannot import {target}"
            if name.startswith("hatim.core."):
                assert not target.startswith(
                    ("hatim.features", "hatim.domain", "hatim.integrations", "hatim.main")
                ), f"Infrastructure cannot import {target}"
            if name.startswith("hatim.integrations."):
                assert not target.startswith(("hatim.features", "hatim.main")), (
                    f"The legacy SQL bridge cannot import feature internals: {target}"
                )
            if owner:
                assert target not in {
                    "hatim.main",
                    "hatim.import_sqlite",
                    "hatim.export_openapi",
                }, f"Feature {owner} cannot import composition/tools"
            if target.startswith("hatim.features."):
                target_parts = target.split(".")
                other = target_parts[2]
                historical_fixture = (
                    name == "hatim.import_sqlite"
                    and target == "hatim.features.experiences.fixtures"
                )
                if owner != other and not historical_fixture:
                    # The offline importer alone reads the fixed historical fixtures.
                    if owner and other not in POLICY[owner]:
                        errors.append(f"{name} cannot depend on {other}")
                    if len(target_parts) != 3:
                        errors.append(f"{name} must use {other}'s public __init__.py")
    assert not errors, "\n".join(errors)

    visited, active = set(), set()

    def visit(name, path):
        assert name not in active, f"Import cycle: {' -> '.join([*path, name])}"
        if name in visited:
            return
        active.add(name)
        for target in graph[name]:
            visit(target, [*path, name])
        active.remove(name)
        visited.add(name)

    for name in graph:
        visit(name, [])


def test_published_openapi_matches_registered_feature_routes():
    published = json.loads((ROOT / "backend/openapi.json").read_text())
    assert app.openapi() == published, "Regenerate the API contract with npm run types:api"
