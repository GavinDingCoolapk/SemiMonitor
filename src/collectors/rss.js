/**
 * RSS Collector for semi-monitor
 * Fetches semiconductor-related news from configured RSS feeds.
 * Outputs JSON array of articles to stdout.
 * 
 * Usage:
 *   node rss.js                        # Output to stdout
 *   node rss.js > /tmp/semi-news.json  # Save to file
 */

import FeedParser from "feedparser";
import request from "request";
import { URL } from "url";
import fs from "fs";
import path from "path";

const configPath = new URL("../../config/sources.json", import.meta.url).pathname;
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// All keywords flat, lowercased
const allKeywords = {};
for (const [component, words] of Object.entries(config.keywords)) {
  for (const w of words) {
    allKeywords[w.toLowerCase()] = component;
  }
}

function classify(text) {
  const lower = text.toLowerCase();
  const matched = new Set();
  
  for (const [keyword, component] of Object.entries(allKeywords)) {
    if (lower.includes(keyword)) {
      matched.add(component);
    }
  }
  
  return [...matched];
}

function isSemiconductorRelated(text) {
  return classify(text).length > 0;
}

function fetchFeed(feedUrl) {
  return new Promise((resolve, reject) => {
    const items = [];
    const req = request(feedUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "SemiMonitor/1.0 (Research Bot)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    const feedparser = new FeedParser();

    req.on("error", (err) => {
      // Feed fetch failed — return empty
      resolve([]);
    });

    req.on("response", (res) => {
      if (res.statusCode !== 200) {
        resolve([]);
        return;
      }
      res.pipe(feedparser);
    });

    feedparser.on("error", (err) => {
      resolve([]);
    });

    feedparser.on("readable", () => {
      let item;
      while ((item = feedparser.read())) {
        const textToCheck = `${item.title || ""} ${item.summary || ""} ${item.description || ""}`;
        if (isSemiconductorRelated(textToCheck)) {
          items.push({
            title: item.title || "",
            source: feedUrl.replace(/^https?:\/\//, "").split("/")[0],
            source_url: item.link || item.origlink || "",
            published_at: item.pubdate ? item.pubdate.toISOString() : new Date().toISOString(),
            keywords_matched: classify(textToCheck),
          });
        }
      }
    });

    feedparser.on("end", () => {
      resolve(items);
    });

    // Handle timeout
    req.on("timeout", () => {
      req.abort();
      resolve([]);
    });
  });
}

async function main() {
  const allItems = [];
  const results = {};

  console.error(`Fetching ${config.rss_sources.length} RSS feeds...`);

  for (const feed of config.rss_sources) {
    try {
      const items = await fetchFeed(feed.url);
      results[feed.name] = items.length;
      allItems.push(...items);
    } catch (e) {
      results[feed.name] = `error: ${e.message}`;
    }
  }

  console.error("Feed results:", JSON.stringify(results, null, 2));
  console.error(`Total: ${allItems.length} semiconductor-related articles`);

  // Dedup by source_url
  const seen = new Set();
  const deduped = allItems.filter((item) => {
    if (item.source_url && seen.has(item.source_url)) return false;
    seen.add(item.source_url);
    return true;
  });

  console.error(`After dedup: ${deduped.length} articles`);

  // Output JSON to stdout (strip internal keywords_matched for push)
  const output = deduped.map(({ keywords_matched, ...rest }) => rest);
  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
