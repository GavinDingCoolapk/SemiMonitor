import { createClient } from '@libsql/client';

// Database connection
const TURSO_URL = 'libsql://semimonitor-gavindingcoolapk.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5pXCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Nzk0MzY2MDEsImlkIjoiMDE5ZTRlYWYtNDkwMS03YmE3LWEzOTItOGY3ZWNkODVjY2JkIiwicmlkIjoiOGVmZDY3NTUtY2E0Mi00NGVhLTlkNDctNGFiYjg1ZDQyMjgxIn0.SdCSl4WMs9_qJN3aWAQGBPUbcxcRtuQwu6bEDGMH_vlKfDlgV8R814fzmqse_MA8PGxBUOg-P4XzXNuTDTPdAQ';

// Component and event classifications based on SPEC.md
const COMPONENTS = {
  gpu: { keywords: ['GPU', 'NVIDIA', 'B200', 'Blackwell', 'Rubin', 'MI350', 'RTX', 'A100', 'H100', 'H200'] },
  cpu: { keywords: ['CPU', 'Xeon', 'EPYC', 'Grace', 'ARM', 'Ryzen', 'Core'] },
  hbm: { keywords: ['HBM', 'HBM3E', 'HBM4', 'DRAM', 'high bandwidth memory', 'LPDDR'] },
  ssd: { keywords: ['SSD', 'NAND', 'flash memory', 'eSSD', 'solid state', '3D NAND'] },
  optical: { keywords: ['optical module', '800G', '1.6T', 'CPO', 'silicon photonics', 'DSP'] },
  network: { keywords: ['network chip', 'switch', 'NIC', 'DPU', 'Broadcom', 'Tomahawk'] },
  foundry: { keywords: ['TSMC', 'ASML', 'EUV', 'CoWoS', 'fab', 'wafer', 'lithography'] },
  eda: { keywords: ['EDA', 'IP', 'Synopsys', 'Cadence', 'Mentor Graphics', 'design tool'] },
  capex: { keywords: ['capex', 'hyperscaler', 'datacenter spending', 'cloud investment', 'AWS', 'Microsoft', 'Google', 'Meta'] },
  ml_model: { keywords: ['LLM', 'foundation model', 'GPT', 'Llama', 'MiniMax', '智谱', '大模型'] },
  pcb: { keywords: ['PCB', 'ABF substrate', 'printed circuit board', 'substrate'] },
  mlcc: { keywords: ['MLCC', 'ceramic capacitor', 'multilayer capacitor'] },
  power: { keywords: ['power supply', 'HVDC', 'liquid cooling', 'thermal management'] }
};

const EVENTS = {
  price_change: { keywords: ['price', 'cost', 'ASP', 'average selling price', '涨价', '降价', '价格'] },
  shipment_change: { keywords: ['shipment', 'inventory', 'inventory level', '出货', '库存', 'supply'] },
  capacity_expand: { keywords: ['capacity', 'expansion', 'investment', 'fab', '扩产', '产能', '投资'] },
  tech_breakthrough: { keywords: ['breakthrough', 'innovation', 'technology', '突破', '创新', '技术'] },
  customer_order: { keywords: ['order', 'contract', 'customer', '订单', '客户', 'win'] },
  earnings: { keywords: ['earnings', 'revenue', 'profit', '财报', '营收', '利润'] },
  regulation: { keywords: ['regulation', 'policy', 'tariff', 'ban', 'regulation', '政策', '关税'] },
  supply_chain: { keywords: ['supply chain', 'lead time', 'shortage', 'constraint', '供应链', '交期', '短缺'] },
  analyst_opinion: { keywords: ['analyst', 'rating', 'target price', 'expectation', '分析师', '评级', '目标价'] }
};

// Company mappings by component type
const COMPANY_MAPPINGS = {
  gpu: ['NVIDIA (NVDA)', 'AMD (AMD)', 'Intel (INTC)'],
  cpu: ['Intel (INTC)', 'AMD (AMD)', 'ARM (ARM)', 'Qualcomm (QCOM)'],
  hbm: ['SK Hynix (000660.KS)', 'Samsung (005930.KS)', 'Micron (MU)'],
  ssd: ['SanDisk (SNDK)', 'Western Digital (WDC)', 'Micron (MU)', 'SK Hynix (000660.KS)'],
  optical: ['Coherent (COHR)', 'Lumentum (LITE)', 'Cisco (CSCO)'],
  network: ['Broadcom (AVGO)', 'Marvell (MRVL)', 'NVIDIA (NVDA)'],
  foundry: ['TSMC (TSM)', 'UMC (2303.TW)'],
  eda: ['Synopsys (SNPS)', 'Cadence (CDNS)'],
  capex: ['Microsoft', 'Google', 'Meta', 'AWS'],
  ml_model: ['MiniMax', '智谱 AI'],
  pcb: ['Unknown'],
  mlcc: ['Unknown'],
  power: ['Texas Instruments (TXN)', 'Unknown']
};

