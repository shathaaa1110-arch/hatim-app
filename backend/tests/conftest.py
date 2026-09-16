import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from hatim.core.db import initialize
from hatim.main import app


@pytest.fixture
def database(monkeypatch):
    url = os.getenv("HATIM_TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        pytest.fail(
            "PostgreSQL tests require DATABASE_URL. Run npm run db:up, then npm run test:api."
        )
    schema = "hatim_test_" + uuid4().hex
    # Each test owns a unique schema; never truncate/drop the application's tables.
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        monkeypatch.setenv("DATABASE_URL", make_conninfo(url, options=f"-c search_path={schema}"))
        try:
            initialize()
            yield
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


@pytest.fixture
def client(database):
    with TestClient(app) as client:
        yield client
