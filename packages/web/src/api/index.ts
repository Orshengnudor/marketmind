import { Hono } from "hono";
import { cors } from "hono/cors";

// ── Demo seed data — used when CMC/FG APIs are unreachable ──────────────────
// Matches scanner.tsx DEMO_COINS for consistency
function demoQuote(price: number, pct1h: number, pct24h: number, pct7d: number, pct30d: number, vol24h: number, mcap: number) {
  return [{
    name: "USD",
    price,
    percentChange1h: pct1h,
    percentChange24h: pct24h,
    percentChange7d: pct7d,
    percentChange30d: pct30d,
    volume24h: vol24h,
    volume7d: vol24h * 7 * (0.8 + Math.random() * 0.4),
    marketCap: mcap,
  }];
}
const DEMO_CMC_COINS: any[] = [
  { id: 1,    name: "Bitcoin",      symbol: "BTC",  slug: "bitcoin",      quotes: demoQuote(67420,   0.4,  2.1,  5.2,  18.4,  31200000000, 1327000000000) },
  { id: 1027, name: "Ethereum",     symbol: "ETH",  slug: "ethereum",     quotes: demoQuote(3540,    0.2,  1.8,  3.9,  12.1,  18700000000,  425000000000) },
  { id: 1839, name: "BNB",          symbol: "BNB",  slug: "binancecoin",  quotes: demoQuote(608,     0.3,  2.4,  6.1,  22.3,   2100000000,   88600000000) },
  { id: 52,   name: "XRP",          symbol: "XRP",  slug: "xrp",          quotes: demoQuote(0.584,   0.1, -0.4,  1.2,   8.7,   2900000000,   33200000000) },
  { id: 5426, name: "Solana",       symbol: "SOL",  slug: "solana",       quotes: demoQuote(174.2,   0.6,  3.1,  8.4,  31.2,   4400000000,   81500000000) },
  { id: 3408, name: "USDC",         symbol: "USDC", slug: "usd-coin",     quotes: demoQuote(1.000,   0.0,  0.0,  0.0,   0.1,   7100000000,   43200000000) },
  { id: 2010, name: "Cardano",      symbol: "ADA",  slug: "cardano",      quotes: demoQuote(0.461,   0.2,  1.1,  2.3,   9.4,    620000000,   16200000000) },
  { id: 74,   name: "Dogecoin",     symbol: "DOGE", slug: "dogecoin",     quotes: demoQuote(0.163,   0.8,  4.2,  9.1,  28.7,   1400000000,   23600000000) },
  { id: 825,  name: "Tether",       symbol: "USDT", slug: "tether",       quotes: demoQuote(1.000,   0.0,  0.0,  0.0,   0.0,  62100000000,  114000000000) },
  { id: 6636, name: "Polkadot",     symbol: "DOT",  slug: "polkadot",     quotes: demoQuote(7.82,    0.1, -0.9, -1.4,   3.2,    310000000,   11200000000) },
  { id: 2,    name: "Litecoin",     symbol: "LTC",  slug: "litecoin",     quotes: demoQuote(89.4,    0.2,  0.7,  1.9,   6.1,    580000000,    6700000000) },
  { id: 1975, name: "Chainlink",    symbol: "LINK", slug: "chainlink",    quotes: demoQuote(14.72,   0.5,  2.8,  7.2,  24.8,    710000000,    9200000000) },
  { id: 5805, name: "Avalanche",    symbol: "AVAX", slug: "avalanche",    quotes: demoQuote(38.6,    0.7,  3.4,  8.8,  29.4,    820000000,   16000000000) },
  { id: 4687, name: "Binance USD",  symbol: "BUSD", slug: "binance-usd",  quotes: demoQuote(1.000,   0.0,  0.0,  0.0,   0.0,    210000000,    1600000000) },
  { id: 3890, name: "Polygon",      symbol: "POL",  slug: "polygon",      quotes: demoQuote(0.532,   0.3,  1.6,  3.8,  14.6,    490000000,    5900000000) },
  { id: 11840,name: "Optimism",     symbol: "OP",   slug: "optimism",     quotes: demoQuote(2.14,    0.4,  2.1,  5.5,  18.9,    310000000,    2400000000) },
  { id: 7083, name: "Uniswap",      symbol: "UNI",  slug: "uniswap",      quotes: demoQuote(10.28,   0.3,  1.4,  4.2,  16.1,    280000000,    6200000000) },
  { id: 1958, name: "TRON",         symbol: "TRX",  slug: "tron",         quotes: demoQuote(0.128,   0.1,  0.6,  1.3,   5.8,    640000000,   11400000000) },
  { id: 4172, name: "Terra Classic", symbol: "LUNC", slug: "terra-luna",  quotes: demoQuote(0.000092,0.0, -0.3, -0.8,  -2.1,     18000000,      630000000) },
  { id: 1765, name: "EOS",          symbol: "EOS",  slug: "eos",          quotes: demoQuote(0.87,    0.1,  0.4,  0.9,   3.1,    140000000,     960000000) },
];

