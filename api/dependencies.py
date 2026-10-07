import json
import os
import secrets
from typing import Annotated
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from api.config import settings
from api.services.plan_service import load_artifact

# Bearer security scheme for OpenAPI and bearer token extraction
security = HTTPBearer(auto_error=False)


class AuthUser(BaseModel):
    role: str  # "agent", "manager", "admin"
    agent_id: str | None = None
    area_id: str | None = None


def get_users_map() -> dict[str, dict]:
    """Load token-to-user role mappings from configured users file or env."""
    env_users = os.environ.get("USERS_JSON")
    if env_users:
        try:
            return json.loads(env_users)
        except Exception:
            pass

    if settings.users_file.exists():
        try:
            with open(settings.users_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def get_agent_area_id(agent_id: str) -> str | None:
    """Resolve an agent's assigned area ID from the agents catalog."""
    rows = load_artifact("agents.json")
    for r in rows:
        if r.get("agent_id") == agent_id:
            return r.get("area_id")
    return None


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None,
) -> AuthUser:
    """Validate bearer token and resolve caller identity and role scope."""
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
        users = get_users_map()
        if token in users:
            u = users[token]
            return AuthUser(
                role=u.get("role", "admin"),
                agent_id=u.get("agent_id"),
                area_id=u.get("area_id"),
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unknown authorization token",
        )

    # In production, bearer authorization is strictly mandatory
    if settings.is_production:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    # In development mode, default to full administrative access
    return AuthUser(role="admin")


def verify_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    """Legacy API key verification preserved for backwards compatibility."""
    if settings.api_key and (not x_api_key or not secrets.compare_digest(x_api_key, settings.api_key)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
