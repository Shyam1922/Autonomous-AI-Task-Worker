import os
import tempfile
from pathlib import Path

# Configure before the app (and its settings) are imported.
_DB_FILE = Path(tempfile.mkdtemp()) / "taskpilot_test.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_DB_FILE.as_posix()}"
os.environ["LLM_PROVIDER"] = "mock"
os.environ["REQUIRE_APPROVAL_FOR_WRITES"] = "true"

import httpx  # noqa: E402
import pytest  # noqa: E402

from app.agent.manager import manager  # noqa: E402
from app.database import models  # noqa: E402,F401
from app.database.base import Base  # noqa: E402
from app.database.connection import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
async def fresh_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()  # connections are bound to this test's event loop


@pytest.fixture(autouse=True)
def no_background_runs(monkeypatch):
    """Tests drive the runner explicitly with manager.run_inline for determinism."""
    monkeypatch.setattr(manager, "start", lambda task_id: None)


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
