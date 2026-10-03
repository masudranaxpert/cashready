import os
from pathlib import Path
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "CashReady API"
    app_version: str = "1.0.0"
    app_description: str = "Automated Liquidity Management & Decision Support for MFS Agents (AI DEV FEST 2026, Track 05)."
    artifacts_dir: Path = Field(default_factory=lambda: Path(os.environ.get("ARTIFACTS_DIR", "artifacts/serve")))
    api_key: str | None = Field(default_factory=lambda: os.environ.get("API_KEY"))
    frontend_origin: str = Field(default_factory=lambda: os.environ.get("FRONTEND_ORIGIN", "*"))
    port: int = Field(default_factory=lambda: int(os.environ.get("PORT", "8100")))

    @property
    def cors_origins(self) -> list[str]:
        if self.frontend_origin == "*":
            return ["*"]
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]


settings = Settings()
