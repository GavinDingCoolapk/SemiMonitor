# SemiMonitor — 半导体行业监测站

> Kepler22B 研究基础设施
> 创建时间：2026-05-22
> 状态：设计阶段，待确认

---

## 一、项目概述

半导体行业监测站，通过采集行业媒体、学术网站、社交媒体等信源，对半导体产品供需关系进行定性分析，推导相关公司出货量/ASP/成本/营收/毛利率趋势，最终给出股价方向判断。

**核心逻辑链条：**
```
新闻采集 → 信号分类 → 供需分析 → 公司指标传导 → 股价判断
```

---

## 二、信息采集层

### 2.1 数据源

| 数据源类型 | 具体来源 | 采集方式 | 频率 |
|-----------|---------|---------|------|
| **行业媒体 RSS** | 见 2.2 节完整清单 | RSS Parser | 每 1 小时 |
| **学术网站** | arXiv (cs.AR, cs.LG, eess.SP) | arXiv API | 每日 |
| **社交媒体** | X/Twitter 分析师账号（见 2.3 节） | 爬虫/API | 每 1 小时 |
| **价格数据** | TrendForce DRAMeXchange | 爬虫 | 每天 |
| **财报/SEC** | NVIDIA, TSMC, SK Hynix 等季度报告 | 事件驱动 | 季度 |

### 2.2 RSS 源清单

<!-- 合并现有 kepler-monitor 的 RSS 源 + 新增半导体源 -->

**现有 kepler-monitor 已验证源（15 个）：**
- [x] StorageReview: `https://www.storagereview.com/feed`
- [x] StorageNewsletter: `https://www.storagenewsletter.com/feed/`
- [x] SemiEngineering: `https://semiengineering.com/feed/`
- [x] SemiAnalysis Substack: `https://semianalysis.substack.com/feed`
- [x] TechPowerUp: `https://www.techpowerup.com/rss/news`
- [x] SSD Review: `https://www.thessdreview.com/feed/`
- [x] Backblaze Blog: `https://www.backblaze.com/blog/feed/`
- [x] TrendForce Semiconductors: `https://www.trendforce.com/feed/Semiconductors.html`
- [x] Samsung News: `https://news.samsung.com/global/feed`
- [x] Tom's Hardware: `https://www.tomshardware.com/feeds/all`
- [x] EE Times: `https://www.eetimes.com/feed/`
- [x] Digitimes: `https://www.digitimes.com/rss/daily.xml`
- [x] SemiWiki: `https://semiwiki.com/feed/`
- [x] Bloomberg Technology: `https://feeds.bloomberg.com/technology/news.rss`
- [x] Thelec: `https://www.thelec.net/rss/allArticle.xml`


### 2.3 X/Twitter 分析师账号

