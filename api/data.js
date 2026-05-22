import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;

function getClient() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('Missing TURSO_URL or TURSO_TOKEN env vars');
  }
  return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.query;

  try {
    const db = getClient();
    let data;

    switch (type) {
      case 'news':
        data = await db.execute({
          sql: `SELECT id, title, source, url, published_at, category, relevance_level, sentiment,
                       analysis_brief, supply_demand_impact, component_impact, company_impact,
                       revenue_impact, margin_impact, stock_signal
                FROM news
                ORDER BY published_at DESC
                LIMIT 100`,
          args: []
        });
        return res.status(200).json({ type: 'news', items: data.rows });

      case 'components':
        data = await db.execute({
          sql: `SELECT component_name, supply_status, demand_status, gap_direction,
                       impact_severity, last_updated, signal_count,
                       positive_signals, negative_signals
                FROM component_status
                ORDER BY last_updated DESC`,
          args: []
        });
        return res.status(200).json({ type: 'components', items: data.rows });

      case 'companies':
        data = await db.execute({
          sql: `SELECT company_name, ticker, category, sub_category, region,
                       latest_signal, sentiment, analysis_summary,
                       revenue_trend, margin_trend, stock_signal, last_updated
                FROM company_view
                ORDER BY last_updated DESC`,
          args: []
        });
        return res.status(200).json({ type: 'companies', items: data.rows });

      case 'prices':
        data = await db.execute({
          sql: `SELECT product, price, change_pct, unit, date
                FROM price_data
                ORDER BY date DESC
                LIMIT 50`,
          args: []
        });
        return res.status(200).json({ type: 'prices', items: data.rows });

      default:
        // Return all data at once
        const [news, components, companies, prices] = await Promise.all([
          db.execute({
            sql: `SELECT id, title, source, url, published_at, category, relevance_level,
                         sentiment, analysis_brief, supply_demand_impact, component_impact,
                         company_impact, revenue_impact, margin_impact, stock_signal
                  FROM news ORDER BY published_at DESC LIMIT 100`,
            args: []
          }),
          db.execute({
            sql: `SELECT component_name, supply_status, demand_status, gap_direction,
                         impact_severity, last_updated, signal_count,
                         positive_signals, negative_signals
                  FROM component_status ORDER BY last_updated DESC`,
            args: []
          }),
          db.execute({
            sql: `SELECT company_name, ticker, category, sub_category, region,
                         latest_signal, sentiment, analysis_summary,
                         revenue_trend, margin_trend, stock_signal, last_updated
                  FROM company_view ORDER BY last_updated DESC`,
            args: []
          }),
          db.execute({
            sql: `SELECT product, price, change_pct, unit, date
                  FROM price_data ORDER BY date DESC LIMIT 50`,
            args: []
          })
        ]);
        return res.status(200).json({
          news: news.rows,
          components: components.rows,
          companies: companies.rows,
          prices: prices.rows
        });
    }
  } catch (err) {
    console.error('Turso query error:', err);
    return res.status(500).json({ error: err.message });
  }
}
