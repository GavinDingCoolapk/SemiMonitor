import { createClient } from "@libsql/client";
import fs from "fs";

const TURSO_URL = process.env.TURSO_URL || "libsql://semimonitor-gavindingcoolapk.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_TOKEN || "";

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

/**
 * Push data to Turso. Supports multiple types.
 * 
 * Usage:
 *   node push-to-turso.js --type news --file items.json
 *   node push-to-turso.js --type prices --file prices.json
 *   cat items.json | node push-to-turso.js --type news
 */

async function main() {
  let type = "news";
  let inputFile = null;

  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === "--type" && process.argv[i + 1]) {
      type = process.argv[++i];
    } else if (process.argv[i] === "--file" && process.argv[i + 1]) {
      inputFile = process.argv[++i];
    }
  }

  let raw = "";
  if (inputFile) {
    raw = fs.readFileSync(inputFile, "utf-8");
  } else {
    for await (const chunk of process.stdin) {
      raw += chunk;
    }
  }

  const items = JSON.parse(raw);
  if (!Array.isArray(items)) {
    console.error("Error: input must be a JSON array");
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  switch (type) {
    case "news":
      for (const item of items) {
        try {
          await db.execute({
            sql: `INSERT INTO news (title, source, url, published_at, created_at,
                                     category, relevance_level, sentiment,
                                     analysis_brief, supply_demand_impact,
                                     component_impact, company_impact,
                                     revenue_impact, margin_impact, stock_signal)
                  VALUES (?, ?, ?, ?, datetime('now'),
                          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              item.title || "",
              item.source || "unknown",
              item.url || item.source_url || "",
              item.published_at || null,
              item.category || null,
              item.relevance_level || null,
              item.sentiment || null,
              item.analysis_brief || null,
              item.supply_demand_impact || null,
              item.component_impact || null,
              item.company_impact || null,
              item.revenue_impact || null,
              item.margin_impact || null,
              item.stock_signal || null,
            ],
          });
          inserted++;
        } catch (e) {
          if (e.message?.includes("UNIQUE") || e.message?.includes("unique")) {
            skipped++;
          } else {
            console.error(`Error: ${(item.title || "").slice(0, 50)} — ${e.message}`);
          }
        }
      }
      break;

    case "prices":
      for (const item of items) {
        try {
          await db.execute({
            sql: `INSERT INTO price_data (product, price, change_pct, unit, date, created_at)
                  VALUES (?, ?, ?, ?, ?, datetime('now'))`,
            args: [
              item.product || "",
              item.price || null,
              item.change_pct || null,
              item.unit || "USD",
              item.date || null,
            ],
          });
          inserted++;
        } catch (e) {
          if (e.message?.includes("UNIQUE") || e.message?.includes("unique")) {
            skipped++;
          } else {
            console.error(`Error: ${item.product} — ${e.message}`);
          }
        }
      }
      break;

    default:
      console.error(`Unknown type: ${type}. Use: news, prices`);
      process.exit(1);
  }

  console.log(`[${type}] inserted=${inserted} skipped=${skipped}`);
}

main().catch((e) => console.error(e));