function getClient() {
  return createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
}

function classifyNews(title, text) {
  const content = (title + ' ' + text).toLowerCase();
  
  // Check if news is semiconductor-related
  const isSemiconductor = Object.values(COMPONENTS).some(comp => 
    comp.keywords.some(keyword => content.includes(keyword.toLowerCase()))
  );
  
  if (!isSemiconductor) {
    return { category: 'irrelevant', component: null, event: null };
  }
  
  // Classify component type
  let component = null;
  let maxMatches = 0;
  
  for (const [compType, compData] of Object.entries(COMPONENTS)) {
    const matches = compData.keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    ).length;
    
    if (matches > maxMatches) {
      maxMatches = matches;
      component = compType;
    }
  }
  
  // Classify event type
  let event = null;
  maxMatches = 0;
  
  for (const [eventType, eventData] of Object.entries(EVENTS)) {
    const matches = eventData.keywords.filter(keyword => 
      content.includes(keyword.toLowerCase())
    ).length;
    
    if (matches > maxMatches) {
      maxMatches = matches;
      event = eventType;
    }
  }
  
  return { category: 'semiconductor', component, event };
}

function analyzeSupplyDemandImpact(news) {
  const content = (news.title + ' ' + news.text_full).toLowerCase();
  const component = news.component_type;
  
  // This is a simplified analysis - in production, this would be more sophisticated
  let impact = { direction: 'neutral', magnitude: 'moderate', reasoning: 'Need more detailed analysis' };
  
  if (component === 'gpu') {
    if (content.includes('order') || content.includes('demand') || content.includes('采购')) {
      impact = { direction: 'up', magnitude: 'significant', reasoning: 'Increased GPU demand detected' };
    } else if (content.includes('price cut') || content.includes('降价') || content.includes('oversupply')) {
      impact = { direction: 'down', magnitude: 'moderate', reasoning: 'Potential GPU oversupply' };
    }
  } else if (component === 'hbm') {
    if (content.includes('shortage') || content.includes('缺货') || content.includes('tight')) {
      impact = { direction: 'up', magnitude: 'significant', reasoning: 'HBM supply shortage continues' };
    } else if (content.includes('capacity') || content.includes('扩产') || content.includes('production')) {
      impact = { direction: 'down', magnitude: 'moderate', reasoning: 'HBM capacity expansion announced' };
    }
  } else if (component === 'ssd') {
    if (content.includes('price') && (content.includes('increase') || content.includes('上涨'))) {
      impact = { direction: 'up', magnitude: 'moderate', reasoning: 'SSD prices increasing' };
    } else if (content.includes('price') && (content.includes('decrease') || content.includes('下降'))) {
      impact = { direction: 'down', magnitude: 'moderate', reasoning: 'SSD prices decreasing' };
    }
  }
  
  return impact;
}

function analyzeCompanyImpact(news) {
  const component = news.component_type;
  const companies = COMPANY_MAPPINGS[component] || [];
  
  let impact = { companies, revenue: 'neutral', margin: 'neutral', reasoning: 'Limited impact assessment' };
  
  // Simplified impact assessment
  if (component === 'gpu') {
    impact.revenue = 'up';
    impact.margin = 'up';
    impact.reasoning = 'Strong GPU demand typically benefits NVIDIA and AMD';
  } else if (component === 'hbm') {
    impact.revenue = 'up';
    impact.margin = 'neutral';
    impact.reasoning = 'HBM demand growth benefits memory makers but margins may be pressured by capacity expansion';
  } else if (component === 'ssd') {
    impact.revenue = 'neutral';
    impact.margin = 'down';
    impact.reasoning = 'SSD market facing competitive pressure on margins';
  }
  
  return impact;
}

function stockSignal(news) {
  const component = news.component_type;
  const impact = news.supply_demand_impact;
  
  // Simplified stock signal logic
  if (impact.direction === 'up') {
    return { signal: 'bullish', confidence: 'medium', reasoning: 'Positive supply-demand balance suggests upside potential' };
  } else if (impact.direction === 'down') {
    return { signal: 'bearish', confidence: 'medium', reasoning: 'Negative supply-demand balance suggests downside risk' };
  } else {
    return { signal: 'neutral', confidence: 'low', reasoning: 'Neutral market conditions' };
  }
}

