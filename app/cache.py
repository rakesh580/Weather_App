"""Tiny async-aware TTL cache with single-flight semantics.

Kept in-process on purpose: SkyPulse runs as a single container. Swap the
backing store for Redis by re-implementing `get`/`set` if you scale out.
"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Hashable
from typing import Any, Generic, TypeVar

from cachetools import TTLCache

T = TypeVar("T")


class AsyncTTLCache(Generic[T]):
    def __init__(self, maxsize: int, ttl: int) -> None:
        self._store: TTLCache = TTLCache(maxsize=maxsize, ttl=ttl)
        self._locks: dict[Hashable, asyncio.Lock] = {}
        self.hits = 0
        self.misses = 0

    def get(self, key: Hashable) -> T | None:
        value = self._store.get(key)
        if value is None:
            self.misses += 1
        else:
            self.hits += 1
        return value

    def set(self, key: Hashable, value: T) -> None:
        self._store[key] = value

    def clear(self) -> None:
        self._store.clear()

    def __len__(self) -> int:
        return len(self._store)

    async def get_or_fetch(self, key: Hashable, fetch: Callable[[], Awaitable[T]]) -> T:
        """Return the cached value or run `fetch` exactly once per key while cold."""
        cached = self.get(key)
        if cached is not None:
            return cached
        lock = self._locks.setdefault(key, asyncio.Lock())
        async with lock:
            cached = self._store.get(key)
            if cached is not None:
                return cached
            value = await fetch()
            if value is not None:
                self._store[key] = value
            return value

    def stats(self) -> dict[str, Any]:
        return {"size": len(self._store), "hits": self.hits, "misses": self.misses}
