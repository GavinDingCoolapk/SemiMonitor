#!/usr/bin/env python3
"""
arXiv collector — fetches recent papers from cs.AR, cs.LG, eess.SP categories.
Uses arXiv Atom API (no auth needed).
"""

import json
import sys
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

# Categories relevant to semiconductors
CATEGORIES = [
    "cs.AR",   # Architecture
    "cs.LG",   # Machine Learning
    "eess.SP", # Signal Processing
]

MAX_RESULTS = 30  # per category


def fetch_arxiv(category, max_results=MAX_RESULTS):
    """Fetch recent papers from arXiv API."""
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    params = urllib.parse.urlencode({
        "search_query": f"cat:{category}",
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    })

    url = f"http://export.arxiv.org/api/query?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "SemiMonitor/1.0"})

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read().decode("utf-8")
    except Exception as e:
        return {"error": str(e), "category": category}

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(data)

    papers = []
    for entry in root.findall("atom:entry", ns):
        title = entry.find("atom:title", ns).text.strip().replace("\n", " ")
        summary = entry.find("atom:summary", ns).text.strip().replace("\n", " ")
        published = entry.find("atom:published", ns).text
        updated = entry.find("atom:updated", ns).text
        entry_id = entry.find("atom:id", ns).text

        # Extract authors
        authors = [a.find("atom:name", ns).text for a in entry.findall("atom:author", ns)]

        # Extract categories
        cats = [c.get("term") for c in entry.findall("atom:category", ns)]

        papers.append({
            "id": f"arxiv-{entry_id.split('/abs/')[-1]}",
            "title": title,
            "text_full": summary[:500],
            "source": "arXiv",
            "source_type": "arxiv",
            "url": entry_id,
            "published_at": published,
            "authors": authors[:3],
            "categories": cats,
            "collected_at": datetime.now(timezone.utc).isoformat(),
        })

    return {"category": category, "papers": papers}


def main():
    all_papers = []
    errors = []

    for cat in CATEGORIES:
        result = fetch_arxiv(cat)
        if "error" in result:
            errors.append(result)
        else:
            all_papers.extend(result["papers"])

    print(json.dumps({
        "papers": all_papers,
        "count": len(all_papers),
        "errors": errors,
    }))


if __name__ == "__main__":
    main()