function generateAnalysisBrief(news) {
  const component = news.component_type;
  const event = news.event_type;
  const impact = news.supply_demand_impact;
  const companies = news.company_impact;
  const stock = news.stock_signal;
  
  return `${component.toUpperCase()}/${event.toUpperCase()}: ${impact.direction} ${impact.magnitude} - ${companies.reasoning} - ${stock.signal} (${stock.confidence})`;
}

async function analyzeNewsItem(news) {
  // Step 1: Classify the news
  const classification = classifyNews(news.title, news.text_full);
  
  if (classification.category === 'irrelevant') {
    return {
      id: news.id,
      category: 'irrelevant',
      component_type: null,
      event_type: null,
      relevance_level: 'low',
      sentiment: 'neutral',
      analysis_brief: 'Not semiconductor-related',
      supply_demand_impact: null,
      component_impact: null,
      company_impact: null,
      revenue_impact: null,
      margin_impact: null,
      stock_signal: null
    };
  }
  
  // Step 2: Analyze supply-demand impact
  const supplyDemandImpact = analyzeSupplyDemandImpact({
    ...news,
    component_type: classification.component,
    event_type: classification.event
  });
  
  // Step 3: Analyze company impact
  const companyImpact = analyzeCompanyImpact({
    ...news,
    component_type: classification.component,
    event_type: classification.event,
    supply_demand_impact: supplyDemandImpact
  });
  
  // Step 4: Generate stock signal
  const stockSignal = stockSignal({
    ...news,
    component_type: classification.component,
    event_type: classification.event,
    supply_demand_impact: supplyDemandImpact,
    company_impact: companyImpact
  });
  
  // Step 5: Generate analysis brief
  const analysisBrief = generateAnalysisBrief({
    ...news,
    component_type: classification.component,
    event_type: classification.event,
    supply_demand_impact: supplyDemandImpact,
    company_impact: companyImpact,
    stock_signal: stockSignal
  });
  
  return {
    id: news.id,
    category: 'semiconductor',
    component_type: classification.component,
    event_type: classification.event,
    relevance_level: supplyDemandImpact.magnitude === 'significant' ? 'high' : 'medium',
    sentiment: supplyDemandImpact.direction === 'up' ? 'positive' : supplyDemandImpact.direction === 'down' ? 'negative' : 'neutral',
    analysis_brief: analysisBrief,
    supply_demand_impact: `${supplyDemandImpact.direction} ${supplyDemandImpact.magnitude}`,
    component_impact: classification.component,
    company_impact: companyImpact.companies.slice(0, 3).join(', '), // Top 3 companies
    revenue_impact: companyImpact.revenue,
    margin_impact: companyImpact.margin,
    stock_signal: `${stockSignal.signal} (${stockSignal.confidence})`
  };
}

export async function analyzeNewsFromTurso() {
  const db = getClient();
  
  try {
    // Fetch news from last 3 hours that needs analysis
    const result = await db.execute({
      sql: `SELECT id, title, text_full, source, source_type 
            FROM news 
            WHERE analysis_brief IS NULL 
            AND published_at > datetime('now', '-3 hours') 
            LIMIT 50`,
      args: []
    });
    
    const newsItems = result.rows;
    console.log(`Found ${newsItems.length} news items to analyze`);
    
    let analyzedCount = 0;
    let irrelevantCount = 0;
    
    for (const news of newsItems) {
      console.log(`Analyzing news: ${news.title.substring(0, 50)}...`);
      
      const analysis = await analyzeNewsItem(news);
      
      // Update the database with analysis results
      await db.execute({
        sql: `UPDATE news 
              SET category=?, 
                  relevance_level=?, 
                  sentiment=?, 
                  analysis_brief=?, 
                  supply_demand_impact=?, 
                  component_impact=?, 
                  company_impact=?, 
                  revenue_impact=?, 
                  margin_impact=?, 
                  stock_signal=? 
              WHERE id=?`,
        args: [
          analysis.category,
          analysis.relevance_level,
          analysis.sentiment,
          analysis.analysis_brief,
          analysis.supply_demand_impact,
          analysis.component_impact,
          analysis.company_impact,
          analysis.revenue_impact,
          analysis.margin_impact,
          analysis.stock_signal,
          analysis.id
        ]
      });
      
      if (analysis.category === 'irrelevant') {
        irrelevantCount++;
      } else {
        analyzedCount++;
      }
      
      console.log(`Completed analysis for: ${news.title.substring(0, 50)}...`);
    }
    
    return {
      total: newsItems.length,
      analyzed: analyzedCount,
      irrelevant: irrelevantCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error analyzing news:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run analysis if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeNewsFromTurso()
    .then(result => {
      console.log('Analysis completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}