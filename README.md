# MarketMind

**Regime-Aware Strategy Intelligence — Track 2: Strategy Skills**

Built for the **BNB Chain × CMC × Trust Wallet Hackathon**.

Live: [marketmind-web-theta.vercel.app](https://marketmind-web-theta.vercel.app)

![MarketMind Logo](./packages/web/public/mm-logo.png)

---

## What it does

MarketMind is a CMC Skill that ingests live CoinMarketCap market data and generates a complete, backtestable trading strategy for any cryptocurrency in real time.

Market data in. Strategy spec out. No execution layer. No wallet. No API keys required. Pure signal from CMC data alone.

---

## How the regime detection works

Most strategy tools apply a fixed set of indicators regardless of market conditions. MarketMind detects the regime first, then switches the entire strategy to match it.

The regime detection pipeline uses four inputs, all sourced from free public APIs:

| Input | Source | Method |
|---|---|---|
| Volatility score | CMC | Std deviation of normalized returns across 1h, 24h, 7d, 30d (Bollinger Width proxy) |
| Momentum score | CMC | Weighted blend: 1h (20%), 24h (30%), 30d (50%) |
| BTC dominance state | CMC global metrics | Dynamic thresholds: >54% = BTC season, <48% = alt season |
| Fear and Greed trend | Alternative.me | 7-day rolling trend, free and unauthenticated |

Each asset is classified into one of four regimes:

| Regime | Strategy Generated |
|---|---|
| Bull Trend | Momentum long with ATR-based entry and three profit targets |
| Bear Trend | Capital preservation, short setup, reduced sizing |
| Ranging | Grid oscillator, mean reversion, RSI extremes |
| High Volatility | Defense playbook, hard stops, minimum exposure |

The strategy is never the same twice because the market is never the same twice.

---

## Derivatives signal layer

On top of regime detection, MarketMind adds a derivatives divergence signal using only CMC global metrics. It detects whether derivatives volume and price direction are aligned or diverging, flagging:

- Overleveraged longs (price up, derivatives volume spike, momentum weakening)
- Short squeeze risk (price compression with high short interest proxy)
- Mass deleveraging conditions (volume collapse + negative momentum)

This is the layer most retail tools ignore entirely.

---

## Strategy output spec

Every strategy generation call returns a structured JSON spec including:

- Detected regime with confidence score
- ATR-based entry zone
- Stop loss level
- Three tiered profit targets (TP1, TP2, TP3)
- Volume confirmation signal
- Derivatives divergence flag
- Momentum divergence analysis
- Kelly fraction position sizing
- Indicator guidance (RSI, MACD, BB settings)
- Plain-English summary

The full LLM Skill spec with algorithm documentation, scoring formulas, and signal definitions is published on the live site and copyable directly into any LLM via the **Try in LLM** button.

---

## Pages

| Page | What it does |
|---|---|
| Dashboard | Live CMC global metrics, Fear and Greed index, market dominance |
| Scanner | 5,000+ coins with live regime badges, sortable by momentum and volatility |
| Strategy | Full strategy generation end to end for any CMC-listed asset |
| Portfolio | Aggregate regime, weighted momentum score, risk score (0-100) across a holdings list |
| Watchlist | Persistent pinned assets with live regime tracking across sessions |

Portfolio and Watchlist data persists via localStorage so nothing is lost between sessions.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Tailwind CSS v4, TanStack Query |
| Backend | Hono on Bun, deployed to Vercel edge |
| Routing | Wouter |
| Build | Vite + Bun |
| Data | CoinMarketCap free public API + Alternative.me Fear and Greed |

No paid APIs. No execution layer. No wallet connection. Pure strategy intelligence.

---

## Running locally

```bash
# Clone
git clone https://github.com/Orshengnudor/marketmind
cd marketmind

# Install
bun install

# Dev (Vite dev server + Hono API)
bun run dev        # http://localhost:5173

# Production build
bun run build
bun run start
```

No `.env` setup needed. CMC free public API and Alternative.me are both unauthenticated.

---

## Project structure

```
packages/
  web/
    src/
      api/              # Hono API routes
      server.ts         # Production Bun/Hono server
      web/
        pages/          # Dashboard, Scanner, Strategy, Portfolio, Watchlist
        components/     # Charts, regime badges, strategy cards
        lib/            # Regime detection, scoring engine, CMC client
        hooks/          # TanStack Query hooks for live data
```

---

## Hackathon track

Track 2: Strategy Skills, CMC-powered, no execution layer. The deliverable is a backtestable strategy spec authored as an LLM Skill, not a live trading agent.

Prize pool: $3,000 / $2,000 / $1,000.

---

## License

MIT
