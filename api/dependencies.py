import secrets
from typing import Annotated
from fastapi import Header, HTTPException, status
from api.config import settings


def verify_api_key(x_api_key: Annotated[str | None, Header()] = None) -> None:
    """Constant-time token verification protecting against side-channel timing attacks."""
    if settings.api_key and (not x_api_key or not secrets.compare_digest(x_api_key, settings.api_key)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
