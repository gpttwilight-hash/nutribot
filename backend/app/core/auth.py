"""Telegram initData validation and JWT token management."""

import hashlib
import hmac
import json
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, unquote

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()
security = HTTPBearer()


def validate_telegram_init_data(init_data: str) -> dict:
    """
    Validate Telegram Mini App initData using HMAC-SHA256.
    Returns the parsed user data if valid.
    Raises HTTPException if invalid.
    """
    parsed = parse_qs(init_data)

    if "hash" not in parsed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing hash in initData",
        )

    received_hash = parsed.pop("hash")[0]

    # Check auth_date is within 5 minutes
    if "auth_date" in parsed:
        auth_date = int(parsed["auth_date"][0])
        if abs(time.time() - auth_date) > 300:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="initData expired (auth_date too old)",
            )

    # Build the data-check string
    data_check_pairs = []
    for key in sorted(parsed.keys()):
        data_check_pairs.append(f"{key}={parsed[key][0]}")
    data_check_string = "\n".join(data_check_pairs)

    # Compute HMAC-SHA256
    secret_key = hmac.new(
        b"WebAppData", settings.TELEGRAM_BOT_TOKEN.encode(), hashlib.sha256
    ).digest()
    computed_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid initData signature",
        )

    # Parse user JSON
    user_data = {}
    if "user" in parsed:
        user_data = json.loads(unquote(parsed["user"][0]))

    return user_data


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        hours=settings.JWT_ACCESS_TOKEN_EXPIRE_HOURS
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """FastAPI dependency to extract user_id from JWT."""
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user ID",
        )
    return user_id