const app = new Hono()
  .basePath("api")
  .use(cors({ origin: "*" }))

  // Health check
  .get("/health", (c) => c.json({ status: "ok" }, 200))

  // Proxy: CMC top coins listing
  .get("/market/listing", async (c) => {
    try {
      const limit = c.req.query("limit") || "5000";
      const res = await fetch(
        `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/listing?start=1&limit=${limit}&sortBy=market_cap&sortType=desc&convert=USD&cryptoType=all&tagType=all&audited=false`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) throw new Error(`CMC listing ${res.status}`);
      const data = await res.json() as any;
      if (!data?.data?.cryptoCurrencyList) throw new Error("unexpected CMC shape");
      return c.json(data, 200);
    } catch (e) {
      // Demo fallback — seeded data so the UI never dies
      return c.json({
        data: {
          cryptoCurrencyList: DEMO_CMC_COINS,
          totalCount: DEMO_CMC_COINS.length,
        },
        status: { timestamp: new Date().toISOString(), error_code: 0, error_message: null },
        __demo: true,
      }, 200);
    }
  })

  // Proxy: CMC global metrics
  .get("/market/global", async (c) => {
    try {
      const res = await fetch(
        "https://api.coinmarketcap.com/data-api/v3/global-metrics/quotes/latest",
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      if (!res.ok) throw new Error(`CMC global ${res.status}`);
      const data = await res.json() as any;
      if (!data?.data) throw new Error("unexpected global shape");
      return c.json(data, 200);
    } catch (e) {
      return c.json({
        data: {
          btcDominance: 52.4,
          totalMarketCap: 2340000000000,
          total24hVolume: 98000000000,
          derivatives24hPercentageChange: 2.1,
          altcoinMarketCap: 1115160000000,
        },
        status: { timestamp: new Date().toISOString(), error_code: 0 },
        __demo: true,
      }, 200);
    }
  })

  // Proxy: Fear & Greed index (Alternative.me - free, no key)
  .get("/market/fear-greed", async (c) => {
    try {
      const res = await fetch("https://api.alternative.me/fng/?limit=7&format=json");
      if (!res.ok) throw new Error(`FG ${res.status}`);
      const data = await res.json() as any;
      if (!data?.data) throw new Error("unexpected FG shape");
      return c.json(data, 200);
    } catch (e) {
      return c.json({
        data: [
          { value: "64", value_classification: "Greed",        timestamp: String(Math.floor(Date.now() / 1000) - 0) },
          { value: "61", value_classification: "Greed",        timestamp: String(Math.floor(Date.now() / 1000) - 86400) },
          { value: "58", value_classification: "Greed",        timestamp: String(Math.floor(Date.now() / 1000) - 172800) },
          { value: "55", value_classification: "Neutral",      timestamp: String(Math.floor(Date.now() / 1000) - 259200) },
          { value: "52", value_classification: "Neutral",      timestamp: String(Math.floor(Date.now() / 1000) - 345600) },
          { value: "49", value_classification: "Neutral",      timestamp: String(Math.floor(Date.now() / 1000) - 432000) },
          { value: "47", value_classification: "Neutral",      timestamp: String(Math.floor(Date.now() / 1000) - 518400) },
        ],
        name: "Fear and Greed Index",
        __demo: true,
      }, 200);
    }
  })

  // Proxy: CMC coin detail
  .get("/market/coin/:id", async (c) => {
    const id = c.req.param("id");
    try {
      const res = await fetch(
        `https://api.coinmarketcap.com/data-api/v3/cryptocurrency/detail?id=${id}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await res.json() as any;
      return c.json(data, 200);
    } catch (e) {
      return c.json({ error: "Failed to fetch coin detail" }, 500);
    }
  })

  // Strategy generation endpoint — MarketMind v1.1.0
  .post("/strategy/generate", async (c) => {
    try {
      const body = await c.req.json() as {
        asset: string;
        assetId: number;
        timeframe: string;
        riskTolerance: string;
        marketData: any;
        globalData: any;
        fearGreedData: any;
      };

      const { asset, timeframe, riskTolerance, marketData, globalData, fearGreedData } = body;

      // --- Extract CMC quote fields ---
      const coin = marketData;
      const usdQuote = Array.isArray(coin?.quotes)
        ? coin.quotes.find((q: any) => q.name === "USD") ?? coin.quotes[0] ?? {}
        : coin?.quotes?.USD ?? {};

      const price        = usdQuote?.price              ?? 0;
      const pct1h        = usdQuote?.percentChange1h     ?? 0;
      const pct24h       = usdQuote?.percentChange24h    ?? 0;
      const pct7d        = usdQuote?.percentChange7d     ?? 0;
      const pct30d       = usdQuote?.percentChange30d    ?? 0;
      const volume24h    = usdQuote?.volume24h            ?? 0;
      const volume7dAvg  = usdQuote?.volume7d != null
                            ? usdQuote.volume7d / 7
                            : volume24h; // fallback: assume vol is average
      const marketCap    = usdQuote?.marketCap            ?? 0;

      const fearGreedValue          = fearGreedData?.data?.[0]?.value
                                        ? parseInt(fearGreedData.data[0].value) : 50;
      const fearGreedClassification = fearGreedData?.data?.[0]?.value_classification ?? "Neutral";

      // F&G 7-day history for trend
      const fgHistory: number[] = (fearGreedData?.data ?? [])
        .slice(0, 7)
        .map((d: any) => parseInt(d.value ?? "50"));
      const fgTrend = fgHistory.length >= 2
        ? fgHistory[0] - fgHistory[fgHistory.length - 1]
        : 0; // positive = improving sentiment

      const btcDominance = globalData?.data?.btcDominance ?? 50;
      const derivativesChange = globalData?.data?.derivatives24hPercentageChange ?? 0;

      // =========================================================
      // VOLATILITY — v1.1: Bollinger Width proxy
      // Uses spread of all available return timeframes as a
      // stand-in for realized volatility (no OHLCV available).
      // VolatilityScore = std dev of [pct1h*24, pct24h, pct7d/7, pct30d/30]
      // (annualised to daily basis for comparability)
      // =========================================================
      const dailyReturns = [pct1h * 24, pct24h, pct7d / 7, pct30d / 30];
      const meanReturn   = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
      const variance     = dailyReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / dailyReturns.length;
      const volatilityScore = Math.sqrt(variance); // pseudo-ATR daily %

      // Bollinger Width proxy: how wide is the band?
      const bbWidth = (Math.max(...dailyReturns) - Math.min(...dailyReturns));

      // Combined volatility signal
      const volatility = (volatilityScore * 0.6) + (bbWidth * 0.4);

      // =========================================================
      // MOMENTUM — v1.1: Deduplicated timeframe weighting
      // Old: 1h(20%) + 24h(50%) + 7d(30%) — 24h overlaps 7d
      // New: 1h(20%) + 24h(30%) + 30d(50%) — clean separation
      //   1h  = intraday microstructure
      //   24h = short-term price action
      //   30d = macro trend (no overlap with 24h)
      // =========================================================
      const momentumScore = (pct1h * 0.2) + (pct24h * 0.3) + (pct30d * 0.5);

      // =========================================================
      // VOLUME CONFIRMATION
      // Ratio of today's volume vs 7d average.
      // > 1.5x = confirmed move.  < 0.7x = suspect move.
      // =========================================================
      const volumeRatio    = volume7dAvg > 0 ? volume24h / volume7dAvg : 1;
      const volumeConfirmed = volumeRatio >= 1.5;
      const volumeSuspect   = volumeRatio < 0.7;
      let volumeSignal: "CONFIRMED" | "NORMAL" | "LOW_CONVICTION";
      let volumeSignalDesc: string;
      if (volumeConfirmed) {
        volumeSignal = "CONFIRMED";
        volumeSignalDesc = `Volume ${volumeRatio.toFixed(1)}x the 7d average — move is well-supported.`;
      } else if (volumeSuspect) {
        volumeSignal = "LOW_CONVICTION";
        volumeSignalDesc = `Volume only ${volumeRatio.toFixed(1)}x average — treat breakouts/breakdowns with skepticism.`;
      } else {
        volumeSignal = "NORMAL";
        volumeSignalDesc = `Volume ${volumeRatio.toFixed(1)}x average — within normal range.`;
      }

      // =========================================================
      // BTC DOMINANCE — v1.1: Dynamic threshold
      // Old: static cutoff at 55%
      // New: compare to soft equilibrium (52%).
      //   Dominant   = dom > 54% (capital flowing TO BTC)
      //   Neutral    = 48-54%
      //   Alt Season = dom < 48% (capital rotating to alts)
      // This avoids the 2021 vs 2024 regime problem.
      // =========================================================
      const BTC_DOM_DOMINANT  = 54;
      const BTC_DOM_ALT       = 48;
      const btcDominanceState =
        btcDominance > BTC_DOM_DOMINANT ? "BTC_DOMINANT" :
        btcDominance < BTC_DOM_ALT      ? "ALT_SEASON"   : "NEUTRAL";

      const sentimentBullish = fearGreedValue > 60;
      const sentimentBearish = fearGreedValue < 40;
      const sentimentExtreme = fearGreedValue > 80 || fearGreedValue < 20;

      // =========================================================
      // DERIVATIVES / FUNDING RATE PROXY
      // Global derivatives volume change vs price direction
      // =========================================================
      let fundingSignal: "LONG_CROWDED" | "SHORT_SQUEEZE_RISK" | "DELEVERAGING" | "NEUTRAL";
      let fundingSignalDesc: string;

      if (derivativesChange > 8 && pct24h < -1) {
        fundingSignal = "LONG_CROWDED";
        fundingSignalDesc = `Derivatives vol +${derivativesChange.toFixed(1)}% while price −${Math.abs(pct24h).toFixed(1)}% — overleveraged longs. Cascade liquidation risk.`;
      } else if (derivativesChange > 8 && pct24h > 1) {
        fundingSignal = "SHORT_SQUEEZE_RISK";
        fundingSignalDesc = `Derivatives vol +${derivativesChange.toFixed(1)}% with price +${pct24h.toFixed(1)}% — shorts being squeezed. Momentum likely to extend.`;
      } else if (derivativesChange < -8 && pct24h < -1) {
        fundingSignal = "DELEVERAGING";
        fundingSignalDesc = `Derivatives vol −${Math.abs(derivativesChange).toFixed(1)}% — mass deleveraging. Potential capitulation; watch for reversal.`;
      } else if (derivativesChange < -5 && pct24h > 1) {
        fundingSignal = "NEUTRAL";
        fundingSignalDesc = `Derivatives contracting while spot rises — organic buying. Healthier signal than a leveraged run.`;
      } else {
        fundingSignal = "NEUTRAL";
        fundingSignalDesc = `Derivatives Δ${derivativesChange > 0 ? "+" : ""}${derivativesChange.toFixed(1)}% — no anomalous leverage detected.`;
      }

      // =========================================================
      // MOMENTUM DIVERGENCE (renamed from "Social Divergence")
      // Measures price acceleration vs trend — honest label.
      // Added volume dimension: a divergence without volume is
      // weaker signal than one with vol confirmation.
      // =========================================================
      // Compare short-term 24h vs longer-term 30d daily average
      const shortTermBias   = pct24h;
      const longerTermBias  = pct30d / 30; // 30d normalized to daily
      const divergenceScore = shortTermBias - longerTermBias;

      let momentumDivergence: "DISTRIBUTION" | "ACCUMULATION" | "TREND_EXHAUSTION" | "BREAKOUT" | "NEUTRAL";
      let momentumDivergenceDesc: string;

      if (divergenceScore > 5 && pct30d < 5) {
        momentumDivergence = "DISTRIBUTION";
        momentumDivergenceDesc = `24h spike (+${pct24h.toFixed(1)}%) diverges sharply from flat 30d trend${volumeSuspect ? " — LOW volume confirms weakness" : volumeConfirmed ? " — high volume makes this a real concern" : ""}. Possible distribution.`;
      } else if (divergenceScore < -5 && pct30d > 5) {
        momentumDivergence = "TREND_EXHAUSTION";
        momentumDivergenceDesc = `30d uptrend stalling on 24h weakness (${pct24h.toFixed(1)}%). Momentum fading${volumeSuspect ? " on thin volume" : ""}.`;
      } else if (divergenceScore < -5 && pct24h < -2 && pct30d < -5) {
        momentumDivergence = "ACCUMULATION";
        momentumDivergenceDesc = `24h drop overshoots 30d trend — potential smart-money accumulation${volumeConfirmed ? " confirmed by elevated volume" : ""}.`;
      } else if (divergenceScore > 3 && pct30d > 8 && volumeConfirmed) {
        momentumDivergence = "BREAKOUT";
        momentumDivergenceDesc = `24h and 30d momentum aligned AND volume ${volumeRatio.toFixed(1)}x avg — confirmed breakout signal.`;
      } else if (divergenceScore > 3 && pct30d > 8 && !volumeConfirmed) {
        momentumDivergence = "NEUTRAL";
        momentumDivergenceDesc = `Price momentum positive but volume (${volumeRatio.toFixed(1)}x avg) doesn't confirm breakout. Watch for volume pickup.`;
      } else {
        momentumDivergence = "NEUTRAL";
        momentumDivergenceDesc = `No significant short/long divergence (score: ${divergenceScore.toFixed(2)}). Normal price action.`;
      }

      // =========================================================
      // REGIME CLASSIFICATION — v1.1
      // Uses updated volatility + momentum + dynamic BTC dom
      // =========================================================
      let regime: "BULL_TREND" | "BEAR_TREND" | "RANGING" | "HIGH_VOLATILITY";
      let regimeConfidence: number;
      let regimeReason: string;

      if (volatility > 8) {
        regime = "HIGH_VOLATILITY";
        regimeConfidence = Math.min(95, 58 + volatility * 2);
        regimeReason = `Realized volatility proxy: ${volatility.toFixed(2)}% daily. BB width: ${bbWidth.toFixed(1)}%. Risk-off posture required.`;
      } else if (momentumScore > 2.5 && sentimentBullish && btcDominanceState !== "BTC_DOMINANT") {
        regime = "BULL_TREND";
        regimeConfidence = Math.min(92, 55 + momentumScore * 2.5);
        regimeReason = `Clean momentum: 1h ${pct1h > 0 ? "+" : ""}${pct1h.toFixed(1)}% / 24h ${pct24h > 0 ? "+" : ""}${pct24h.toFixed(1)}% / 30d ${pct30d > 0 ? "+" : ""}${pct30d.toFixed(1)}% (no timeframe overlap). F&G: ${fearGreedValue}. BTC dom: ${btcDominance.toFixed(1)}% (${btcDominanceState}).`;
      } else if (momentumScore < -2.5 && sentimentBearish) {
        regime = "BEAR_TREND";
        regimeConfidence = Math.min(92, 55 + Math.abs(momentumScore) * 2.5);
        regimeReason = `Negative momentum: 1h ${pct1h.toFixed(1)}% / 24h ${pct24h.toFixed(1)}% / 30d ${pct30d.toFixed(1)}%. F&G: ${fearGreedValue} (${fearGreedClassification}). BTC dom: ${btcDominance.toFixed(1)}%.`;
      } else {
        regime = "RANGING";
        regimeConfidence = Math.min(85, 50 + Math.abs(5 - volatility) * 3);
        regimeReason = `Low directional conviction. Momentum: ${momentumScore.toFixed(2)}. Vol: ${volatility.toFixed(2)}%. F&G: ${fearGreedValue}. BTC dom: ${btcDominance.toFixed(1)}%.`;
      }

      // =========================================================
      // STRATEGY GENERATION PER REGIME
      // =========================================================
      const riskMultiplier = riskTolerance === "conservative" ? 0.5
        : riskTolerance === "aggressive" ? 1.5 : 1.0;

      const timeframeDays: Record<string, number> = {
        "15m": 0.01, "1h": 0.04, "4h": 0.17, "1d": 1, "1w": 7,
      };
      const tfDays = timeframeDays[timeframe] ?? 1;

      // ATR estimate: use volatility score × price (gives $ daily range)
      const atrEstimate = (volatility / 100) * price;

      let strategy: any = {};

      if (regime === "BULL_TREND") {
        const entryPrice = price * 0.995;
        const stopLoss   = price - (atrEstimate * 2 * riskMultiplier);
        const target1    = price + (atrEstimate * 2 * riskMultiplier);
        const target2    = price + (atrEstimate * 3.5 * riskMultiplier);
        const target3    = price + (atrEstimate * 5.5 * riskMultiplier);
        const posSize    = Math.min(25 * riskMultiplier, 40);
        const rr         = ((target1 - entryPrice) / (entryPrice - stopLoss)).toFixed(2);

        strategy = {
          name: `${asset} Momentum Long — Bull Trend`,
          type: "MOMENTUM_LONG",
          entryRules: [
            `Enter LONG at ${formatPrice(entryPrice)} (0.5% pullback from current)`,
            volumeConfirmed
              ? `✓ Volume CONFIRMED — ${volumeRatio.toFixed(1)}x 7d avg. Strong entry signal.`
              : `⚠ Volume ${volumeRatio.toFixed(1)}x avg — wait for volume expansion before full size`,
            `RSI(14) > 50 on ${timeframe}; stronger if > 60`,
            `MACD histogram positive and expanding`,
            `EMA20 > EMA50 (trend alignment check)`,
          ],
          exitRules: {
            stopLoss:      `${formatPrice(stopLoss)} — 2× ATR below entry (ATR ≈ ${formatPrice(atrEstimate)})`,
            target1:       `${formatPrice(target1)} — take 40% (+2× ATR, R/R: ${rr}:1)`,
            target2:       `${formatPrice(target2)} — take 40% (+3.5× ATR)`,
            target3:       `${formatPrice(target3)} — trail 20% (+5.5× ATR)`,
            trailingStop:  `Move stop to breakeven after T1 hit. Trail by 1.5× ATR (≈ ${formatPrice(atrEstimate * 1.5)})`,
            timeExit:      `Exit if no progress toward T1 within ${Math.ceil(tfDays * 5)} periods`,
          },
          positionSizing: {
            recommendedSize:  `${posSize.toFixed(0)}% of portfolio`,
            maxDrawdown:      `${(atrEstimate * 2 / price * 100).toFixed(2)}% (ATR-based, not fixed %)`,
            kellyFraction:    `${(posSize * 0.5).toFixed(1)}% (half-Kelly for safety)`,
            dailyRiskLimit:   `${(5 * riskMultiplier).toFixed(1)}% of portfolio per day`,
          },
          indicators: {
            ATR:       { period: 14, value: `≈${formatPrice(atrEstimate)} (estimated from vol)`, signal: "Stop placement and target sizing" },
            EMA:       { periods: [20, 50, 200], signal: "Trend direction: EMA20>EMA50>EMA200 = strong bull" },
            RSI:       { period: 14, signal: "Entry above 50, trail stop if drops below 45" },
            Volume:    { signal: `${volumeSignalDesc}`, ratio: `${volumeRatio.toFixed(2)}x` },
            FearGreed: { value: fearGreedValue, trend: `${fgTrend > 5 ? "↑ improving" : fgTrend < -5 ? "↓ deteriorating" : "→ stable"}`, signal: fearGreedValue > 75 ? "Greed zone — tighten stops" : "Supportive" },
          },
          riskReward: rr,
          notes: [
            `BTC Dominance: ${btcDominance.toFixed(1)}% (${btcDominanceState}) — ${btcDominanceState === "ALT_SEASON" ? "alt season tailwind" : btcDominanceState === "BTC_DOMINANT" ? "capital concentrating in BTC — reduce alt exposure" : "neutral dom environment"}`,
            `F&G 7d trend: ${fgTrend > 0 ? "improving +" : ""}${fgTrend} pts — ${fgTrend > 0 ? "sentiment tailwind" : "watch for fear reversal"}`,
            volumeSuspect ? "⚠ Low volume: scale in at 50% size, add only on volume confirmation" : "Scale in: 50% at entry, 25% at first pullback, 25% on continuation",
            `Invalidation: close below ${formatPrice(stopLoss)} on ${timeframe} candle`,
          ],
        };

      } else if (regime === "BEAR_TREND") {
        const stopLoss  = price + (atrEstimate * 2 * riskMultiplier);
        const target1   = price - (atrEstimate * 2 * riskMultiplier);
        const target2   = price - (atrEstimate * 3.5 * riskMultiplier);
        const posSize   = Math.min(20 * riskMultiplier, 35);
        const rr        = ((price - target1) / (stopLoss - price)).toFixed(2);

        strategy = {
          name: `${asset} Cash / Mean Reversion Short — Bear Trend`,
          type: "MEAN_REVERSION_SHORT",
          entryRules: [
            `PRIMARY: Move to USDT/USDC — capital preservation first`,
            `Short entry (advanced): wait for dead-cat bounce to ${formatPrice(price * 1.015)}`,
            volumeConfirmed
              ? `Volume ${volumeRatio.toFixed(1)}x avg — confirmed selling pressure`
              : `Low conviction volume — don't short into thin air; wait for vol spike`,
            `RSI(14) < 45 and declining; ideally < 40`,
            `EMA20 < EMA50 (death cross context)`,
          ],
          exitRules: {
            stopLoss:    `${formatPrice(stopLoss)} — 2× ATR above entry (hard stop)`,
            target1:     `${formatPrice(target1)} — cover 50% (−2× ATR, R/R: ${rr}:1)`,
            target2:     `${formatPrice(target2)} — cover 50% (−3.5× ATR)`,
            reEntry:     `Re-enter long: F&G recovers > 45 AND 4h RSI crosses back > 50`,
            timeExit:    `Reassess if no continuation within ${Math.ceil(tfDays * 7)} periods`,
          },
          positionSizing: {
            recommendedSize: `Max ${posSize.toFixed(0)}% short — rest in stablecoins`,
            maxDrawdown:     `${(atrEstimate * 2 / price * 100).toFixed(2)}% (ATR-based)`,
            cashAllocation:  riskTolerance === "conservative" ? "80% stablecoins" : riskTolerance === "aggressive" ? "40% stablecoins" : "60% stablecoins",
            dailyRiskLimit:  `${(4 * riskMultiplier).toFixed(1)}% of portfolio`,
          },
          indicators: {
            ATR:       { period: 14, value: `≈${formatPrice(atrEstimate)}`, signal: "Widen stops in bear — use 2× ATR minimum" },
            EMA:       { periods: [20, 50, 200], signal: "EMA20<EMA50 = trend down. EMA200 = major resistance" },
            RSI:       { period: 14, signal: "Short bounces to 45–50 RSI range" },
            Volume:    { signal: volumeSignalDesc, ratio: `${volumeRatio.toFixed(2)}x` },
            FearGreed: { value: fearGreedValue, trend: `${fgTrend > 5 ? "↑" : fgTrend < -5 ? "↓" : "→"} ${Math.abs(fgTrend)}pt`, signal: fearGreedValue < 20 ? "Extreme Fear — reduce short size, reversal risk" : "Supports downside" },
          },
          riskReward: rr,
          notes: [
            `Bear playbook: preserve capital first, profit second`,
            fearGreedValue < 20 ? "⚠ Extreme Fear — potential capitulation; consider covering shorts at T1" : `F&G at ${fearGreedValue} supports continued downside`,
            `BTC Dominance ${btcDominance.toFixed(1)}% (${btcDominanceState}) — ${btcDominanceState === "BTC_DOMINANT" ? "rotate to BTC if you must hold crypto" : "broad market weakness"}`,
            volumeSuspect ? "Low volume decline — could be a slow bleed; watch for vol spike capitulation candle" : "Volume confirms selling pressure",
          ],
        };

      } else if (regime === "RANGING") {
        const rangeHigh   = price * 1.03;
        const rangeLow    = price * 0.97;
        const gridSpacing = (rangeHigh - rangeLow) / 5;
        const posSize     = Math.min(15 * riskMultiplier, 30);

        strategy = {
          name: `${asset} Grid / Oscillator — Ranging`,
          type: "GRID_OSCILLATOR",
          entryRules: [
            `Range: support ${formatPrice(rangeLow)} — resistance ${formatPrice(rangeHigh)} (6% band)`,
            `BUY zone: ${formatPrice(rangeLow)} to ${formatPrice(rangeLow + gridSpacing)} — RSI(14) < 40`,
            `SELL zone: ${formatPrice(rangeHigh - gridSpacing)} to ${formatPrice(rangeHigh)} — RSI(14) > 60`,
            volumeSuspect
              ? `Low volume range (${volumeRatio.toFixed(1)}x) — thin grid, prefer limit orders`
              : `Volume ${volumeRatio.toFixed(1)}x avg — grid working normally`,
            `Stochastic %K < 20 to confirm oversold at support`,
          ],
          exitRules: {
            stopLoss:       `${formatPrice(rangeLow * 0.97)} — 3% below range floor (range breakdown)`,
            profitTarget:   `${formatPrice(rangeHigh)} — sell at resistance`,
            breakoutAbove:  `Close above ${formatPrice(rangeHigh * 1.015)} with volume > 1.5× avg → switch to BULL_TREND`,
            breakdownBelow: `Close below ${formatPrice(rangeLow * 0.985)} → switch to BEAR_TREND`,
            gridLevels:     Array.from({ length: 5 }, (_, i) => formatPrice(rangeLow + gridSpacing * i)),
          },
          positionSizing: {
            recommendedSize: `${posSize.toFixed(0)}% across 5 grid levels (${(posSize / 5).toFixed(1)}% each)`,
            maxDrawdown:     `${(1.5 * riskMultiplier).toFixed(1)}% per level`,
            gridSpacing:     `${formatPrice(gridSpacing)} per level`,
            dailyRiskLimit:  `${(3 * riskMultiplier).toFixed(1)}%`,
          },
          indicators: {
            ATR:            { period: 14, value: `≈${formatPrice(atrEstimate)}`, signal: "Widen grid if ATR expands (vol increasing)" },
            BollingerBands: { period: 20, stdDev: 2, signal: "Buy lower band, sell upper band in range" },
            RSI:            { period: 14, signal: "Buy <40, Sell >60 within range" },
            Volume:         { signal: volumeSignalDesc, ratio: `${volumeRatio.toFixed(2)}x` },
            FearGreed:      { value: fearGreedValue, signal: "Neutral zone (40–60) — range trading optimal" },
          },
          riskReward: "1.5",
          notes: [
            `Ranging regime — grid trading > breakout strategies`,
            `Monitor BTC Dominance: ${btcDominance.toFixed(1)}% — if dom moves ±3% rapidly, expect range break`,
            `F&G ${fgTrend > 5 ? "improving" : fgTrend < -5 ? "deteriorating" : "stable"} — ${fgTrend > 8 ? "bull breakout building" : fgTrend < -8 ? "bear breakdown building" : "no directional catalyst yet"}`,
            `Reduce grid size if ATR expands above ${formatPrice(atrEstimate * 1.5)} — vol regime shift imminent`,
          ],
        };

      } else {
        // HIGH_VOLATILITY
        const posSize = Math.min(10 * riskMultiplier, 20);
        strategy = {
          name: `${asset} Volatility Defense — Reduce Exposure`,
          type: "VOLATILITY_DEFENSE",
          entryRules: [
            `RISK-OFF: Reduce all positions by 50–70%`,
            `Max ${posSize.toFixed(0)}% of normal position size while vol is elevated`,
            `Park capital in USDT/USDC/DAI — wait for ATR compression`,
            `ATR re-entry signal: daily range compresses below ${formatPrice(atrEstimate * 0.6)}`,
            `Bollinger Band Width narrowing for 2+ consecutive days`,
          ],
          exitRules: {
            stopLoss:      `Hard: max ${(1 * riskMultiplier).toFixed(1)}% per trade`,
            reEntry:       `Full re-entry when: BB width < 50% of current AND F&G stabilizes for 2 days`,
            stableYield:   `Stablecoin yield options: Aave, Compound, or CEX savings during wait`,
            timeExit:      `Reassess after ${Math.ceil(tfDays * 3)} periods — vol spikes typically resolve quickly`,
          },
          positionSizing: {
            recommendedSize: `Max ${posSize.toFixed(0)}% — preserve capital`,
            maxDrawdown:     `${(1 * riskMultiplier).toFixed(1)}% max per trade`,
            cashAllocation:  riskTolerance === "conservative" ? "90% stable" : riskTolerance === "aggressive" ? "60% stable" : "75% stable",
            dailyRiskLimit:  `${(2 * riskMultiplier).toFixed(1)}%`,
          },
          indicators: {
            ATR:            { period: 14, value: `≈${formatPrice(atrEstimate)}`, signal: "Rising ATR = stay defensive; falling = re-entry approaching" },
            BollingerBands: { period: 20, stdDev: 2, signal: "Wait for band compression before re-entry" },
            Volume:         { signal: volumeSignalDesc, ratio: `${volumeRatio.toFixed(2)}x` },
            FearGreed:      { value: fearGreedValue, signal: sentimentExtreme ? `⚠ EXTREME reading (${fearGreedValue}) — potential regime reversal` : "Elevated uncertainty" },
          },
          riskReward: "1.2",
          notes: [
            `Vol score: ${volatility.toFixed(2)}% daily (BB width: ${bbWidth.toFixed(1)}%). Elevated risk environment.`,
            fearGreedValue < 20
              ? "⚠ Extreme Fear — small starter long positions acceptable (max 5%)"
              : fearGreedValue > 80
              ? "⚠ Extreme Greed during vol spike — potential blow-off top, be ready to sell"
              : "Patience is the strategy — cash is a position",
            volumeConfirmed ? `High volume confirms vol regime is real — not a glitch` : `Low volume vol spike — may be thin market noise, not panic`,
          ],
        };
      }

      return c.json({
        asset,
        timeframe,
        riskTolerance,
        regime,
        regimeConfidence:     Math.round(regimeConfidence),
        regimeReason,
        price,
        priceChange1h:  pct1h,
        priceChange24h: pct24h,
        priceChange7d:  pct7d,
        priceChange30d: pct30d,
        fearGreedValue,
        fearGreedClassification,
        btcDominance:   parseFloat(btcDominance.toFixed(2)),
        strategy,
        signals: {
          momentum:              momentumScore > 0 ? "BULLISH" : momentumScore < 0 ? "BEARISH" : "NEUTRAL",
          momentumScore:         parseFloat(momentumScore.toFixed(3)),
          sentiment:             sentimentBullish ? "GREEDY" : sentimentBearish ? "FEARFUL" : "NEUTRAL",
          fgTrend:               fgTrend,
          volatilityScore:       parseFloat(volatility.toFixed(3)),
          bbWidth:               parseFloat(bbWidth.toFixed(2)),
          volatilityLevel:       volatility > 8 ? "HIGH" : volatility > 3 ? "MODERATE" : "LOW",
          btcDominanceState,
          volumeSignal,
          volumeRatio:           parseFloat(volumeRatio.toFixed(2)),
          volumeSignalDesc,
          fundingSignal,
          fundingSignalDesc,
          momentumDivergence,
          momentumDivergenceDesc,
          divergenceScore:       parseFloat(divergenceScore.toFixed(2)),
          derivativesChange:     parseFloat(derivativesChange.toFixed(2)),
        },
        generatedAt:  new Date().toISOString(),
        cmcPowered:   true,
        skillVersion: "1.1.0",
      }, 200);

    } catch (e) {
      console.error(e);
      return c.json({ error: "Strategy generation failed" }, 500);
    }
  });

function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1)    return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export type AppType = typeof app;
export default app;
