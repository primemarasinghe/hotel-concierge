"""Simple in-memory sliding-window rate limiter (thread-safe)."""
import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max = max_requests
        self.window = window_seconds
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> tuple[bool, int]:
        """Returns (allowed, retry_after_seconds). retry_after is 0 when allowed."""
        now = time.time()
        cutoff = now - self.window
        with self._lock:
            ts = self._store[key]
            ts[:] = [t for t in ts if t > cutoff]
            if len(ts) >= self.max:
                retry_after = int(ts[0] + self.window - now) + 1
                return False, retry_after
            ts.append(now)
            return True, 0

    def cleanup(self):
        """Evict fully expired keys. Call periodically to bound memory usage."""
        cutoff = time.time() - self.window
        with self._lock:
            dead = [k for k, ts in self._store.items() if not ts or ts[-1] <= cutoff]
            for k in dead:
                del self._store[k]


# Per-session: 30 messages / hour — covers a full booking conversation
session_limiter = RateLimiter(max_requests=30, window_seconds=3600)

# Per-IP: 200 messages / hour — allows ~6 sessions from shared hotel wifi
ip_limiter = RateLimiter(max_requests=200, window_seconds=3600)

# Booking lookup: 10 attempts / 10 min per IP — prevents reference/email enumeration
lookup_limiter = RateLimiter(max_requests=10, window_seconds=600)
