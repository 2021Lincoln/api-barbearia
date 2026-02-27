from threading import Lock
from typing import Dict

_lock = Lock()
_metrics = {
    "total_requests": 0,
    "total_errors": 0,
    "by_route": {},
}


def record_request(path: str, status_code: int) -> None:
    with _lock:
        _metrics["total_requests"] += 1
        if status_code >= 400:
            _metrics["total_errors"] += 1

        by_route: Dict[str, Dict[str, int]] = _metrics["by_route"]
        if path not in by_route:
            by_route[path] = {"requests": 0, "errors": 0}
        by_route[path]["requests"] += 1
        if status_code >= 400:
            by_route[path]["errors"] += 1


def get_metrics_snapshot() -> dict:
    with _lock:
        return {
            "total_requests": _metrics["total_requests"],
            "total_errors": _metrics["total_errors"],
            "by_route": {k: v.copy() for k, v in _metrics["by_route"].items()},
        }
