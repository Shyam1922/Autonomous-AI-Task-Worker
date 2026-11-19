from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str = "TaskPilot"
    APP_ENV: str = "development"

    DATABASE_URL: str
    SQL_ECHO: bool = False

    # Comma-separated list of allowed frontend origins.
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # LLM configuration. "auto" uses Claude when an API key is available,
    # otherwise the deterministic offline mock planner.
    LLM_PROVIDER: Literal["auto", "claude", "mock"] = "auto"
    ANTHROPIC_API_KEY: str | None = None
    LLM_MODEL: str = "claude-opus-5-5"
    LLM_EFFORT: Literal["low", "medium", "high", "xhigh", "max"] = "medium"
    LLM_MAX_TOKENS: int = 16000

    # Execution limits.
    MAX_STEPS_PER_TASK: int = 30
    MAX_RETRIES_PER_STEP: int = 2
    TOOL_TIMEOUT_SECONDS: float = 30.0
    REQUIRE_APPROVAL_FOR_WRITES: bool = True

    # Synthetic documents the agent is allowed to read.
    DEMO_DOCUMENTS_DIR: Path = BACKEND_DIR / "demo_data" / "invoices"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("DEMO_DOCUMENTS_DIR")
    @classmethod
    def _resolve_dir(cls, value: Path) -> Path:
        return value.resolve()

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def resolved_llm_provider(self) -> Literal["claude", "mock"]:
        if self.LLM_PROVIDER == "auto":
            return "claude" if self.ANTHROPIC_API_KEY else "mock"
        return self.LLM_PROVIDER


settings = Settings()
