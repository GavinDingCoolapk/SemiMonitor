#!/usr/bin/env node
/**
 * SemiMonitor Collector Daemon
 * 
 * Runs continuously as a background process.
 * RSS/Twitter: every 1 hour
 * arXiv/Prices: every 24 hours
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;
const X_AUTH_TOKEN = process.env.X_AUTH_TOKEN;
const X_PROXY = process.env.X_PROXY || 'http://127.0.0.1:7897';

const INTERVALS = {
  rss:      60 * 60 * 1000,   // 1 hour
  twitter:  60 * 60 * 1000,   // 1 hour
  arxiv:    24 * 60 * 60 * 1000, // 24 hours
  prices:   24 * 60 * 60 * 1000, // 24 hours
};

const lastRun = { rss: 0, twitter: 0, arxiv: 0, prices: 0 };

function log(msg) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${ts}] ${msg}`);
}

function runCollector(name) {
  let cmd, env;
  const baseEnv = {
    ...process.env,
    PATH: process.env.PATH,
    TURSO_URL,
    TURSO_TOKEN,
  };

  switch (name) {
    case 'rss':
      cmd = `node "${path.join(ROOT, 'src/collectors/rss.js')}"`;
      env = baseEnv;
      break;
    case 'twitter':
      cmd = `python3 "${path.join(ROOT, 'src/collectors/twitter.py')}"`;
      env = { ...baseEnv, X_AUTH_TOKEN, X_PROXY };
      break;
    case 'arxiv':
      cmd = `python3 "${path.join(ROOT, 'src/collectors/arxiv.py')}"`;
      env = baseEnv;
      break;
    case 'prices':
      cmd = `python3 "${path.join(ROOT, 'src/collectors/prices.py')}"`;
      env = baseEnv;
      break;
    case 'acm_conf':
      cmd = `python3 "${path.join(ROOT, 'src/collectors/acm_conferences.py')}"`;
      env = baseEnv;
      break;
  }

  try {
    const result = execSync(cmd, {
      cwd: ROOT, env, timeout: 120000,
      encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe']
    });
    const data = JSON.parse(result);
    let count = '?';
    if (Array.isArray(data)) count = data.length;
    else if (data.news) count = data.news.length;
    else if (data.tweets) count = data.tweets.length;
    else if (data.papers) count = data.papers.length;
    else if (data.prices) count = data.prices.length;
    else if (data.count !== undefined) count = data.count;
    log(`✓ ${name}: ${count} items`);
    return data;
  } catch (err) {
    log(`✗ ${name}: ${err.message?.substring(0, 80)}`);
    return null;
  }
}

function pushToTurso(type, items) {
  if (!items || items.length === 0) return;
  const pushScript = path.join(ROOT, 'src/output/push-to-turso.js');
  const tmpFile = `/tmp/semi-${type}-${Date.now()}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(items, null, 2));
  try {
    execSync(`node "${pushScript}" --type ${type} --file "${tmpFile}"`, {
      env: { ...process.env, TURSO_URL, TURSO_TOKEN },
      timeout: 60000, encoding: 'utf-8', stdio: 'pipe'
    });
    log(`  → Pushed ${items.length} ${type} to Turso`);
  } catch (err) {
    log(`  → Push failed: ${err.message?.substring(0, 60)}`);
  }
  try { fs.unlinkSync(tmpFile); } catch (_) {}
}

function processResults(name, data) {
  switch (name) {
    case 'rss':
      if (data.news) pushToTurso('news', data.news);
      break;
    case 'twitter':
      if (data.tweets) {
        pushToTurso('news', data.tweets.map(t => ({
          title: t.title || t.text_full?.substring(0, 200),
          source: t.source, url: t.url,
          published_at: t.published_at || t.collected_at,
          category: 'twitter',
        })));
      }
      break;
    case 'arxiv':
      if (data.papers) {
        pushToTurso('news', data.papers.map(p => ({
          title: p.title, source: p.source, url: p.url,
          published_at: p.published_at, category: 'arxiv',
          analysis_brief: p.text_full || '',
        })));
      }
      break;
    case 'prices':
      if (data.prices) pushToTurso('prices', data.prices);
      break;
    case 'acm_conf':
      if (data.papers) {
        pushToTurso('news', data.papers.map(p => ({
          title: p.title, source: p.source, url: p.url,
          published_at: p.published_at, category: 'acm_conference',
          analysis_brief: p.text_full || '',
        })));
      }
      break;
  }
}

// Main loop
log('SemiMonitor collector daemon started');
log(`Schedule: RSS/Twitter every 1h, arXiv/prices/ACM every 24h`);

// Run all immediately on start
for (const name of ['rss', 'twitter', 'arxiv', 'prices', 'acm_conf']) {
  log(`Running ${name} (initial)...`);
  const data = runCollector(name);
  if (data) processResults(name, data);
  lastRun[name] = Date.now();
}

setInterval(() => {
  const now = Date.now();
  for (const [name, interval] of Object.entries(INTERVALS)) {
    if (now - lastRun[name] >= interval) {
      log(`Running ${name}...`);
      const data = runCollector(name);
      if (data) processResults(name, data);
      lastRun[name] = Date.now();
    }
  }
}, 60000); // check every minute