✅ **采集方案已验证**：使用 [Scweet](https://github.com/Altimis/Scweet) 库，通过 browser cookie 调用 X 内部 GraphQL API，免费、无需官方 API key。

**目标账号清单（6 个）：**
- [x] @karpathy (Karpathy, 前 Tesla AI 总监)
- [x] @LinQingV (芯片猎头林庆)
- [x] @mingchikuo (郭明錤, 天风国际分析师)
- [x] @Zai_org (智谱 AI)
- [x] @xiaomustock (小米相关)
- [x] @qinbafrank (半导体相关)

**技术细节：**
- 工具：Python `Scweet` 库
- 认证：`auth_token` cookie（从浏览器提取）
- 代理：通过本地 Clash (127.0.0.1:7897) 访问
- 频率限制：单账号每天可抓数百到数千条
- ⚠️ cookie 会过期，需定期刷新
- ⚠️ 不要用个人主账号，建议用小号

### 2.4 关键词配置（待调整）

每个组件类型对应一组关键词，用于过滤半导体相关新闻：

```json
{
  "gpu": ["GPU", "NVIDIA", "B200", "Blackwell", "Rubin", "MI350", ...],
  "cpu": ["CPU", "Xeon", "EPYC", "Grace", ...],
  "hbm": ["HBM", "HBM3E", "HBM4", "DRAM", ...],
  "ssd": ["SSD", "NAND", "flash memory", "eSSD", ...],
  "optical": ["optical module", "800G", "1.6T", "CPO", ...],
  "network": ["network chip", "switch", "NIC", "DPU", "Broadcom", ...],
  "foundry": ["TSMC", "ASML", "EUV", "CoWoS", "fab", ...],
  "capex": ["capex", "hyperscaler", "datacenter spending", ...],
  "ml_model": ["LLM", "foundation model", "GPT", "Llama", ...],
  "pcb": ["PCB", "ABF substrate", ...],
  "mlcc": ["MLCC", "ceramic capacitor", ...],
  "power": ["power supply", "HVDC", "liquid cooling", ...]
}
```

---

## 三、分析框架

### 3.1 信号分类标签

**组件标签（component_type）：**

| 标签 | 含义 | 示例 |
|------|------|------|
| `gpu` | GPU / AI 加速器 | NVIDIA B200, AMD MI350 |
| `cpu` | CPU / SoC | Intel Xeon, AMD EPYC, ARM |
| `hbm` | 高带宽内存 | SK Hynix HBM3E, HBM4 |
| `ssd` | 固态硬盘 / NAND | SanDisk, WD, 美光 9550 |
| `optical` | 光模块 / 光器件 | 800G OSFP, 1.6T, CPO |
| `network` | 网络芯片 | Broadcom Tomahawk, NVIDIA ConnectX |
| `foundry` | 代工 / 封装 | TSMC, ASML EUV, CoWoS |
| `eda` | EDA / IP | Synopsys, Cadence |
| `capex` | 云厂商资本开支 | Microsoft, Google, Meta, AWS |
| `ml_model` | AI 模型 / 推理需求 | GPT, Llama, MiniMax, 智谱 |
| `analog` | 模拟/接口/特种 | TI, 澜起科技 |
| `laser` | 激光器 | Lumentum, Coherent |
| `substrate` | 衬底材料 | 硅晶圆, 锗 |

<!-- TODO: Gavin 确认分类是否需要增减 -->

**事件标签（event_type）：**

| 标签 | 含义 |
|------|------|
| `price_change` | 价格变动 |
| `shipment_change` | 出货量变动 |
| `capacity_expand` | 产能扩张/收缩 |
| `tech_breakthrough` | 技术突破/路线变更 |
| `customer_order` | 客户订单/失去订单 |
| `earnings` | 财报/法说会 |
| `regulation` | 法规/政策 |
| `supply_chain` | 供应链事件（缺料/良率/设备） |
| `analyst_opinion` | 分析师观点 |

**影响方向（impact）：**

| 值 | 含义 |
|----|------|
| `bullish` | 利好 |
| `bearish` | 利空 |
| `neutral` | 中性 |

### 3.2 逻辑传导链条

**第一性原理：供需关系决定一切。**

所有分析围绕一个核心问题展开：**这个事件改变了什么产品的供给或需求？改变了多少？传导到哪些公司的出货量/ASP/成本？最终如何影响营收和毛利率？**

#### 完整传导链（6 层）

```
Layer 1: 原始事件
  │
  │  一条新闻/财报/分析师观点
  │
  ▼
Layer 2: 供需影响判断
  │
  │  这个事件改变了什么？
  │  ├── 影响哪个产品？（GPU/HBM/SSD/光模块/...）
  │  ├── 影响供给侧还是需求侧？
  │  └── 影响幅度？（显著/温和/微弱）
  │
  ▼
Layer 3: 供给 vs 需求
  │
  │  供给侧信号：
  │  ├── 扩产新闻（购买光刻设备、建造清洁室、新建 Fab）
  │  ├── 良率变化（良率提升 = 供给增加，良率下降 = 供给减少）
  │  ├── 封装产能（CoWoS 排队长短）
  │  ├── 设备交期（ASML 交期拉长 = 供给瓶颈）
  │  ├── 原材料/零部件短缺（如 HBM 用的 TSV 载板不足）
  │  └── 地缘政治/制裁（限制出口 = 供给减少）
  │
  │  需求侧信号：
  │  ├── 云厂商 Capex（微软/谷歌/Meta/AWS 资本开支）
  │  ├── 模型厂商动态（新模型发布、模型规模增长）
  │  ├── 算法/架构优化（MoE、量化、稀疏化 → 单位算力效率提升 → 可能减少硬件需求）
  │  ├── 推理需求增长（应用落地、用户增长）
  │  ├── 终端产品销量（AI PC、AI 手机出货量）
  │  └── 库存水位（渠道库存高 = 短期需求减弱）
  │
  │  供需判断：
  │  ├── 供不应求 → ASP 上涨动力
  │  ├── 供过于求 → ASP 下跌压力
  │  └── 供需平衡 → ASP 稳定
  │
  ▼
Layer 4: 产品指标（出货量 / ASP / 生产成本）
  │
  │  出货量驱动：
  │  ├── 需求拉动（下游 Capex↑、新模型↑、应用落地↑）
  │  ├── 供给约束（产能不足、良率低、设备短缺 → 限制出货上限）
  │  └── 库存周期（补库存↑、去库存↓）
  │
  │  ASP 驱动：
  │  ├── 供需格局（供不应求→涨价，供过于求→跌价）
  │  ├── 产品组合（高端产品占比↑ → 平均 ASP↑）
  │  └── 技术代际（新一代产品通常 ASP 更高）
  │
  │  生产成本驱动：
  │  ├── 良率（良率↑ → 单位成本↓）
  │  ├── 产能利用率（产能利用率↑ → 摊薄固定成本 → 单位成本↓）
  │  ├── 原材料价格（硅片、贵金属、稀土等）
  │  ├── 规模效应（出货量↑ → 学习曲线 → 成本↓）
  │  └── 技术改进（新工艺降低制造成本）
  │
  ▼
Layer 5: 公司财务指标（营业收入 / 毛利率）
  │
  │  营业收入 = 出货量 × ASP × 市场份额
  │
  │  毛利率驱动：
  │  ├── ASP vs 单位成本（ASP↑ + 成本↓ = 毛利率大幅提升）
  │  ├── 产品组合（高毛利产品占比↑ → 整体毛利率↑）
  │  ├── 产能利用率（产能利用率↑ → 毛利率↑，拐点约 85%）
  │  └── 竞争格局（寡头垄断 = 毛利率高，竞争加剧 = 毛利率承压）
  │
  ▼
Layer 6: 股价判断
  │
  │  综合判断：
  │  ├── 营收增速 vs 市场一致预期（预期差 = Alpha 来源）
  │  ├── 毛利率趋势（扩张/收缩/稳定）
  │  ├── 关键催化事件（新产品发布、大客户订单、并购等）
  │  └── 风险因素（地缘政治、技术替代、需求萎缩等）
  │
  │  输出：看涨 / 看跌 / 中性 + 核心理由（1-2 句）
```

#### 分析每条新闻时的固定流程

对每条新闻，按以下步骤输出分析：

1. **分类**：属于哪个组件？哪个事件类型？
2. **供需影响**：影响供给还是需求？方向（↑/↓/→）？幅度（显著/温和/微弱）？
3. **产品指标**：对出货量/ASP/成本的影响方向？
4. **公司映射**：这条新闻关联哪些公司？
5. **财务传导**：对关联公司的营收/毛利率影响方向？
6. **股价判断**：看涨/看跌/中性？核心理由？

#### 传导链示例

**示例 1：SK海力士宣布投资 80 亿美元在美国建 HBM 工厂**
```
L1 事件：SK海力士 $80 亿美国 HBM 工厂
L2 供需：HBM 供给侧增加（2028 量产，中长期）
L3 供需：中长期缓解供给瓶颈，短期无影响；HBM 份额巩固
L4 出货量：→（短期），↑（中长期）
L4 ASP：→（短期），↓温和（中长期，供给增加）
L4 成本：↓（美国工厂成本更高，初期）
L5 营收：↑（出货量增长弥补 ASP 温和下降）
L5 毛利率：↓温和（美国工厂初期良率低 + 成本高）
L6 股价：中性（短期无变化，中长期供需格局改善但毛利率承压对冲）
```

**示例 2：Meta 宣布建设 35 万卡 GPU 训练集群**
```
L1 事件：Meta 35 万卡 GPU 训练集群
L2 供需：GPU 需求大幅增加，同时拉动 HBM/光模块/网络芯片需求
L3 供需：GPU/HBM 供不应求加剧
L4 出货量：↑显著（NVIDIA、Broadcom、光模块厂商）
L4 ASP：↑（供需紧张，GPU/HBM ASP 有上行空间）
L4 成本：→（规模效应可摊薄部分成本）
L5 营收：↑显著（NVIDIA/Broadcom/Coherent 出货量 × ASP 双升）
L5 毛利率：↑（产能利用率维持高位 + ASP 上行）
L6 股价：看涨（需求超预期，直接利好 GPU 产业链）
```

**示例 3：某模型厂商发布 MoE 架构优化，推理效率提升 3 倍**
```
L1 事件：MoE 架构优化，推理效率↑3x
L2 供需：单位推理所需 GPU 减少 → GPU 需求可能下降
L3 供需：短期无影响（存量模型不变），中期可能减少 GPU 增量需求
L4 出货量：→（短期），↓温和（中期，如果大规模采用）
L4 ASP：→（供需格局短期不变）
L4 成本：→
L5 营收：→（短期），↓温和（中期）
L5 毛利率：→
L6 股价：中性（短期），需观察采用广度（中期变量太多）
```

### 3.3 公司分类

**1. AI 芯片（GPU / 加速器）**
- NVIDIA (NVDA)

**2. CPU / SoC**
- Intel (INTC)
- AMD (AMD)
- ARM (ARM)
- Qualcomm (QCOM)

**3. ASIC / 定制芯片**
- Broadcom (AVGO)
- Marvell (MRVL)

**4. 存储（DRAM / NAND / HBM）**
- SK Hynix (000660.KS)
- Samsung (005930.KS)
- Micron (MU)
- SanDisk (SNDK)
- Western Digital (WDC)
- Nanya Technology (2408.TW)

**5. 代工 & 封装**
- TSMC (TSM)
- UMC (2303.TW)

**6. EDA / IP**
- Synopsys (SNPS)
- Cadence (CDNS)

**7. 光芯片 & 光模块**
- Coherent (COHR)
- Lumentum (LITE)
- Cisco (CSCO)

**8. 设备**
- ASML (ASML)

**9. 模拟 / 接口 / 特种芯片**
- Texas Instruments (TXN)

**10. 衬底材料**
- Sumco (3436.T)

**11. AI 模型公司**
- MiniMax (Private)
- 智谱 AI (Private)

### 3.4 公司指标

对每家公司追踪以下趋势方向：

| 指标 | 说明 |
|------|------|
| 出货量 | ↑/↓/→ |
| ASP | ↑/↓/→ |
| 生产成本 | ↑/↓/→ |
| 营业收入 | ↑/↓/→ |
| 毛利率 | ↑/↓/→ |
| 股价判断 | 看涨/看跌/中性 + 理由 |

---

## 四、技术架构

### 4.1 整体架构

```
Mac Mini（采集+分析端）
  │
  ├── Cron Job（每 4h）
  │     ├── 1. 采集脚本（RSS/arXiv）→ 原始 JSON
  │     ├── 2. Darren 分析（分类+传导链+股价判断）→ 结构化 JSON
  │     └── 3. 推送到 Turso 数据库
  │
  └── Darren 在 cron session 中完成分析（不调外部 LLM API）

Vercel（展示端）
  ├── Next.js 前端（HTML 仪表盘）
  ├── API Routes（读取 Turso 数据）
  └── 域名：TBD
```

### 4.2 数据库（Turso — SQLite 托管）

**连接信息：**
- URL: `libsql://semimonitor-gavindingcoolapk.aws-ap-northeast-1.turso.io`
- 已建表：`news`, `component_status`, `company_view`, `price_data`

### 4.3 数据流

```
RSS feeds → rss.js → raw.json
                        │
                  push-to-turso.js → Turso (news 表)
                        │
                  cron job (Darren 分析)
                        │
                  Darren 更新:
                    - news 表（补充 component_type, event_type, impact, analysis）
                    - company_view 表（指标趋势 + 股价判断）
                        │
                  Vercel 前端读取 → HTML 仪表盘
```

### 4.4 项目目录

```
~/workspace/Darren/semi-monitor/
├── config/
│   └── sources.json          # 数据源 + 关键词配置
├── src/
│   ├── collectors/
│   │   └── rss.js            # RSS 采集器 ✅ 已完成
│   └── output/
│       ├── push-to-turso.js  # 推送数据到 Turso ✅ 已完成
│       └── generate-html.js  # 生成 HTML（待开发）
├── dashboard/
│   └── index.html            # 前端模板 ✅ 已完成（v5）
├── package.json
└── SPEC.md                   # 本文档
```

---

## 五、前端设计

### 5.1 页面结构

两个 Tab 页：

**Tab 1：新闻流**
- 顶部：组件类型筛选按钮（全部/GPU/CPU/HBM/...）
- 新闻列表：每条新闻显示标题（可点击跳转原文）、来源、时间、组件标签、利好/利空标记
- 悬浮展开：分析摘要 + 逻辑传导链条（事件→供需→组件→公司→股价）

**Tab 2：公司分析**
- 按业务主线分类显示公司卡片（11 个分类）
- 每个卡片：公司名 + 代码、业务标签、5项指标趋势（出货量/ASP/成本/营收/毛利率）、看涨/看跌判断、推理

### 5.2 样式

- 白底、科技感、简约
- 当前用纯 HTML + CSS + JS 实现（demo 数据）
- 生产环境接入 Turso 数据

---

## 六、Cron Job 设计

| 任务 | 频率 | 说明 |
|------|------|------|
| 新闻采集 + 分析 | 每 1 小时 | RSS 采集 → Darren 分类分析 → 推送 Turso |
| X/Twitter 采集 | 每 1 小时 | Scweet 抓取 6 个分析师账号推文 → 分类分析 |
| arXiv 学术监控 | 每日 | 学术论文采集 + 分析 |
| 价格数据更新 | 每天 | TrendForce DRAMeXchange 价格采集 |
| 周报生成 | 每周一 | 信号汇总 + 供需判断 + 股价观点 |

---

## 七、待确认 / 待调整

### 需要 Gavin 确认的：

1. ~~逻辑传导链条~~ — ✅ 已固定，6 层传导链（事件→供需→产品指标→公司财务→股价），详见 3.2
2. **RSS 源清单** — ✅ 已合并 kepler-monitor 15 个已验证源 + 4 个新增待验证
3. **X/Twitter 账号** — ✅ 已整理初步清单，需 Gavin 确认（参考 @GD4724 关注列表）
4. **组件分类** — 当前 13 类，是否需要调整？
5. **公司分类 & 清单** — 当前 11 个分类，是否需要增减？
6. **Vercel 部署** — 你有 Vercel 账号吗？域名？
7. **采集频率** — ✅ 已更新为：RSS 每 1h，价格每天
8. ~~X/Twitter~~ — ✅ 已解决，使用 Scweet 库 + auth_token cookie

### 后续开发：

- [ ] 接入 Turso 数据（替换 demo 数据）
- [ ] Vercel 部署
- [ ] arXiv 采集脚本
- [ ] X/Twitter 采集脚本
- [ ] 价格数据采集
- [ ] 财报自动解析
- [ ] Telegram 预警推送（重大事件）

---

*文档版本：v0.7 | 最后更新：2026-05-22 17:15*
