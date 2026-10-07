import os
from pathlib import Path
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "CashReady API"
    app_version: str = "1.0.0"
    app_description: str = "Automated Liquidity Management & Decision Support for MFS Agents (AI DEV FEST 2026, Track 05)."
    env: str = Field(default_factory=lambda: os.environ.get("ENV", "development").lower())
    artifacts_dir: Path = Field(default_factory=lambda: Path(os.environ.get("ARTIFACTS_DIR", "artifacts/serve")))
    users_file: Path = Field(default_factory=lambda: Path(os.environ.get("USERS_FILE", "config/demo_users.json")))
    api_key: str | None = Field(default_factory=lambda: os.environ.get("API_KEY"))
    frontend_origin: str = Field(default_factory=lambda: os.environ.get("FRONTEND_ORIGINS", os.environ.get("FRONTEND_ORIGIN", "*")))
    port: int = Field(default_factory=lambda: int(os.environ.get("PORT", "8100")))

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def frontend_origins(self) -> str:
        return self.frontend_origin

    @property
    def cors_origins(self) -> list[str]:
        raw = self.frontend_origin.strip()
        if not self.is_production:
            return ["*"] if raw == "*" or not raw else [o.strip() for o in raw.split(",") if o.strip()]
        # In production, wildcard "*" is rejected
        if raw == "*" or not raw:
            return ["https://cashready.masud-rana.me", "http://localhost:3000", "http://localhost:8200"]
        return [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()
