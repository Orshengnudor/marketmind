import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { regimeLabel } from "../lib/utils";

export default function StrategyExplainPage() {
  const [, navigate] = useLocation();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("mm_strategy_explain");
      if (raw) setResult(JSON.parse(raw));
    } catch {}
  }, []);

  if (!result) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "var(--text-dim)", fontSize: "13px", marginBottom: "16px" }}>
          No strategy loaded. Generate one first.
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/strategy")}>
          ← Back to Strategy
        </button>
      </div>
    );
  }

  const s = result.strategy;
  const sig = result.signals;

  const REGIME_COLOR: Record<string, string> = {
    BULL_TREND: "var(--green)",
    BEAR_TREND: "var(--red)",
    RANGING: "var(--yellow)",
    HIGH_VOLATILITY: "#8855ff",
  };
  const regimeColor = REGIME_COLOR[result.regime] ?? "var(--accent)";

  // Plain-english regime summary
  const regimeSummary: Record<string, string> = {
    BULL_TREND: `${result.asset} is in a confirmed uptrend. Momentum is positive across multiple timeframes and market sentiment is supportive. The strategy is to ride the trend with defined entry and exit levels.`,
    BEAR_TREND: `${result.asset} is trending downward. The priority here is capital preservation — move most of your position to stablecoins and only take short trades on dead-cat bounces with tight stops.`,
    RANGING: `${result.asset} has no clear direction right now. It's bouncing between support and resistance. The play is to buy the low end of the range and sell the high end, using a grid approach.`,
    HIGH_VOLATILITY: `${result.asset} is in a high-volatility environment. This is not the time to take big positions. Reduce exposure, park capital in stablecoins, and wait for volatility to compress before re-entering.`,
  };

  // Signal plain descriptions
  function momentumText() {
    const score = sig.momentumScore;
    if (score > 10) return `Very strong bullish momentum (score: +${score.toFixed(1)}). The 30-day trend is dominant.`;
    if (score > 2.5) return `Moderate bullish momentum (score: +${score.toFixed(1)}). Short-term is positive.`;
    if (score < -10) return `Very strong bearish momentum (score: ${score.toFixed(1)}). Trend is firmly down.`;
    if (score < -2.5) return `Moderate bearish momentum (score: ${score.toFixed(1)}). Short-term is negative.`;
    return `Momentum is neutral (score: ${score.toFixed(1)}). No strong directional bias.`;
  }

  function sentimentText() {
    const fg = result.fearGreedValue;
    if (fg >= 80) return `Extreme Greed (${fg}/100) — the market is euphoric. Historically a warning sign to tighten stops.`;
    if (fg >= 60) return `Greed (${fg}/100) — sentiment is positive, supporting bullish moves.`;
    if (fg >= 40) return `Neutral (${fg}/100) — no strong sentiment signal either way.`;
    if (fg >= 20) return `Fear (${fg}/100) — investors are nervous. Can be a buying opportunity if fundamentals are intact.`;
    return `Extreme Fear (${fg}/100) — market-wide panic. These levels have historically preceded reversals.`;
  }

  function btcDomText() {
    const dom = result.btcDominance;
    const state = sig.btcDominanceState;
    if (state === "BTC_DOMINANT") return `BTC dominance is high at ${dom}%. Capital is flowing into Bitcoin and away from altcoins — a headwind for ${result.asset}.`;
    if (state === "ALT_SEASON") return `BTC dominance is low at ${dom}%. Capital is rotating into altcoins — a tailwind for ${result.asset}.`;
    return `BTC dominance is neutral at ${dom}%. No strong rotation signal in either direction.`;
  }

  function volumeText() {
    const ratio = sig.volumeRatio;
    if (sig.volumeSignal === "CONFIRMED") return `Volume is ${ratio.toFixed(1)}× the 7-day average. The current price move is backed by real trading activity — this is a high-conviction signal.`;
    if (sig.volumeSignal === "LOW_CONVICTION") return `Volume is only ${ratio.toFixed(1)}× average. The price move lacks volume support — treat any breakout or breakdown with skepticism until volume picks up.`;
    return `Volume is ${ratio.toFixed(1)}× average — normal range. No unusual activity.`;
  }

  function derivativesText() {
    const sig2 = result.signals;
    if (sig2.fundingSignal === "LONG_CROWDED") return `Derivatives volume surged while price dropped. This means too many people were betting on price going up (overleveraged longs). There's a risk of a cascade of forced liquidations.`;
    if (sig2.fundingSignal === "SHORT_SQUEEZE_RISK") return `Derivatives volume is high and price is rising — short sellers are being forced to buy back, pushing price higher. Momentum may continue.`;
    if (sig2.fundingSignal === "DELEVERAGING") return `Derivatives volume is falling sharply alongside price. This is mass deleveraging — traders are closing positions in a panic. This can signal a capitulation bottom.`;
    return `Derivatives activity is normal. No unusual leverage or liquidation risk detected.`;
  }

  // Entry rules in plain english
  function entryExplain() {
    if (result.regime === "BULL_TREND") {
      return [
        `Wait for a small pullback of about 0.5% from the current price before entering. Don't chase the top.`,
        `Confirm with RSI above 50 on your chosen timeframe (stronger signal if RSI > 60).`,
        `MACD histogram should be positive and expanding — that confirms the upward push is real.`,
        sig.volumeSignal === "CONFIRMED"
          ? `Volume is strong right now — this is a good time to enter at full size.`
          : `Volume is not confirming yet — consider entering at half size and adding when volume picks up.`,
      ];
    }
    if (result.regime === "BEAR_TREND") {
      return [
        `Primary action: move to stablecoins (USDT/USDC). Capital preservation first.`,
        `If you want to short: wait for a dead-cat bounce — a temporary price recovery — before entering.`,
        `RSI should be below 45 and declining. Avoid shorting into extreme fear readings below 20.`,
        `EMA20 should be below EMA50 to confirm the downtrend is intact.`,
      ];
    }
    if (result.regime === "RANGING") {
      return [
        `The asset is trading in a defined range. Buy near support (${s.exitRules?.gridLevels?.[0] ?? "lower band"}) and sell near resistance (${s.exitRules?.profitTarget ?? "upper band"}).`,
        `Only buy when RSI is below 40 — that confirms the price is near the bottom of the range.`,
        `Only sell when RSI is above 60 — that confirms the price is near the top of the range.`,
        `If price closes outside the range with strong volume, exit grid positions and wait for a new setup.`,
      ];
    }
    return [
      `Do not enter new positions in this high-volatility environment.`,
      `Reduce existing positions by 50–70%.`,
      `Move capital to stablecoins and wait for volatility to compress (ATR falling for 2+ days).`,
    ];
  }

  // Stop loss explanation
  function stopExplain() {
    const sl = s.exitRules?.stopLoss ?? s.exitRules?.stopLoss;
    if (!sl) return null;
    return `Your stop loss is at ${sl}. This is calculated using the Average True Range (ATR) — a measure of how much the price typically moves in a day. If the price hits this level, the trade idea is wrong and you exit to protect your capital.`;
  }

  // Position sizing explanation
  function sizingExplain() {
    const ps = s.positionSizing;
    if (!ps) return null;
    return `Recommended position size is ${ps.recommendedSize}. Maximum drawdown per level is ${ps.maxDrawdown}. Daily risk limit is ${ps.dailyRiskLimit} of your portfolio. These numbers are sized for an aggressive risk profile — adjust down if you're uncomfortable with the drawdown.`;
  }

  const priceUp = result.priceChange24h >= 0;

  return (
    <div style={{ maxWidth: "740px", margin: "0 auto", padding: "0 0 40px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button
          className="btn"
          onClick={() => navigate("/strategy")}
          style={{ fontSize: "11px", padding: "5px 12px", letterSpacing: "0.06em" }}
        >
          ← BACK
        </button>
        <div>
          <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em" }}>STRATEGY BREAKDOWN</div>
          <div style={{ color: "var(--text)", fontSize: "16px", fontWeight: 700, letterSpacing: "0.04em" }}>
            {result.asset} — {result.timeframe.toUpperCase()} — {result.riskTolerance.toUpperCase()}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ color: regimeColor, fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em" }}>
            {regimeLabel(result.regime)}
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "10px" }}>{result.regimeConfidence}% confidence</div>
        </div>
      </div>

      {/* Price snapshot */}
      <div className="panel" style={{ marginBottom: "12px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "4px" }}>PRICE</div>
          <div style={{ color: "var(--text)", fontSize: "18px", fontWeight: 700 }}>
            ${result.price < 1 ? result.price.toFixed(6) : result.price.toFixed(2)}
          </div>
        </div>
        {[
          { label: "1H", val: result.priceChange1h },
          { label: "24H", val: result.priceChange24h },
          { label: "7D", val: result.priceChange7d },
          { label: "30D", val: result.priceChange30d },
        ].map(({ label, val }) => (
          <div key={label}>
            <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
            <div style={{ color: val >= 0 ? "var(--green)" : "var(--red)", fontSize: "14px", fontWeight: 600 }}>
              {val >= 0 ? "+" : ""}{val?.toFixed(2)}%
            </div>
          </div>
        ))}
        <div>
          <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "4px" }}>FEAR & GREED</div>
          <div style={{ color: result.fearGreedValue < 30 ? "var(--red)" : result.fearGreedValue > 65 ? "var(--green)" : "var(--yellow)", fontSize: "14px", fontWeight: 600 }}>
            {result.fearGreedValue} — {result.fearGreedClassification}
          </div>
        </div>
      </div>

      {/* Section: What's happening */}
      <Section title="WHAT'S HAPPENING RIGHT NOW">
        <p>{regimeSummary[result.regime]}</p>
        <p style={{ marginTop: "8px", color: "var(--text-dim)", fontSize: "11px" }}>
          <strong style={{ color: "var(--text-muted)" }}>Why this regime?</strong> {result.regimeReason}
        </p>
      </Section>

      {/* Section: Market signals */}
      <Section title="MARKET SIGNALS — PLAIN ENGLISH">
        <SignalRow label="Momentum" value={momentumText()} color={sig.momentum === "BULLISH" ? "var(--green)" : sig.momentum === "BEARISH" ? "var(--red)" : "var(--yellow)"} badge={sig.momentum} />
        <SignalRow label="Sentiment" value={sentimentText()} color={result.fearGreedValue < 30 ? "var(--red)" : result.fearGreedValue > 65 ? "var(--green)" : "var(--yellow)"} badge={result.fearGreedClassification.toUpperCase()} />
        <SignalRow label="BTC Dominance" value={btcDomText()} color={sig.btcDominanceState === "ALT_SEASON" ? "var(--green)" : sig.btcDominanceState === "BTC_DOMINANT" ? "var(--red)" : "var(--yellow)"} badge={sig.btcDominanceState.replace("_", " ")} />
        <SignalRow label="Volume" value={volumeText()} color={sig.volumeSignal === "CONFIRMED" ? "var(--green)" : sig.volumeSignal === "LOW_CONVICTION" ? "var(--red)" : "var(--yellow)"} badge={sig.volumeSignal.replace("_", " ")} />
        <SignalRow label="Derivatives" value={derivativesText()} color={sig.fundingSignal === "NEUTRAL" ? "var(--text-dim)" : "var(--yellow)"} badge={sig.fundingSignal.replace("_", " ")} />
      </Section>

      {/* Section: What to do */}
      <Section title={`WHAT TO DO — ${s.name.toUpperCase()}`}>
        <div style={{ marginBottom: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.06em", marginBottom: "8px" }}>ENTRY</div>
          {entryExplain().map((line, i) => (
            <BulletRow key={i} text={line} />
          ))}
        </div>

        {s.exitRules && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.06em", marginBottom: "8px" }}>EXITS & STOPS</div>
            {stopExplain() && <BulletRow text={stopExplain()!} accent="var(--red)" />}
            {s.exitRules.target1 && <BulletRow text={`Take profit target 1: ${s.exitRules.target1}`} accent="var(--green)" />}
            {s.exitRules.target2 && <BulletRow text={`Take profit target 2: ${s.exitRules.target2}`} accent="var(--green)" />}
            {s.exitRules.target3 && <BulletRow text={`Take profit target 3: ${s.exitRules.target3}`} accent="var(--green)" />}
            {s.exitRules.profitTarget && <BulletRow text={`Profit target: ${s.exitRules.profitTarget}`} accent="var(--green)" />}
            {s.exitRules.trailingStop && <BulletRow text={`Trailing stop: ${s.exitRules.trailingStop}`} />}
            {s.exitRules.breakoutAbove && <BulletRow text={`Breakout signal: ${s.exitRules.breakoutAbove}`} accent="var(--accent)" />}
            {s.exitRules.breakdownBelow && <BulletRow text={`Breakdown signal: ${s.exitRules.breakdownBelow}`} accent="var(--red)" />}
            {s.exitRules.timeExit && <BulletRow text={`Time exit: ${s.exitRules.timeExit}`} />}
          </div>
        )}

        {sizingExplain() && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.06em", marginBottom: "8px" }}>POSITION SIZING</div>
            <BulletRow text={sizingExplain()!} />
          </div>
        )}
      </Section>

      {/* Section: Grid levels (ranging only) */}
      {result.regime === "RANGING" && s.exitRules?.gridLevels && (
        <Section title="GRID LEVELS">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {s.exitRules.gridLevels.map((level: string, i: number) => (
              <div key={i} style={{
                background: "var(--nav-active-bg)",
                border: "1px solid var(--border-strong)",
                padding: "6px 12px",
                fontSize: "12px",
                color: "var(--accent)",
                fontWeight: 600,
              }}>
                L{i + 1}: {level}
              </div>
            ))}
          </div>
          <p style={{ marginTop: "10px" }}>
            Split your position evenly across these 5 price levels. As price dips to each level, buy that slice. As it rises, sell each slice near resistance. Stop out completely if price closes below {s.exitRules.stopLoss}.
          </p>
        </Section>
      )}

      {/* Section: Key notes */}
      {s.notes?.length > 0 && (
        <Section title="KEY NOTES">
          {s.notes.map((note: string, i: number) => (
            <BulletRow key={i} text={note} accent="var(--yellow)" />
          ))}
        </Section>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ color: "var(--text-dim)", fontSize: "10px" }}>
          Generated {new Date(result.generatedAt).toLocaleString()} · MarketMind v{result.skillVersion}
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/strategy")}
          style={{ fontSize: "10px", padding: "5px 14px", letterSpacing: "0.06em" }}
        >
          ← BACK TO STRATEGY
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel" style={{ marginBottom: "12px" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
        {title}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.7" }}>
        {children}
      </div>
    </div>
  );
}

function SignalRow({ label, value, color, badge }: { label: string; value: string; color: string; badge: string }) {
  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "12px", alignItems: "flex-start" }}>
      <div style={{ minWidth: "110px" }}>
        <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "3px" }}>{label.toUpperCase()}</div>
        <div style={{ color, fontSize: "10px", fontWeight: 700, letterSpacing: "0.04em" }}>{badge}</div>
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.6", flex: 1 }}>{value}</div>
    </div>
  );
}

function BulletRow({ text, accent }: { text: string; accent?: string }) {
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "flex-start" }}>
      <span style={{ color: accent ?? "var(--accent)", fontSize: "10px", marginTop: "3px", flexShrink: 0 }}>▸</span>
      <span style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.6" }}>{text}</span>
    </div>
  );
}
