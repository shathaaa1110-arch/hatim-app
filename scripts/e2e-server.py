"""Serve a disposable PostgreSQL schema for browser QA, never the user's app tables."""

import os
import signal
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import make_conninfo

root = Path(__file__).resolve().parents[1]
url = os.environ.get("HATIM_TEST_DATABASE_URL") or os.environ["DATABASE_URL"]
schema = "hatim_e2e_" + uuid4().hex
with psycopg.connect(url, autocommit=True) as admin:
    admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    child = None
    stopping = False

    def stop(_number, _frame):
        global stopping
        stopping = True
        if child is not None:
            child.terminate()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        child = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "hatim.main:app",
                "--app-dir",
                "backend",
                "--host",
                "127.0.0.1",
                "--port",
                os.environ.get("HATIM_TEST_PORT", "8002"),
                "--no-access-log",
            ],
            cwd=root,
            env={
                **os.environ,
                "DATABASE_URL": make_conninfo(url, options=f"-c search_path={schema}"),
            },
        )
        if stopping:
            child.terminate()
        code = child.wait()
    finally:
        if child is not None and child.poll() is None:
            child.terminate()
            child.wait(timeout=15)
        admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
sys.exit(0 if stopping else code)
