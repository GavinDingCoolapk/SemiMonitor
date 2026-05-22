#!/usr/bin/env python3
"""
Twitter/X collector using Scweet library.
Fetches recent tweets from 6 analyst accounts and outputs JSON to stdout.
"""

import json
import sys
import os
from datetime import datetime, timezone, timedelta

try:
    from Scweet import Scweet
except ImportError:
    print(json.dumps({"error": "Scweet not installed. Run: pip install Scweet"}))
    sys.exit(1)

# Config
ACCOUNTS = [
    "karpathy",
    "LinQingV",
    "mingchikuo",
    "Zai_org",
    "xiaomustock",
    "qinbafrank",
]

AUTH_TOKEN = os.environ.get("X_AUTH_TOKEN", "")
PROXY = os.environ.get("X_PROXY", "http://127.0.0.1:7897")

# Only fetch tweets from the last 24 hours
SINCE = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%d")


def fetch_tweets():
    if not AUTH_TOKEN:
        print(json.dumps({"error": "X_AUTH_TOKEN not set"}))
        sys.exit(1)

    s = Scweet(auth_token=AUTH_TOKEN, proxy=PROXY)
    all_tweets = []

    for account in ACCOUNTS:
        try:
            results = s.get_profile_tweets(
                users=[account],
                limit=20,
            )
            for tweet in results:
                # Scweet returns dict with text, created_at, likes, retweets, etc.
                text = tweet.get("text", "")
                if not text:
                    continue

                created_at = tweet.get("created_at", "")
                likes = tweet.get("likes", 0)
                retweets = tweet.get("retweets", 0)
                replies = tweet.get("replies", 0)
                tweet_id = tweet.get("id", "")
                url = f"https://x.com/{account}/status/{tweet_id}" if tweet_id else ""

                all_tweets.append({
                    "id": f"tw-{account}-{tweet_id}" if tweet_id else f"tw-{account}-{len(all_tweets)}",
                    "title": text[:200] + ("..." if len(text) > 200 else ""),
                    "text_full": text,
                    "source": f"@{account}",
                    "source_type": "twitter",
                    "url": url,
                    "published_at": created_at,
                    "likes": likes,
                    "retweets": retweets,
                    "replies": replies,
                    "account": account,
                    "collected_at": datetime.now(timezone.utc).isoformat(),
                })
        except Exception as e:
            print(json.dumps({"warn": f"Failed to fetch @{account}: {str(e)}"}), file=sys.stderr)

    # Deduplicate by id
    seen = set()
    unique = []
    for t in all_tweets:
        if t["id"] not in seen:
            seen.add(t["id"])
            unique.append(t)

    print(json.dumps({"tweets": unique, "count": len(unique)}))


if __name__ == "__main__":
    fetch_tweets()
