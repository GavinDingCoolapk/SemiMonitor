import { createClient } from "@libsql/client";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";

const configPath = new URL("../config/sources.json", import.meta.url).pathname;
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const db = createClient({
  url: config.turso.url,
  authToken: config.turso.authToken,
});

/**
 * Write raw news to Turso.
 * Expects input JSON: array of { title, source, source_url, published_at }
 * from stdin or file path argument.
 */
async function main() {
  const inputFile = process.argv[2];
  let raw = "";

  if (inputFile) {
    raw = fs.readFileSync(inputFile, "utf-8");
  } else {
    // Read from stdin
    for await (const chunk of process.stdin) {
      raw += chunk;
    }
  }

  const items = JSON.parse(raw);
  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      await db.execute({
        sql: `INSERT INTO news (title, source, source_url, published_at, created_at)
              VALUES (?, ?, ?, ?, datetime('now'))`,
        args: [
          item.title || "",
          item.source || "unknown",
          item.source_url || "",
          item.published_at || null,
        ],
      });
      inserted++;
    } catch (e) {
      if (e.message && (e.message.includes("UNIQUE") || e.message.includes("unique"))) {
        skipped++;
      } else {
        console.error(`Error inserting "${item.title?.slice(0, 50)}":`, e.message);
      }
    }
  }

  console.log(`Pushed ${inserted} news, skipped ${skipped} duplicates`);
}

main().catch((e) => console.error(e));
