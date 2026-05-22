#!/usr/bin/env python3
"""
ACM Conference collector — fetches accepted papers from top systems/architecture conferences.
Uses Tavily to search + extract conference pages.
"""

import json
import sys
import os
import subprocess
import re
from datetime import datetime, timezone

# Conference pages to monitor
CONFERENCES = [
    {
        "name": "SIGCOMM 2025",
        "url": "https://conferences.sigcomm.org/sigcomm/2025/accepted-papers",
        "query": "site:conferences.sigcomm.org SIGCOMM 2025 accepted papers",
    },
    {
        "name": "ISCA 2025",
        "url": "https://iscaconf.org/isca2025/program/accepted-papers/",
        "query": "ISCA 2025 accepted papers",
    },
    {
        "name": "MICRO 2025",
        "url": "https://www.microarch.org/micro57/program/",
        "query": "MICRO 2025 accepted papers computer architecture",
    },
]

TAVILY_SCRIPT = os.path.expanduser(
    "~/.openclaw/workspace-darren/skills/tavily-search/scripts/extract.mjs"
)


def extract_via_tavily(url):
    """Extract page content using Tavily."""
    try:
        result = subprocess.run(
            ["node", TAVILY_SCRIPT, url],
            capture_output=True, text=True, timeout=30,
            env={**os.environ, "PATH": os.environ.get("PATH", "")},
        )
        if result.returncode != 0:
            return None
        return result.stdout
    except Exception:
        return None


def parse_papers(text, conference_name):
    """Parse paper titles from extracted text."""
    papers = []
    lines = text.split("\n")

    current_title = ""
    current_authors = ""

    for line in lines:
        line = line.strip()
        if not line or line.startswith("!") or line.startswith("#") or line.startswith("---"):
            if current_title and len(current_title) > 15:
                papers.append({
                    "title": current_title,
                    "authors": current_authors.strip(),
                })
            current_title = ""
            current_authors = ""
            continue

        # Title lines: plain text, not starting with special chars, reasonable length
        if (
            not line.startswith("[")
            and not line.startswith("|")
            and not line.startswith("-")
            and len(line) > 15
            and not line.startswith("This year")
            and not line.startswith("Abstract:")
            and not any(c in line for c in ["{", "}", "<", ">", "http"])
        ):
            if current_title:
                # Save previous paper
                if len(current_title) > 15:
                    papers.append({
                        "title": current_title,
                        "authors": current_authors.strip(),
                    })
            current_title = line
            current_authors = ""
        elif current_title and line and not line.startswith("!"):
            # This is likely authors
            current_authors = line

    # Don't forget last paper
    if current_title and len(current_title) > 15:
        papers.append({
            "title": current_title,
            "authors": current_authors.strip(),
        })

    return papers


def main():
    all_papers = []

    for conf in CONFERENCES:
        # Try direct Tavily extraction first
        text = extract_via_tavily(conf["url"])
        if text:
            papers = parse_papers(text, conf["name"])
            for p in papers:
                all_papers.append({
                    "id": f"conf-{conf['name'].lower().replace(' ', '-')}-{len(all_papers)}",
                    "title": p["title"],
                    "text_full": f"Conference: {conf['name']}. Authors: {p['authors']}",
                    "source": conf["name"],
                    "source_type": "acm_conference",
                    "url": conf["url"],
                    "published_at": datetime.now(timezone.utc).isoformat(),
                    "venue": conf["name"],
                    "authors": p["authors"].split(", ")[:5] if p["authors"] else [],
                    "collected_at": datetime.now(timezone.utc).isoformat(),
                })

    # Deduplicate
    seen = set()
    unique = []
    for p in all_papers:
        key = p["title"].lower().strip()[:80]
        if key not in seen:
            seen.add(key)
            unique.append(p)

    print(json.dumps({
        "papers": unique,
        "count": len(unique),
    }))


if __name__ == "__main__":
    main()
