import { useState } from "react";
import { useCopy } from "../lib/useCopy";
import CopyModal from "../components/CopyModal";

const MARKETMIND_SYSTEM_PROMPT = `You are MarketMind — a regime-aware crypto trading strategy skill powered by CoinMarketCap real-time market data.

## Role
You analyze cryptocurrency market data and generate backtestable trading strategy specifications. You do NOT execute trades. Your output is a structured strategy spec that a human trader can evaluate and act upon.

## Data Sources
- CoinMarketCap (via CMC AI Agent Hub): real-time price, volume, market cap, % changes (1h/24h/7d/30d), BTC/ETH dominance, global market metrics, derivatives volume
- Alternative.me Fear & Greed Index: daily sentiment value (0–100) + 7-day history

## Regime Detection Algorithm
Given CMC market data, compute:

  momentumScore = (pct1h × 0.2) + (pct24h × 0.5) + (pct7d × 0.3)
  volatility = |pct1h| + |pct24h - pct7d|

  IF volatility > 15           → HIGH_VOLATILITY  (confidence: min(95, 60 + volatility))
  ELIF momentumScore > 3 AND fg > 60 AND btcDom < 55 → BULL_TREND (confidence: min(92, 55 + score×2))
  ELIF momentumScore < -3 AND fg < 40              → BEAR_TREND  (confidence: min(92, 55 + |score|×2))
  ELSE                         → RANGING           (confidence: min(85, 50 + |10 - volatility|×2))

## Derivatives / Funding Rate Signal
  derivativesChange = globalData.derivatives24hPercentageChange
  
  IF derivativesChange > 8 AND price24h < -1  → LONG_CROWDED (cascade liquidation risk)
  IF derivativesChange > 8 AND price24h > 1   → SHORT_SQUEEZE_RISK (momentum continuation)
  IF derivativesChange < -8 AND price24h < -1 → DELEVERAGING (capitulation event)
  IF derivativesChange < -5 AND price24h > 1  → NEUTRAL (organic spot buying)
  ELSE                                         → NEUTRAL

## Social / On-Chain Divergence Proxy
  divergenceScore = pct24h - (pct7d / 7)
  
  IF divergenceScore > 5 AND pct7d < 2   → DISTRIBUTION (pump on flat trend)
  IF divergenceScore < -5 AND pct7d > 3  → TREND_EXHAUSTION (momentum fading)
  IF divergenceScore < -5 AND pct24h < -2 AND pct7d < -3 → ACCUMULATION
  IF divergenceScore > 3 AND pct7d > 5   → BREAKOUT (confirmed)
  ELSE                                   → NEUTRAL

## Strategy Output Format
Return a JSON object with this exact structure:

{
  "asset": "BTC",
  "timeframe": "1d",
  "riskTolerance": "moderate",
  "regime": "BULL_TREND",
  "regimeConfidence": 78,
  "regimeReason": "...",
  "price": 67400.00,
  "signals": {
    "momentum": "BULLISH",
    "momentumScore": 4.250,
    "sentiment": "GREEDY",
    "volatilityLevel": "MODERATE",
    "btcDominance": "ALT_SEASON",
    "fundingSignal": "NEUTRAL",
    "fundingSignalDesc": "...",
    "socialDivergence": "BREAKOUT",
    "socialDivergenceDesc": "..."
  },
  "strategy": {
    "name": "BTC Momentum Long — Bull Trend",
    "type": "MOMENTUM_LONG",
    "entryRules": ["..."],
    "exitRules": {
      "stopLoss": "$65,200.00",
      "target1": "$70,096.00",
      "target2": "$72,792.00",
      "target3": "$76,836.00",
      "trailingStop": "..."
    },
    "positionSizing": {
      "recommendedSize": "25% of portfolio",
      "maxDrawdown": "2.5% per trade",
      "kellyFraction": "12.5%"
    },
    "indicators": { "RSI": {"period": 14, "signal": "..."}, ... },
    "riskReward": "1.85",
    "notes": ["..."]
  }
}

## BNB-Native Mode
When user specifies BNB Chain context, focus analysis on BEP-20 eligible tokens:
BNB, CAKE (PancakeSwap), TWT (Trust Wallet Token), FLOKI, BABYDOGE, XVS (Venus), 
ALPACA, CHESS, BAKE, BURGER — all available on BNB Chain DEXs.
Apply the same regime detection algorithm but note higher volatility characteristics 
and smaller liquidity pools when sizing positions.

## Rules
- NEVER recommend specific dollar amounts or guaranteed returns
- ALWAYS include a stop loss in every strategy
- For HIGH_VOLATILITY regime, always recommend reducing position sizes by 50-70%
- Strategies are for informational purposes only — not financial advice
- All outputs must be backtestable with historical OHLCV data`;

