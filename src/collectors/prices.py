#!/usr/bin/env python3
"""
DRAM Price Collector — adapted from kepler-monitor/core/price_dram.py.
Fetches TrendForce DRAM spot prices and outputs JSON to stdout.
"""

import re
import json
import sys
from datetime import datetime

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print(json.dumps({"error": "Need: pip install requests beautifulsoup4"}))
    sys.exit(1)

URL = "https://www.trendforce.com/price/dram/dram_spot"


def fetch():
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
    try:
        r = requests.get(URL, headers=headers, timeout=30)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        table = soup.find("table")
        if not table:
            return {"prices": [], "error": "no table found"}

        prices = []
        for row in table.find_all("tr")[1:]:
            cols = row.find_all("td")
            if len(cols) >= 7:
                try:
                    price = float(cols[5].get_text(strip=True).replace(",", ""))
                except ValueError:
                    price = 0.0
                change = 0.0
                change_text = cols[6].get_text(strip=True)
                m = re.search(r"(\d+\.?\d*)\s*%", change_text)
                if m:
                    change = float(m.group(1))
                    if "▼" in change_text:
                        change = -change
                prices.append({
                    "product": cols[0].get_text(strip=True),
                    "price": price,
                    "change_pct": change,
                    "unit": "USD",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                })

        last_update = None
        for p in soup.find_all("p"):
            m2 = re.search(r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2})", p.get_text())
            if m2:
                last_update = m2.group(1)
                break

        return {"prices": prices, "count": len(prices), "last_update": last_update}
    except Exception as e:
        return {"prices": [], "error": str(e)}


if __name__ == "__main__":
    result = fetch()
    print(json.dumps(result))
