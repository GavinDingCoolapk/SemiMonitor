-- analysis_chain: stores the 6-layer transmission chain for each news item
CREATE TABLE IF NOT EXISTS analysis_chain (
  news_id INTEGER PRIMARY KEY REFERENCES news(id) ON DELETE CASCADE,
  
  -- L1: Event
  event_summary TEXT NOT NULL DEFAULT '',
  event_type TEXT DEFAULT '',        -- capacity_expand, earnings, tech_breakthrough, supply_chain, etc.
  event_side TEXT DEFAULT '',         -- supply / demand / mixed / neutral
  
  -- L2: Supply-Demand Impact
  sd_impact TEXT DEFAULT '',          -- 供不应求 / 供过于求 / 平衡
  sd_direction TEXT DEFAULT '',       -- ↑ / ↓ / →
  sd_severity TEXT DEFAULT '',        -- significant / moderate / slight
  sd_detail TEXT DEFAULT '',          -- detailed explanation
  
  -- L3: Product Indicators
  shipment_dir TEXT DEFAULT '',       -- ↑ / ↓ / →
  shipment_detail TEXT DEFAULT '',
  asp_dir TEXT DEFAULT '',            -- ↑ / ↓ / →
  asp_detail TEXT DEFAULT '',
  cost_dir TEXT DEFAULT '',           -- ↑ / ↓ / →
  cost_detail TEXT DEFAULT '',
  
  -- L4: Company Financial
  revenue_dir TEXT DEFAULT '',        -- ↑ / ↓ / →
  revenue_detail TEXT DEFAULT '',
  margin_dir TEXT DEFAULT '',         -- ↑ / ↓ / →
  margin_detail TEXT DEFAULT '',
  
  -- L5: Stock Signal
  stock_signal TEXT DEFAULT '',       -- bullish / bearish / neutral
  stock_reason TEXT DEFAULT '',       -- 核心理由 (1-2句)
  
  -- L6: Component Mapping
  components TEXT DEFAULT '[]',       -- JSON array: ["gpu", "hbm", ...]
  companies TEXT DEFAULT '[]',        -- JSON array: ["NVIDIA", "TSMC", ...]
  
  -- Meta
  analyzed_at TEXT DEFAULT (datetime('now')),
  analyst TEXT DEFAULT 'darren'
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_chain_signal ON analysis_chain(stock_signal);
CREATE INDEX IF NOT EXISTS idx_chain_components ON analysis_chain(components);