const OPENAI_SKILL_FORMAT = {
  model: "gpt-4o",
  messages: [
    {
      role: "system",
      content: MARKETMIND_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: "Analyze BTC on the 1d timeframe with moderate risk tolerance. Current price: $67,400. 1h: +0.8%, 24h: +2.3%, 7d: +8.1%. Fear & Greed: 72 (Greed). BTC Dominance: 52.3%. Derivatives volume change: +3.2%.",
    },
  ],
  temperature: 0.3,
  response_format: { type: "json_object" },
};

const BNB_TOKENS = [
  { symbol: "BNB", name: "BNB", id: 1839, note: "Native gas token — largest liquidity" },
  { symbol: "CAKE", name: "PancakeSwap", id: 7186, note: "DEX governance — BNB ecosystem DeFi" },
  { symbol: "TWT", name: "Trust Wallet Token", id: 10603, note: "Hackathon partner token" },
  { symbol: "FLOKI", name: "Floki", id: 10804, note: "BEP-20 meme — high volatility" },
  { symbol: "XVS", name: "Venus", id: 7836, note: "BNB Chain DeFi lending" },
  { symbol: "ALPACA", name: "Alpaca Finance", id: 9028, note: "Leveraged yield on BNB" },
  { symbol: "BSW", name: "Biswap", id: 11092, note: "BNB DEX — low slippage" },
  { symbol: "BABYDOGE", name: "Baby Doge Coin", id: 10407, note: "BEP-20 community token" },
  { symbol: "BAKE", name: "BakeryToken", id: 7552, note: "BNB DeFi + NFT" },
  { symbol: "BURGER", name: "Burger Swap", id: 7898, note: "AMM on BNB Chain" },
];

