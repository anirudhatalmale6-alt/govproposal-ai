"""
In-memory caching layer for GovProposal AI.

Provides a Redis-style caching interface using Python dictionaries.
Caches SAM.gov results, AI responses, and other expensive computations.
Easily swappable to Redis in production by implementing the same interface.
"""

import hashlib
import json
import time
import logging
from typing import Any, Optional
from functools import wraps

logger = logging.getLogger(__name__)


class CacheEntry:
    """Single cache entry with TTL support."""

    __slots__ = ("value", "expires_at", "created_at")

    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl if ttl > 0 else float("inf")

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class CacheService:
    """
    In-memory cache with TTL, namespacing, and basic stats.

    Usage:
        cache = CacheService()
        cache.set("sam:keyword:cyber", results, ttl=300)
        cached = cache.get("sam:keyword:cyber")
    """

    def __init__(self, default_ttl: int = 300, max_entries: int = 10000):
        self._store: dict[str, CacheEntry] = {}
        self.default_ttl = default_ttl  # 5 minutes default
        self.max_entries = max_entries
        self._hits = 0
        self._misses = 0

    def _make_key(self, namespace: str, *parts: str) -> str:
        """Build a namespaced cache key."""
        raw = ":".join([namespace] + [str(p) for p in parts if p])
        return raw

    def _hash_key(self, namespace: str, data: Any) -> str:
        """Build a cache key from a data dict/list by hashing it."""
        raw = json.dumps(data, sort_keys=True, default=str)
        digest = hashlib.md5(raw.encode()).hexdigest()[:12]
        return f"{namespace}:{digest}"

    def get(self, key: str) -> Optional[Any]:
        """Retrieve a cached value. Returns None if missing or expired."""
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None
        if entry.is_expired:
            del self._store[key]
            self._misses += 1
            return None
        self._hits += 1
        return entry.value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Store a value with optional TTL (seconds). 0 = no expiry."""
        if ttl is None:
            ttl = self.default_ttl
        # Evict expired entries if near capacity
        if len(self._store) >= self.max_entries:
            self._evict_expired()
        # If still near capacity, evict oldest entries
        if len(self._store) >= self.max_entries:
            self._evict_oldest(self.max_entries // 10)
        self._store[key] = CacheEntry(value, ttl)

    def delete(self, key: str) -> bool:
        """Delete a specific key. Returns True if it existed."""
        if key in self._store:
            del self._store[key]
            return True
        return False

    def clear(self, namespace: Optional[str] = None) -> int:
        """Clear all entries, or all entries matching a namespace prefix."""
        if namespace is None:
            count = len(self._store)
            self._store.clear()
            return count
        keys_to_delete = [k for k in self._store if k.startswith(namespace + ":")]
        for k in keys_to_delete:
            del self._store[k]
        return len(keys_to_delete)

    def stats(self) -> dict:
        """Return cache statistics."""
        total_requests = self._hits + self._misses
        return {
            "total_entries": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(self._hits / total_requests * 100, 1) if total_requests > 0 else 0,
            "max_entries": self.max_entries,
            "default_ttl": self.default_ttl,
        }

    def _evict_expired(self) -> int:
        """Remove all expired entries."""
        expired = [k for k, v in self._store.items() if v.is_expired]
        for k in expired:
            del self._store[k]
        if expired:
            logger.debug("Evicted %d expired cache entries", len(expired))
        return len(expired)

    def _evict_oldest(self, count: int) -> None:
        """Evict the N oldest entries."""
        sorted_keys = sorted(self._store, key=lambda k: self._store[k].created_at)
        for k in sorted_keys[:count]:
            del self._store[k]
        logger.debug("Evicted %d oldest cache entries", min(count, len(sorted_keys)))


# ── Singleton instances ─────────────────────────────────────────────

# SAM.gov results: cache for 10 minutes
sam_cache = CacheService(default_ttl=600, max_entries=5000)

# AI responses: cache for 30 minutes
ai_cache = CacheService(default_ttl=1800, max_entries=2000)

# General purpose: cache for 5 minutes
general_cache = CacheService(default_ttl=300, max_entries=5000)


# ── Decorator for easy caching ─────────────────────────────────────

def cached(cache_instance: CacheService, namespace: str, ttl: Optional[int] = None):
    """
    Decorator that caches function return values.

    Usage:
        @cached(sam_cache, "sam_search", ttl=600)
        def search_opportunities(keyword, naics):
            ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function args
            key_parts = [str(a) for a in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
            key = cache_instance._make_key(namespace, *key_parts)
            cached_val = cache_instance.get(key)
            if cached_val is not None:
                logger.debug("Cache HIT: %s", key)
                return cached_val
            result = func(*args, **kwargs)
            cache_instance.set(key, result, ttl=ttl)
            logger.debug("Cache MISS → stored: %s", key)
            return result
        return wrapper

    def async_decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key_parts = [str(a) for a in args] + [f"{k}={v}" for k, v in sorted(kwargs.items())]
            key = cache_instance._make_key(namespace, *key_parts)
            cached_val = cache_instance.get(key)
            if cached_val is not None:
                logger.debug("Cache HIT: %s", key)
                return cached_val
            result = await func(*args, **kwargs)
            cache_instance.set(key, result, ttl=ttl)
            logger.debug("Cache MISS → stored: %s", key)
            return result
        return wrapper

    def smart_decorator(func):
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_decorator(func)
        return decorator(func)

    return smart_decorator
