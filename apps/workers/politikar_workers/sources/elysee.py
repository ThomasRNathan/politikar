"""Élysée RSS connector. Public licence Etalab 2.0."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import feedparser
import httpx
from loguru import logger

FEED_URL = "https://www.elysee.fr/feed"
USER_AGENT = "politikar/0.1 (+https://politikar.vercel.app)"


@dataclass(slots=True)
class ElyseeItem:
    id: str
    title: str
    link: str
    summary: str
    published_at: datetime | None
    raw: dict[str, Any]


def _parse_date(d: feedparser.FeedParserDict) -> datetime | None:
    if "published_parsed" in d and d.published_parsed:
        return datetime(*d.published_parsed[:6], tzinfo=UTC)
    return None


def fetch_items(limit: int = 50, *, http: httpx.Client | None = None) -> list[ElyseeItem]:
    """Fetch the Élysée RSS feed and return a parsed list of items."""
    own = http is None
    client = http or httpx.Client(
        headers={"User-Agent": USER_AGENT}, timeout=30.0, follow_redirects=True
    )
    try:
        resp = client.get(FEED_URL)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
        out: list[ElyseeItem] = []
        for entry in feed.entries[:limit]:
            link = entry.get("link", "")
            sha = hashlib.sha256(link.encode("utf-8")).hexdigest()[:16]
            out.append(
                ElyseeItem(
                    id=f"elysee-{sha}",
                    title=entry.get("title", "").strip(),
                    link=link,
                    summary=entry.get("description", "").strip(),
                    published_at=_parse_date(entry),
                    raw={"guid": entry.get("guid")},
                )
            )
        logger.info("elysee.fetched count={}", len(out))
        return out
    finally:
        if own:
            client.close()