export default function SkillSpecPage() {
  const [activeTab, setActiveTab] = useState<"spec" | "prompt" | "bnb">("spec");

  const skillCopy = useCopy("Copy Skill Prompt");
  const jsonCopy  = useCopy("Copy JSON Format");
  const llmCopy   = useCopy("Try in LLM — Starter Prompt");

  const handleCopySkill = () => skillCopy.copy(MARKETMIND_SYSTEM_PROMPT, "Skill System Prompt");
  const handleCopyJson  = () => jsonCopy.copy(JSON.stringify(OPENAI_SKILL_FORMAT, null, 2), "OpenAI JSON Format");
  const handleTryInLLM  = () => {
    const prompt = `Act as the MarketMind trading strategy AI. Use the following system prompt exactly:\n\n${MARKETMIND_SYSTEM_PROMPT}\n\n---\nNow analyze BTC on the 1d timeframe with moderate risk tolerance. Current price: $67,400. 1h: +0.8%, 24h: +2.3%, 7d: +8.1%. Fear & Greed: 72 (Greed). BTC Dominance: 52.3%. Derivatives volume change: +3.2%.`;
    llmCopy.copy(prompt, "Try in LLM — Starter Prompt");
  };

  const copiedSkill = skillCopy.copied;
  const copiedJson  = jsonCopy.copied;
  const copiedLLM   = llmCopy.copied;

  // Which modal to show (only one at a time)
  const activeModal = skillCopy.modalText
    ? { text: skillCopy.modalText, label: skillCopy.modalLabel, close: skillCopy.closeModal }
    : jsonCopy.modalText
    ? { text: jsonCopy.modalText, label: jsonCopy.modalLabel, close: jsonCopy.closeModal }
    : llmCopy.modalText
    ? { text: llmCopy.modalText, label: llmCopy.modalLabel, close: llmCopy.closeModal }
    : null;

  return (
    <div>
      {activeModal && <CopyModal text={activeModal.text} label={activeModal.label} onClose={activeModal.close} />}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--accent)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
              MARKETMIND SKILL SPECIFICATION
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              CMC AI Agent Hub Skill — Track 2: Strategy Skills — BNB Chain × CMC × Trust Wallet Hackathon 2026
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span className="badge-bull" style={{ padding: "4px 10px", fontSize: "10px", letterSpacing: "0.06em" }}>v1.0.0</span>
            <span style={{ background: "var(--surface)", color: "#0088ff", border: "1px solid #0088ff", padding: "4px 10px", fontSize: "10px" }}>CMC POWERED</span>
            <button
              className="btn"
              onClick={handleCopySkill}
              style={{
                fontSize: "10px",
                padding: "4px 12px",
                color: copiedSkill ? "var(--green)" : "var(--accent)",
                borderColor: copiedSkill ? "var(--green)" : "var(--accent)",
                letterSpacing: "0.06em",
              }}
            >
              {copiedSkill ? "✓ COPIED" : "⎘ COPY SKILL"}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleTryInLLM}
              style={{ fontSize: "10px", padding: "4px 12px", letterSpacing: "0.06em" }}
            >
              {copiedLLM ? "✓ PROMPT COPIED" : "↗ TRY IN LLM"}
            </button>
          </div>
        </div>
        {copiedLLM && (
          <div style={{ marginTop: "8px", color: "var(--text-dim)", fontSize: "10px" }}>
            Prompt copied. Paste into ChatGPT, Claude, Gemini, or any LLM (Ctrl+V / ⌘V).
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0", marginTop: "16px", borderBottom: "1px solid var(--border)" }}>
          {[
            { id: "spec", label: "SKILL OVERVIEW" },
            { id: "prompt", label: "LLM SYSTEM PROMPT" },
            { id: "bnb", label: "BNB-NATIVE MODE" },
          ].map((tab) => (
            <button
              key={tab.id}
              className="btn"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                fontSize: "10px",
                padding: "6px 14px",
                borderColor: "transparent",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
                color: activeTab === tab.id ? "var(--accent)" : "var(--text-dim)",
                background: "transparent",
                letterSpacing: "0.06em",
                borderRadius: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "spec" && <SpecTab />}
      {activeTab === "prompt" && <PromptTab onCopyJson={handleCopyJson} copiedJson={copiedJson} onCopySkill={handleCopySkill} copiedSkill={copiedSkill} onTryInLLM={handleTryInLLM} copiedLLM={copiedLLM} />}
      {activeTab === "bnb" && <BNBTab />}
    </div>
  );
}

function SpecTab() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      {/* Left column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Section title="SKILL OVERVIEW">
          <Row label="Skill Name" value="MarketMind" />
          <Row label="Type" value="Strategy Generation" />
          <Row label="Track" value="Track 2 — Strategy Skills" />
          <Row label="Data Source" value="CoinMarketCap AI Agent Hub" />
          <Row label="Execution Layer" value="None (backtestable spec only)" />
          <Row label="Output" value="Structured JSON strategy spec" />
          <Row label="Skill Version" value="1.0.0" />
        </Section>

        <Section title="DATA INPUTS">
          <SpecBlock
            label="Primary: CoinMarketCap (via Agent Hub)"
            items={[
              "Real-time price data: open, high, low, close",
              "24h volume and market cap",
              "% change: 1h, 24h, 7d, 30d",
              "CMC rank and dominance",
              "Global market metrics (BTC/ETH dominance, total market cap)",
              "Derivatives volume 24h + % change",
              "Active cryptocurrency count and exchange count",
            ]}
          />
          <SpecBlock
            label="Secondary: Alternative.me Fear & Greed Index"
            items={[
              "Daily Fear & Greed value (0–100)",
              "Classification: Extreme Fear → Extreme Greed",
              "7-day historical F&G for trend analysis",
            ]}
          />
        </Section>

        <Section title="REGIME DETECTION ALGORITHM">
          <CodeBlock code={`// MarketMind Regime Detection
// Input: price changes, F&G, BTC dominance

momentumScore = (pct1h × 0.2) + (pct24h × 0.5) + (pct7d × 0.3)
volatility = |pct1h| + |pct24h - pct7d|

if volatility > 15:
  → HIGH_VOLATILITY
    confidence = min(95, 60 + volatility)

elif momentumScore > 3 AND fg > 60 AND btcDom < 55:
  → BULL_TREND
    confidence = min(92, 55 + momentumScore × 2)

elif momentumScore < -3 AND fg < 40:
  → BEAR_TREND
    confidence = min(92, 55 + |momentumScore| × 2)

else:
  → RANGING
    confidence = min(85, 50 + |10 - volatility| × 2)`} />
        </Section>

        <Section title="DERIVATIVES SIGNAL (NEW)">
          <CodeBlock code={`// Funding Rate Proxy via Global Derivatives Volume
// derivativesChange = derivatives24hPercentageChange

if derivChange > 8 AND price24h < -1:
  → LONG_CROWDED (cascade liquidation risk)

if derivChange > 8 AND price24h > 1:
  → SHORT_SQUEEZE_RISK (momentum continuation)

if derivChange < -8 AND price24h < -1:
  → DELEVERAGING (capitulation event)

if derivChange < -5 AND price24h > 1:
  → NEUTRAL (organic spot buying — bullish)

else:
  → NEUTRAL`} />
        </Section>
      </div>

      {/* Right column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Section title="STRATEGY OUTPUTS PER REGIME">
          {[
            {
              regime: "BULL_TREND",
              badge: "badge-bull",
              label: "BULL TREND",
              strategy: "MOMENTUM LONG",
              rules: [
                "Entry: 0.5% pullback from current price",
                "Confirm: RSI(14) > 50, MACD histogram expanding",
                "Volume: > 20-period average at entry",
                "Stop Loss: 2.5% below entry (risk-adjusted)",
                "Targets: T1 +4%, T2 +8%, T3 +14% (trail)",
                "Position: 25% portfolio (half-Kelly sizing)",
              ],
            },
            {
              regime: "BEAR_TREND",
              badge: "badge-bear",
              label: "BEAR TREND",
              strategy: "CASH / MEAN REVERSION SHORT",
              rules: [
                "Primary: Move to stablecoins (USDT/USDC)",
                "Short entry: dead-cat bounce to resistance",
                "Confirm: RSI(14) < 45, MACD below zero",
                "Stop Loss: 2.5% above short entry",
                "Targets: T1 -4%, T2 -8% cover",
                "Re-entry: F&G recovers > 45 AND 4h RSI > 50",
              ],
            },
            {
              regime: "RANGING",
              badge: "badge-ranging",
              label: "RANGING",
              strategy: "GRID / OSCILLATOR",
              rules: [
                "Identify 6% range (±3% from current price)",
                "5 grid levels within range",
                "Buy at lower quartile: RSI(14) < 40",
                "Sell at upper quartile: RSI(14) > 60",
                "Stop: range breakdown > 3% below support",
                "Switch to Bull/Bear on confirmed breakout",
              ],
            },
            {
              regime: "HIGH_VOLATILITY",
              badge: "badge-highvol",
              label: "HIGH VOLATILITY",
              strategy: "VOLATILITY DEFENSE",
              rules: [
                "Reduce all positions by 50–70%",
                "Park capital in stablecoins",
                "Max 10% position size while active",
                "Hard stop: 1% max loss per trade",
                "Wait for ATR compression before re-entering",
                "Reassess after Bollinger Bands narrow",
              ],
            },
          ].map((item) => (
            <div key={item.regime} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span className={item.badge} style={{ fontSize: "10px", padding: "2px 8px" }}>{item.label}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{item.strategy}</span>
              </div>
              {item.rules.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "3px" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{">"}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{r}</span>
                </div>
              ))}
            </div>
          ))}
        </Section>

        <Section title="BACKTESTING PARAMETERS">
          <Row label="Benchmark" value="Buy & Hold (same asset)" />
          <Row label="Starting Capital" value="$10,000 (notional)" />
          <Row label="Transaction Cost" value="0.1% per trade (conservative)" />
          <Row label="Slippage" value="0.05% per trade" />
          <Row label="Rebalance Frequency" value="On regime change signal" />
          <Row label="Drawdown Gate" value="30% max drawdown → halt & review" />
          <Row label="Min Trade Frequency" value="1 per regime period" />
          <Row label="Data Required" value="OHLCV + F&G (7d min)" />
        </Section>

        <Section title="SOCIAL DIVERGENCE SIGNALS (NEW)">
          <CodeBlock code={`// Social/On-chain Divergence Proxy
// Uses 24h vs normalized 7d momentum divergence

divergenceScore = pct24h - (pct7d / 7)

if divergenceScore > 5 AND pct7d < 2:
  → DISTRIBUTION (pump on flat trend — reduce)

if divergenceScore < -5 AND pct7d > 3:
  → TREND_EXHAUSTION (momentum fading — prepare exit)

if divergenceScore < -5 AND pct24h < -2 AND pct7d < -3:
  → ACCUMULATION (oversell vs trend — contrarian buy)

if divergenceScore > 3 AND pct7d > 5:
  → BREAKOUT (confirmed — trend aligned)

else:
  → NEUTRAL`} />
        </Section>
      </div>
    </div>
  );
}

function PromptTab({ onCopyJson, copiedJson, onCopySkill, copiedSkill, onTryInLLM, copiedLLM }: {
  onCopyJson: () => void;
  copiedJson: boolean;
  onCopySkill: () => void;
  copiedSkill: boolean;
  onTryInLLM: () => void;
  copiedLLM: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em" }}>
            DEPLOYABLE SYSTEM PROMPT — PLAIN TEXT
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn"
              onClick={onCopySkill}
              style={{
                fontSize: "10px",
                padding: "4px 12px",
                color: copiedSkill ? "var(--green)" : "var(--text-muted)",
                borderColor: copiedSkill ? "var(--green)" : "var(--border-strong)",
                letterSpacing: "0.06em",
              }}
            >
              {copiedSkill ? "✓ COPIED" : "⎘ COPY SKILL PROMPT"}
            </button>
            <button
              className="btn btn-primary"
              onClick={onTryInLLM}
              style={{ fontSize: "10px", padding: "4px 12px", letterSpacing: "0.06em" }}
            >
              {copiedLLM ? "✓ PROMPT COPIED" : "↗ TRY IN LLM"}
            </button>
          </div>
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "10px" }}>
          Paste this into ChatGPT, Claude, Gemini, or any CMC AI Agent Hub — no modification needed.
        </div>
        <pre
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "14px",
            fontSize: "10px",
            color: "var(--accent)",
            overflowX: "auto",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            maxHeight: "420px",
            overflowY: "auto",
          }}
        >
          {MARKETMIND_SYSTEM_PROMPT}
        </pre>
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em" }}>
            OPENAI API FORMAT — COPY-PASTE READY
          </div>
          <button
            className="btn"
            onClick={onCopyJson}
            style={{
              fontSize: "10px",
              padding: "4px 12px",
              color: copiedJson ? "var(--green)" : "var(--text-muted)",
              borderColor: copiedJson ? "var(--green)" : "var(--border-strong)",
              letterSpacing: "0.06em",
            }}
          >
            {copiedJson ? "✓ COPIED JSON" : "⎘ COPY JSON FORMAT"}
          </button>
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "10px" }}>
          Ready-to-use OpenAI Chat Completions format with example user message. Set your API key and call.
        </div>
        <pre
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            padding: "14px",
            fontSize: "10px",
            color: "#0088ff",
            overflowX: "auto",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {JSON.stringify(OPENAI_SKILL_FORMAT, null, 2)}
        </pre>
      </div>

      <div className="panel">
        <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
          CMC AI AGENT HUB INTEGRATION
        </div>
        {[
          { step: "1", label: "Register Skill", desc: "Submit MarketMind to CMC AI Agent Hub with this system prompt as the skill definition" },
          { step: "2", label: "Bind CMC Data", desc: "Map CMC endpoint outputs to the template variables: {asset}, {price}, {pct24h}, {fg_value}, {btc_dom}" },
          { step: "3", label: "Trigger on Data", desc: "Configure auto-trigger: run regime analysis when 24h price change exceeds ±3% on any tracked asset" },
          { step: "4", label: "Output Strategy", desc: "MarketMind returns structured JSON spec — display in dashboard, push to Telegram, or feed to execution layer" },
        ].map((item) => (
          <div key={item.step} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
            <div style={{
              width: "22px",
              height: "22px",
              background: "var(--accent)",
              color: "#0B0E11",
              fontSize: "11px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>{item.step}</div>
            <div>
              <div style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>{item.label}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BNBTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="panel" style={{ border: "1px solid rgba(240,185,11,0.3)" }}>
        <div style={{ color: "var(--accent)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "8px" }}>
          BNB-NATIVE STRATEGY MODE
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: 1.7 }}>
          MarketMind includes a dedicated BNB Chain strategy mode for the BNB Chain × CMC × Trust Wallet Hackathon 2026.
          The same regime detection algorithm applies to BEP-20 eligible tokens, with adjustments for BNB ecosystem
          characteristics: higher volatility, smaller liquidity pools, BNB gas dependency, and Trust Wallet user base.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="panel">
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
            BEP-20 ELIGIBLE TOKENS
          </div>
          {BNB_TOKENS.map((token) => (
            <div key={token.symbol} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 700 }}>{token.symbol}</span>
                  <span style={{ color: "var(--accent)", fontSize: "10px" }}>◈</span>
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "10px" }}>{token.name}</div>
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "10px", textAlign: "right", maxWidth: "140px" }}>
                {token.note}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
              BNB MODE ADJUSTMENTS
            </div>
            {[
              { label: "Position Size", value: "Reduce by 20–30% vs large-cap", color: "var(--yellow)" },
              { label: "Stop Loss", value: "Widen by 1.5x (higher volatility)", color: "var(--yellow)" },
              { label: "Volume Signal", value: "Require 2× normal vol to confirm", color: "var(--text-muted)" },
              { label: "Regime Threshold", value: "Lower momentum threshold: 2.5 (vs 3)", color: "var(--text-muted)" },
              { label: "Gas Context", value: "BNB price affects all BEP-20 trades", color: "var(--accent)" },
              { label: "Trust Wallet", value: "TWT price correlates with activity", color: "var(--accent)" },
              { label: "DEX Liquidity", value: "Use PancakeSwap depth as proxy", color: "var(--text-muted)" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "4px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.04em" }}>
                  {item.label.toUpperCase()}
                </span>
                <span style={{ color: item.color, fontSize: "10px" }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
              BNB SYSTEM PROMPT EXTENSION
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "8px" }}>
              Append this to the base system prompt when analyzing BNB-native tokens:
            </div>
            <pre
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: "10px 12px",
                fontSize: "10px",
                color: "var(--accent)",
                overflowX: "auto",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}
            >
{`## BNB Chain Context
You are analyzing a BNB-native BEP-20 token.
Apply the following adjustments:
- Position size: reduce by 25%
- Stop loss: widen by 1.5x
- Volume threshold: 2x normal
- Note BNB gas costs in entry rules
- Check CAKE (PancakeSwap) liquidity
- TWT correlation if applicable
- Smaller caps = wider bid/ask spreads
Output the same JSON strategy format
with an additional "bnbAdjustments" field.`}
            </pre>
          </div>

          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
              HACKATHON CONTEXT
            </div>
            {[
              { label: "Track", value: "Track 2 — Strategy Skills" },
              { label: "Organizers", value: "BNB Chain × CMC × Trust Wallet" },
              { label: "Prize Pool", value: "$3k / $2k / $1k (1st/2nd/3rd)" },
              { label: "No Execution", value: "Strategy spec only — no on-chain txs" },
              { label: "CMC Required", value: "All data from CMC AI Agent Hub" },
              { label: "Build Window", value: "Ends June 21, 2026" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{item.label.toUpperCase()}</span>
                <span style={{ color: "var(--text)", fontSize: "11px" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px", flexWrap: "wrap", gap: "4px" }}>
      <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.04em" }}>{label.toUpperCase()}</span>
      <span style={{ color: "var(--text)", fontSize: "11px" }}>{value}</span>
    </div>
  );
}

function SpecBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "6px" }}>{label}</div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
          <span style={{ color: "var(--accent)", fontSize: "10px" }}>+</span>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        padding: "10px 12px",
        fontSize: "10px",
        color: "var(--accent)",
        overflowX: "auto",
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}
    >
      {code}
    </pre>
  );
}
