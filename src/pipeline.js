#!/usr/bin/env node
/**
 * SemiMonitor — Main Collector Pipeline
 * 
 * Runs all collectors, performs analysis, pushes to Turso.
 * Designed to be called by cron (macOS launchd).
 * 
 * Usage:
 *   node src/pipeline.js [--collectors rss,twitter,arxiv,prices] [--dry-run]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const TURSO_URL = process.env.TURSO_URL || 'libsql://semimonitor-gavindingcoolapk.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_TOKEN || '';

const COLLECTORS = {
  rss: { cmd: 'node', script: 'src/collectors/rss.js', output: 'rss' },
  twitter: { cmd: 'python3', script: 'src/collectors/twitter.py', output: 'tweets' },
  arxiv: { cmd: 'python3', script: 'src/collectors/arxiv.py', output: 'papers' },
  prices: { cmd: 'python3', script: 'src/collectors/prices.py', output: 'prices' },
};

// ─── Helpers ───
function log(msg) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${ts}] ${msg}`);
}

function runCollector(name, dryRun) {
  const collector = COLLECTORS[name];
  if (!collector) throw new Error(`Unknown collector: ${name}`);

  log(`Running collector: ${name}`);

  const env = { ...process.env, PATH: process.env.PATH };
  if (name === 'twitter') {
    env.X_AUTH_TOKEN = process.env.X_AUTH_TOKEN || '';
    env.X_PROXY = process.env.X_PROXY || 'http://127.0.0.1:7897';
  }

  const scriptPath = path.join(ROOT, collector.script);
  if (!fs.existsSync(scriptPath)) {
    log(`  ⚠️ Script not found: ${scriptPath}`);
    return null;
  }

  try {
    const result = execSync(
      `${collector.cmd} "${scriptPath}"`,
      { cwd: ROOT, env, timeout: 120000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const data = JSON.parse(result);
    const key = collector.output || 'count';
    const count = Array.isArray(data[key]) ? data[key].length : (data.count || '?');
    log(`  ✓ ${name}: ${count} items`);
    return data;
  } catch (err) {
    log(`  ✗ ${name}: ${err.message?.substring(0, 100)}`);
    return null;
  }
}

function pushToTurso(type, items) {
  if (!items || items.length === 0) return;

  // Delegate to push-to-turso.js
  const pushScript = path.join(ROOT, 'src/output/push-to-turso.js');
  if (!fs.existsSync(pushScript)) {
    log(`  ⚠️ push-to-turso.js not found`);
    return;
  }

  const tmpFile = `/tmp/semi-${type}-${Date.now()}.json`;
  fs.writeFileSync(tmpFile, JSON.stringify(items, null, 2));

  try {
    execSync(
      `node "${pushScript}" --type ${type} --file "${tmpFile}"`,
      { env: { ...process.env, TURSO_URL, TURSO_TOKEN }, timeout: 60000, encoding: 'utf-8', stdio: 'pipe' }
    );
    log(`  ✓ Pushed ${items.length} ${type} items to Turso`);
  } catch (err) {
    log(`  ✗ Push ${type} failed: ${err.message?.substring(0, 100)}`);
  }

  try { fs.unlinkSync(tmpFile); } catch (_) {}
}

// ─── Main ───
async function main() {
  const args = process.argv.slice(2);
  let collectorsArg = 'rss,twitter,arxiv,prices';
  const dryRun = args.includes('--dry-run');

  for (const arg of args) {
    if (arg.startsWith('--collectors=')) {
      collectorsArg = arg.split('=')[1];
    }
  }

  const collectors = collectorsArg.split(',').filter(c => COLLECTORS[c]);
  log(`SemiMonitor pipeline started [collectors: ${collectors.join(', ')}${dryRun ? ', dry-run' : ''}]`);

  const results = {};
  for (const name of collectors) {
    results[name] = runCollector(name, dryRun);
  }

  if (dryRun) {
    log('Dry run — skipping Turso push');
    log(JSON.stringify(results, null, 2));
    return;
  }

  // Push to Turso
  log('Pushing to Turso...');
  
  if (results.rss) {
    pushToTurso('news', results.rss.news || []);
  }
  if (results.twitter) {
    pushToTurso('news', (results.twitter.tweets || []).map(t => ({
      title: t.title || t.text_full?.substring(0, 200),
      source: t.source,
      url: t.url,
      published_at: t.published_at || t.collected_at,
      // Analysis fields left empty — will be filled by Darren cron
      category: 'twitter',
      relevance_level: null,
      sentiment: null,
      analysis_brief: null,
      supply_demand_impact: null,
      component_impact: null,
      company_impact: null,
      revenue_impact: null,
      margin_impact: null,
      stock_signal: null,
    })));
  }
  if (results.arxiv) {
    pushToTurso('news', (results.arxiv.papers || []).map(p => ({
      title: p.title,
      source: p.source,
      url: p.url,
      published_at: p.published_at,
      category: 'arxiv',
      relevance_level: null,
      sentiment: null,
      analysis_brief: p.text_full || '',
      supply_demand_impact: null,
      component_impact: null,
      company_impact: null,
      revenue_impact: null,
      margin_impact: null,
      stock_signal: null,
    })));
  }
  if (results.prices) {
    const prices = results.prices.prices || results.prices || [];
    if (prices.length > 0) pushToTurso('prices', prices);
  }

  log('Pipeline complete');
}

main().catch(err => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
