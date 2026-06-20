export default function AboutPage() {
  return (
    <div>
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ color: "var(--accent)", fontSize: "24px", fontWeight: 700, letterSpacing: "0.1em" }}>
          MARKET<span style={{ color: "var(--text)" }}>MIND</span>
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
          Regime-Aware Multi-Signal Trading Strategy Skill
        </div>
        <div style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "2px" }}>
          Built for BNB Chain × CoinMarketCap × Trust Wallet Hackathon 2026 — Track 2: Strategy Skills
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>WHAT IS MARKETMIND?</div>
            <div style={{ color: "var(--text)", fontSize: "12px", lineHeight: 1.8 }}>
              MarketMind is a CMC-powered LLM Skill that classifies the current market regime
              and outputs a fully-specified, backtestable trading strategy — not a chat response,
              a <span style={{ color: "var(--accent)" }}>machine-readable strategy document</span> with
              exact entry prices, stop-loss levels, position sizes, and indicator triggers.
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: 1.8, marginTop: "10px" }}>
              This is not "CMC data + ChatGPT summary." The skill runs a{" "}
              <span style={{ color: "var(--accent)" }}>6-signal composite engine</span> —
              momentum, volatility (Bollinger Width proxy), volume confirmation, BTC dominance bands,
              funding rate proxy, and F&G trend — to determine regime first,
              then applies regime-specific strategy logic, not generic advice.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
              {[
                "Regime classifier — not a raw data passthrough",
                "Backtestable spec output (entry, SL, TP, sizing — all numeric)",
                "6-signal composite: momentum + vol + volume + dom + funding + sentiment",
                "Volume confirmation layer filters false breakouts",
                "Dynamic BTC dominance bands (48/54%) — adapts to 2024 vs 2021 conditions",
                "30d momentum weighting eliminates 1h/24h timeframe overlap",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", fontSize: "11px", marginTop: "1px" }}>▸</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{line}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>WHY REGIME DETECTION?</div>
            <div style={{ color: "var(--text-dim)", fontSize: "11px", lineHeight: 1.7, marginBottom: "12px" }}>
              Every strategy has a regime it works in — and one it blows up in.
              Most tools ignore this. MarketMind doesn't.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { problem: "Momentum long in a ranging market = death by chop", solution: "Switch to grid/oscillator when momentum score is flat" },
                { problem: "Grid trading in a trend = runaway drawdown", solution: "Regime flip triggers full strategy replacement, not a tweak" },
                { problem: "Same signal strength regardless of conviction", solution: "Confidence score (55–95%) gates entry quality" },
                { problem: "Volume-less breakouts fool most indicators", solution: "Volume confirmation layer: <0.7× avg = LOW_CONVICTION flag" },
                { problem: "Static BTC dom threshold fails in new cycles", solution: "Dynamic 48/54% bands — calibrated to 2024 on-chain data" },
              ].map((item, i) => (
                <div key={i} style={{ padding: "8px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--red)", fontSize: "10px", marginBottom: "2px" }}>✗ {item.problem}</div>
                  <div style={{ color: "var(--green)", fontSize: "10px" }}>✓ {item.solution}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>HOW IT WORKS</div>
            {[
              { step: "01", title: "DATA INGESTION", desc: "Pulls real-time data from CMC Agent Hub: price, volume, % changes, global metrics, BTC dominance." },
              { step: "02", title: "SIGNAL COMPUTATION", desc: "Computes weighted momentum score, volatility spread, sentiment signal from Fear & Greed index." },
              { step: "03", title: "REGIME CLASSIFICATION", desc: "Classifies current regime: BULL_TREND, BEAR_TREND, RANGING, or HIGH_VOLATILITY with confidence score." },
              { step: "04", title: "STRATEGY GENERATION", desc: "Outputs regime-specific backtestable strategy: entry/exit rules, position sizing, stop-loss, indicators." },
              { step: "05", title: "RISK PARAMETERS", desc: "Applies user's risk tolerance (conservative/moderate/aggressive) to calibrate position sizes and drawdown limits." },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div style={{ color: "var(--accent)", fontSize: "13px", fontWeight: 700, minWidth: "24px" }}>{item.step}</div>
                <div>
                  <div style={{ color: "var(--text)", fontSize: "11px", fontWeight: 600, marginBottom: "2px" }}>{item.title}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>TECH STACK</div>
            {[
              { label: "Frontend", value: "React 19 + Vite + Tailwind CSS 4" },
              { label: "Backend", value: "Hono (Bun runtime)" },
              { label: "Market Data", value: "CMC Public API (via Agent Hub)" },
              { label: "Sentiment Data", value: "Alternative.me Fear & Greed" },
              { label: "Deployment", value: "Vercel (edge-ready)" },
              { label: "Skill Format", value: "CMC LLM Skill Spec (JSON)" },
              { label: "No Execution Layer", value: "Track 2 — strategy spec only" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{item.label.toUpperCase()}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>RESOURCES</div>
            {[
              { label: "CMC AI Agent Hub", url: "coinmarketcap.com/api/agent" },
              { label: "BNB AI Agent SDK", url: "github.com/bnb-chain/bnbagent-sdk" },
              { label: "Trust Wallet Agent Kit", url: "portal.trustwallet.com" },
              { label: "Hackathon Telegram", url: "t.me/+MhiOLT0YUnlmNWFk" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{item.label.toUpperCase()}</span>
                <a href={`https://${item.url}`} target="_blank" rel="noreferrer" style={{ color: "#0088ff", fontSize: "11px", textDecoration: "none" }}>
                  {item.url}
                </a>
              </div>
            ))}
          </div>

          {/* Built With */}
          <div className="panel" style={{ border: "1px solid rgba(240,185,11,0.25)" }}>
            <div style={{ color: "var(--accent)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "14px" }}>BUILT WITH</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {[
                { label: "BNB CHAIN", color: "#F0B90B", bg: "rgba(240,185,11,0.12)" },
                { label: "COINMARKETCAP API", color: "#3861FB", bg: "rgba(56,97,251,0.12)" },
                { label: "TRUST WALLET", color: "#0088FF", bg: "rgba(0,136,255,0.12)" },
                { label: "REACT 19", color: "#61DAFB", bg: "rgba(97,218,251,0.1)" },
                { label: "HONO", color: "#E36002", bg: "rgba(227,96,2,0.1)" },
                { label: "ALTERNATIVE.ME F&G", color: "#0ECB81", bg: "rgba(14,203,129,0.1)" },
                { label: "VITE", color: "#BD34FE", bg: "rgba(189,52,254,0.1)" },
                { label: "VERCEL", color: "#888", bg: "rgba(136,136,136,0.1)" },
              ].map((b) => (
                <div
                  key={b.label}
                  style={{
                    padding: "5px 12px",
                    border: `1px solid ${b.color}`,
                    background: b.bg,
                    color: b.color,
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                  }}
                >
                  {b.label}
                </div>
              ))}
            </div>
            <div style={{ marginTop: "14px", padding: "10px 12px", background: "rgba(240,185,11,0.06)", border: "1px dashed rgba(240,185,11,0.3)" }}>
              <div style={{ color: "var(--accent)", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "4px" }}>HACKATHON ENTRY</div>
              <div style={{ color: "var(--text-muted)", fontSize: "11px", lineHeight: 1.6 }}>
                Built for <strong style={{ color: "var(--accent)" }}>BNB Chain × CMC × Trust Wallet Hackathon 2026</strong> — Track 2: Strategy Skills.
                No execution layer, no wallet required. Pure regime-aware market intelligence, powered by CMC public data.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
