import time
from threading import Lock
from typing import Dict, List

from fastapi import HTTPException, Request

_lock = Lock()
_attempts: Dict[str, List[float]] = {}


def check_rate_limit(
    request: Request,
    scope: str,
    max_attempts: int = 5,
    window_seconds: int = 60,
) -> None:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{scope}:{client_ip}"
    now = time.time()

    with _lock:
        timestamps = _attempts.get(key, [])
        valid_timestamps = [ts for ts in timestamps if now - ts <= window_seconds]
        valid_timestamps.append(now)
        _attempts[key] = valid_timestamps

        if len(valid_timestamps) > max_attempts:
            raise HTTPException(
                status_code=429,
                detail="Muitas tentativas. Aguarde e tente novamente.",
            )
