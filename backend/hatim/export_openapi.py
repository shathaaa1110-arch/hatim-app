"""Generate the API contract without connecting to a database or starting a server."""

import json
from pathlib import Path

from .main import app

if __name__ == "__main__":
    output = Path(__file__).parents[1] / "openapi.json"
    output.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
