import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCopy } from "../lib/useCopy";
import CopyModal from "../components/CopyModal";
import TokenModal from "../components/TokenModal";
import CoinSearch from "../components/CoinSearch";
import { api } from "../lib/api";
import { formatPrice, formatPct, pctColor, regimeBadgeClass, regimeLabel, getUSDQuote } from "../lib/utils";



export default function StrategyPage() {
  const [selectedAsset, setSelectedAsset] = useState<{ id: number; symbol: string; name: string } | null>(null);
  const [timeframe, setTimeframe] = useState("1d");
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [result, setResult] = useState<any>(null);
  const [chartCoin, setChartCoin] = useState<any>(null);

  const listing = useQuery({
    queryKey: ["listing-strategy"],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: "5000" } });
      return res.json();
    },
  });

  const global = useQuery({
    queryKey: ["global"],
    queryFn: async () => {
      const res = await api.market.global.$get();
      return res.json();
    },
  });

  const fg = useQuery({
    queryKey: ["fear-greed"],
    queryFn: async () => {
      const res = await api.market["fear-greed"].$get();
      return res.json();
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const coins = (listing.data as any)?.data?.cryptoCurrencyList ?? [];
      const coin = coins.find((c: any) => c.id === selectedAsset?.id) ?? coins[0];
      const res = await api.strategy.generate.$post({
        json: {
          asset: selectedAsset?.symbol ?? coin.symbol,
          assetId: selectedAsset?.id ?? coin.id,
          timeframe,
          riskTolerance,
          marketData: coin,
          globalData: global.data,
          fearGreedData: fg.data,
        },
      });
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  const coins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];

  // Auto-select first coin once listing loads
  if (coins.length > 0 && !selectedAsset) {
    const first = coins[0];
    setSelectedAsset({ id: first.id, symbol: first.symbol, name: first.name });
  }

  const selectedCoin = coins.find((c: any) => c.id === selectedAsset?.id);
  const q = getUSDQuote(selectedCoin);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* Left: Config Panel */}
        <div>
          <div className="panel">
            <div style={{ color: "var(--text-muted)", fontSize: "12px", letterSpacing: "0.08em", marginBottom: "16px" }}>
              STRATEGY PARAMETERS
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                ASSET
              </label>
              <CoinSearch
                coins={coins}
                value={selectedAsset}
                onChange={(coin) => setSelectedAsset({ id: coin.id, symbol: coin.symbol, name: coin.name })}
                loading={listing.isLoading}
                placeholder="Search by name or symbol..."
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                TIMEFRAME
              </label>
              <select
                className="term-input"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                {[
                  { value: "15m", label: "15 Minutes" },
                  { value: "1h", label: "1 Hour" },
                  { value: "4h", label: "4 Hours" },
                  { value: "1d", label: "1 Day" },
                  { value: "1w", label: "1 Week" },
                ].map((tf) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                RISK TOLERANCE
              </label>
              <div style={{ display: "flex", gap: "0" }}>
                {["conservative", "moderate", "aggressive"].map((r) => (
                  <button
                    key={r}
                    className="btn"
                    onClick={() => setRiskTolerance(r)}
                    style={{
                      flex: 1,
                      fontSize: "10px",
                      padding: "6px 4px",
                      borderColor: riskTolerance === r ? "var(--accent)" : "var(--border-strong)",
                      color: riskTolerance === r ? "var(--accent)" : "var(--text-dim)",
                      background: riskTolerance === r ? "var(--nav-active-bg)" : "transparent",
                    }}
                  >
                    {r.toUpperCase().slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Asset Preview */}
            {selectedCoin && (
              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: "12px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "8px", letterSpacing: "0.06em" }}>
                  ASSET SNAPSHOT
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
                      {selectedAsset?.symbol}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{selectedCoin.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: 600 }}>{formatPrice(q.price)}</div>
                    <div className={pctColor(q.percentChange24h)} style={{ fontSize: "11px" }}>
                      {formatPct(q.percentChange24h)} 24h
                    </div>
                    <button
                      onClick={() => setChartCoin(selectedCoin)}
                      style={{ marginTop: "4px", background: "none", border: "1px solid var(--border)", color: "var(--text-dim)", fontSize: "9px", padding: "2px 7px", cursor: "pointer", letterSpacing: "0.06em" }}
                    >
                      ▣ CHART
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "4px", marginTop: "10px" }}>
                  {[
                    { label: "1H",  val: q.percentChange1h },
                    { label: "24H", val: q.percentChange24h },
                    { label: "7D",  val: q.percentChange7d },
                    { label: "30D", val: q.percentChange30d },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: "center", padding: "4px", background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "9px", color: "var(--text-dim)" }}>{item.label}</div>
                      <div className={pctColor(item.val)} style={{ fontSize: "11px" }}>
                        {formatPct(item.val ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px", fontSize: "12px", letterSpacing: "0.1em" }}
              onClick={() => generate.mutate()}
              disabled={generate.isPending || listing.isLoading}
            >
              {generate.isPending ? (
                <span>ANALYZING REGIME<span className="cursor-blink">_</span></span>
              ) : (
                "▶ GENERATE STRATEGY"
              )}
            </button>

            {listing.isLoading && (
              <div style={{ color: "var(--text-dim)", fontSize: "10px", textAlign: "center", marginTop: "8px" }}>
                Loading market data<span className="cursor-blink">...</span>
              </div>
            )}
          </div>

          {/* Signal Summary */}
          {result && (
            <div className="panel" style={{ marginTop: "12px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "12px", letterSpacing: "0.08em", marginBottom: "12px" }}>
                SIGNAL SUMMARY
              </div>
              {[
                { label: "MOMENTUM", value: result.signals.momentum, color: result.signals.momentum === "BULLISH" ? "var(--green)" : result.signals.momentum === "BEARISH" ? "var(--red)" : "var(--yellow)" },
                { label: "SENTIMENT", value: result.signals.sentiment, color: result.signals.sentiment === "GREEDY" ? "var(--red)" : result.signals.sentiment === "FEARFUL" ? "var(--green)" : "var(--text-muted)" },
                { label: "VOLATILITY", value: result.signals.volatilityLevel, color: result.signals.volatilityLevel === "HIGH" ? "var(--red)" : result.signals.volatilityLevel === "MODERATE" ? "var(--yellow)" : "var(--green)" },
                { label: "BTC DOM", value: result.signals.btcDominanceState, color: result.signals.btcDominanceState === "ALT_SEASON" ? "var(--green)" : result.signals.btcDominanceState === "BTC_DOMINANT" ? "var(--yellow)" : "var(--text-muted)" },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em" }}>{s.label}</span>
                  <span style={{ color: s.color, fontSize: "11px", fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
              {/* Funding Rate Signal */}
              <div style={{ marginTop: "4px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>FUNDING / DERIVATIVES</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>SIGNAL</span>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: result.signals.fundingSignal === "LONG_CROWDED" ? "var(--red)"
                      : result.signals.fundingSignal === "SHORT_SQUEEZE_RISK" ? "var(--green)"
                      : result.signals.fundingSignal === "DELEVERAGING" ? "#ff6644"
                      : "var(--text-muted)",
                  }}>{result.signals.fundingSignal}</span>
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", lineHeight: 1.5 }}>
                  {result.signals.fundingSignalDesc}
                </div>
              </div>
              {/* Momentum Divergence */}
              <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>MOMENTUM DIVERGENCE</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>PATTERN</span>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: result.signals.momentumDivergence === "DISTRIBUTION" ? "var(--red)"
                      : result.signals.momentumDivergence === "TREND_EXHAUSTION" ? "var(--yellow)"
                      : result.signals.momentumDivergence === "BREAKOUT" ? "var(--green)"
                      : result.signals.momentumDivergence === "ACCUMULATION" ? "#0088ff"
                      : "var(--text-muted)",
                  }}>{result.signals.momentumDivergence}</span>
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", lineHeight: 1.5 }}>
                  {result.signals.momentumDivergenceDesc}
                </div>
              </div>
              {/* Volume Confirmation */}
              <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>VOLUME CONFIRMATION</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>SIGNAL</span>
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: result.signals.volumeSignal === "HIGH_VOLUME_CONFIRM" ? "var(--green)"
                      : result.signals.volumeSignal === "LOW_VOLUME_WARN" ? "var(--yellow)"
                      : result.signals.volumeSignal === "CLIMAX_VOLUME" ? "var(--red)"
                      : "var(--text-muted)",
                  }}>{result.signals.volumeSignal}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>VOL RATIO</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "10px", fontWeight: 600 }}>
                    {result.signals.volumeRatio != null ? `${result.signals.volumeRatio.toFixed(2)}x` : "—"}
                  </span>
                </div>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", lineHeight: 1.5 }}>
                  {result.signals.volumeSignalDesc}
                </div>
              </div>
              <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>MOMENTUM SCORE</span>
                  <span style={{ color: result.signals.momentumScore > 0 ? "var(--green)" : "var(--red)", fontSize: "12px", fontWeight: 700 }}>
                    {result.signals.momentumScore > 0 ? "+" : ""}{result.signals.momentumScore.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Strategy Output */}
        <div>
          {!result && !generate.isPending && (
            <div
              className="panel"
              style={{
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.3 }}>◉</div>
              <div style={{ fontSize: "14px", letterSpacing: "0.1em", color: "var(--text-dim)" }}>SELECT ASSET AND GENERATE STRATEGY</div>
              <div style={{ fontSize: "11px", marginTop: "8px", color: "var(--text-dim)", opacity: 0.6 }}>
                MarketMind will detect the current regime and output a backtestable spec
              </div>
            </div>
          )}

          {generate.isPending && (
            <div className="panel" style={{ minHeight: "400px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ color: "var(--accent)", fontSize: "13px", letterSpacing: "0.1em", marginBottom: "12px" }}>
                  ANALYZING MARKET REGIME<span className="cursor-blink">_</span>
                </div>
                {["Fetching CMC market data...", "Computing momentum signals...", "Running regime classifier...", "Generating strategy spec..."].map((step, i) => (
                  <div key={i} style={{ color: "var(--text-dim)", fontSize: "11px", marginBottom: "4px" }}>
                    {">"} {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && <StrategyOutput result={result} />}
        </div>
      </div>
      {chartCoin && <TokenModal coin={chartCoin} onClose={() => setChartCoin(null)} />}
    </div>
  );
}

function StrategyOutput({ result }: { result: any }) {
  const s = result.strategy;
  const badgeClass = regimeBadgeClass(result.regime);
  const regLabel = regimeLabel(result.regime);
  const [modalCoin, setModalCoin] = useState<any>(null);

  return (
    <div>
      {/* Regime header */}
      <div className="panel" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span
                className={badgeClass}
                style={{ fontSize: "12px", padding: "3px 10px", fontWeight: 700, letterSpacing: "0.1em" }}
              >
                {regLabel}
              </span>
              <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>
                {result.regimeConfidence}% confidence
              </span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>{s.name}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px", maxWidth: "500px" }}>
              {result.regimeReason}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "2px" }}>GENERATED</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{new Date(result.generatedAt).toUTCString().slice(0, 25)}</div>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>
              F&G: {result.fearGreedValue} ({result.fearGreedClassification})
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>REGIME CONFIDENCE</span>
            <span style={{ color: "var(--accent)", fontSize: "10px" }}>{result.regimeConfidence}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--surface)", position: "relative" }}>
            <div
              style={{
                height: "100%",
                width: `${result.regimeConfidence}%`,
                background: result.regime === "BULL_TREND" ? "var(--accent)" : result.regime === "BEAR_TREND" ? "var(--red)" : result.regime === "RANGING" ? "var(--yellow)" : "#8855ff",
                transition: "width 1s ease-out",
              }}
            />
          </div>
        </div>
      </div>

      {/* Signal Breakdown — key metrics at a glance */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
        {[
          {
            label: "MOMENTUM SCORE",
            value: `${result.signals.momentumScore > 0 ? "+" : ""}${result.signals.momentumScore.toFixed(3)}`,
            color: result.signals.momentumScore > 0 ? "var(--green)" : "var(--red)",
            sub: "1h×0.2 + 24h×0.3 + 30d×0.5",
          },
          {
            label: "BB WIDTH PROXY",
            value: `${result.signals.bbWidth?.toFixed(2)}%`,
            color: result.signals.bbWidth > 10 ? "var(--red)" : result.signals.bbWidth > 5 ? "var(--yellow)" : "var(--green)",
            sub: `Vol score: ${result.signals.volatilityScore?.toFixed(2)}%`,
          },
          {
            label: "VOLUME RATIO",
            value: `${result.signals.volumeRatio?.toFixed(2)}x`,
            color: result.signals.volumeRatio >= 1.5 ? "var(--green)" : result.signals.volumeRatio < 0.7 ? "var(--red)" : "var(--text-muted)",
            sub: result.signals.volumeSignal,
          },
          {
            label: "F&G TREND",
            value: `${result.fearGreedValue} ${result.signals.fgTrend > 0 ? "↑" : result.signals.fgTrend < 0 ? "↓" : "→"}`,
            color: result.fearGreedValue > 75 ? "var(--red)" : result.fearGreedValue > 55 ? "var(--yellow)" : result.fearGreedValue < 25 ? "var(--green)" : "var(--text-muted)",
            sub: `${result.signals.fgTrend > 0 ? "+" : ""}${result.signals.fgTrend}pt 7d trend`,
          },
        ].map((m) => (
          <div key={m.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "10px 12px" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "9px", letterSpacing: "0.08em", marginBottom: "4px" }}>{m.label}</div>
            <div style={{ color: m.color, fontSize: "15px", fontWeight: 700 }}>{m.value}</div>
            <div style={{ color: "var(--text-dim)", fontSize: "9px", marginTop: "2px" }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Regime History Simulation */}
      <RegimeHistoryPanel result={result} />

      {/* Risk/Reward + Position Sizing */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div className="panel">
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "10px" }}>POSITION SIZING</div>
          {Object.entries(s.positionSizing).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px", flexWrap: "wrap", gap: "4px" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {k.replace(/([A-Z])/g, " $1").toUpperCase()}
              </span>
              <span style={{ color: "var(--text)", fontSize: "11px" }}>{v as string}</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>RISK/REWARD RATIO</span>
              <span style={{ color: "var(--accent)", fontSize: "13px", fontWeight: 700 }}>1:{s.riskReward}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "10px" }}>INDICATORS USED</div>
          {Object.entries(s.indicators).map(([ind, data]: any) => (
            <div key={ind} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--accent)", fontSize: "11px", fontWeight: 600 }}>{ind}</span>
                {data.period && <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>Period: {data.period}</span>}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "1px" }}>{data.signal}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Entry Rules */}
      <div className="panel" style={{ marginBottom: "12px" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "10px" }}>
          ENTRY RULES
        </div>
        {s.entryRules.map((rule: string, i: number) => (
          <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px", alignItems: "flex-start" }}>
            <span style={{ color: "var(--accent)", fontSize: "11px", minWidth: "16px" }}>{i + 1}.</span>
            <span style={{ color: "var(--text)", fontSize: "12px" }}>{rule}</span>
          </div>
        ))}
      </div>

      {/* Exit Rules */}
      <div className="panel" style={{ marginBottom: "12px" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "10px" }}>
          EXIT RULES
        </div>
        {Object.entries(s.exitRules).map(([k, v]) => {
          if (Array.isArray(v)) {
            return (
              <div key={k} style={{ marginBottom: "8px" }}>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  {k.replace(/([A-Z])/g, " $1").toUpperCase()}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {(v as string[]).map((level, i) => (
                    <span key={i} style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", padding: "2px 8px", fontSize: "11px", color: "var(--text-muted)" }}>
                      {level}
                    </span>
                  ))}
                </div>
              </div>
            );
          }
          const isStop = k.toLowerCase().includes("stop");
          return (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px", flexWrap: "wrap", gap: "4px" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {k.replace(/([A-Z])/g, " $1").toUpperCase()}
              </span>
              <span style={{ color: isStop ? "var(--red)" : "var(--text)", fontSize: "11px", maxWidth: "60%", textAlign: "right" }}>
                {v as string}
              </span>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {s.notes?.length > 0 && (
        <div className="panel">
          <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "10px" }}>
            STRATEGY NOTES
          </div>
          {s.notes.map((note: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "7px" }}>
              <span style={{ color: "var(--yellow)", fontSize: "11px" }}>!</span>
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{note}</span>
            </div>
          ))}
          <TryInLLMButton result={result} />
        </div>
      )}
    </div>
  );
}


// Regime History: simulates how signals looked across the last N periods
// Uses actual CMC % change data across 4 timeframes as pseudo-historical snapshots
function RegimeHistoryPanel({ result }: { result: any }) {
  const { priceChange1h: p1h, priceChange24h: p24h, priceChange7d: p7d, priceChange30d: p30d } = result;

  // Synthesize 6 pseudo-historical momentum snapshots from available timeframe data
  // Each snapshot = estimated momentum at different points in time
  const snapshots = [
    { label: "30D AGO", score: (p30d / 30) * 10,  regime: regimeFromScore((p30d / 30) * 10, result.fearGreedValue - 10) },
    { label: "14D AGO", score: (p30d / 30) * 5,   regime: regimeFromScore((p30d / 30) * 5, result.fearGreedValue - 5) },
    { label: "7D AGO",  score: p7d * 0.3,          regime: regimeFromScore(p7d * 0.3, result.fearGreedValue) },
    { label: "3D AGO",  score: (p7d / 7) * 3 * 0.5 + p24h * 0.5, regime: regimeFromScore((p7d / 7) * 3 * 0.5 + p24h * 0.5, result.fearGreedValue) },
    { label: "YEST",    score: p24h * 0.5 + p1h * 24 * 0.3,      regime: regimeFromScore(p24h * 0.5 + p1h * 24 * 0.3, result.fearGreedValue) },
    { label: "NOW",     score: result.signals.momentumScore,       regime: result.regime },
  ];

  const REGIME_COLORS: Record<string, string> = {
    BULL_TREND: "var(--green)", BEAR_TREND: "var(--red)",
    RANGING: "var(--yellow)", HIGH_VOLATILITY: "#8855ff",
  };

  return (
    <div className="panel" style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.08em" }}>REGIME TRAJECTORY — ESTIMATED FROM TIMEFRAME DATA</div>
        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>30d lookback • CMC data</span>
      </div>
      <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", marginBottom: "10px" }}>
        {snapshots.map((s, i) => {
          const barH = Math.max(8, Math.min(56, Math.abs(s.score) * 6 + 8));
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <div style={{ color: REGIME_COLORS[s.regime], fontSize: "9px", fontWeight: i === 5 ? 700 : 400, letterSpacing: "0.04em" }}>
                {s.regime === "BULL_TREND" ? "BULL" : s.regime === "BEAR_TREND" ? "BEAR" : s.regime === "RANGING" ? "RANGE" : "VOL"}
              </div>
              <div style={{
                width: "100%", height: `${barH}px`,
                background: REGIME_COLORS[s.regime],
                opacity: i === 5 ? 1 : 0.4 + i * 0.12,
                border: i === 5 ? `1px solid ${REGIME_COLORS[s.regime]}` : "none",
                position: "relative",
              }}>
                {i === 5 && (
                  <div style={{ position: "absolute", top: "-16px", left: "50%", transform: "translateX(-50%)", color: REGIME_COLORS[s.regime], fontSize: "8px", whiteSpace: "nowrap" }}>▼ NOW</div>
                )}
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "9px" }}>{s.label}</div>
              <div style={{ color: s.score > 0 ? "var(--green)" : "var(--red)", fontSize: "9px" }}>
                {s.score > 0 ? "+" : ""}{s.score.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ color: "var(--text-dim)", fontSize: "10px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
        Regime transitions: {snapshots.map((s) => s.regime.split("_")[0].slice(0,4)).join(" → ")} &nbsp;·&nbsp;
        <span style={{ color: REGIME_COLORS[result.regime] }}>{regimeLabel(result.regime)}</span> confirmed at {result.regimeConfidence}% confidence
      </div>
    </div>
  );
}

function regimeFromScore(score: number, fg: number): string {
  if (Math.abs(score) > 8) return "HIGH_VOLATILITY";
  if (score > 2.5 && fg > 55) return "BULL_TREND";
  if (score < -2.5 && fg < 45) return "BEAR_TREND";
  return "RANGING";
}

function TryInLLMButton({ result }: { result: any }) {
  const [, navigate] = useLocation();
  const strategyCopy = useCopy("Copy Strategy JSON");
  const llmCopy = useCopy("Try in LLM — Strategy Prompt");

  function handleExplain() {
    sessionStorage.setItem("mm_strategy_explain", JSON.stringify(result));
    navigate("/strategy/explain");
  }

  const buildStrategyPrompt = () => {
    const s = result.strategy;
    return `You are MarketMind, a regime-aware crypto trading strategy advisor powered by CoinMarketCap real-time data.

## Current Market Context
- Asset: ${result.asset}
- Price: $${result.price}
- 1h: ${result.priceChange1h > 0 ? "+" : ""}${result.priceChange1h?.toFixed(2)}%, 24h: ${result.priceChange24h > 0 ? "+" : ""}${result.priceChange24h?.toFixed(2)}%, 7d: ${result.priceChange7d > 0 ? "+" : ""}${result.priceChange7d?.toFixed(2)}%
- Fear & Greed Index: ${result.fearGreedValue} (${result.fearGreedClassification})
- BTC Dominance: ${result.btcDominance}%
- Timeframe: ${result.timeframe}
- Risk Tolerance: ${result.riskTolerance}

## Detected Market Regime
- Regime: ${result.regime} (${result.regimeConfidence}% confidence)
- Reason: ${result.regimeReason}

## Signal Summary
- Momentum: ${result.signals.momentum} (score: ${result.signals.momentumScore})
- Sentiment: ${result.signals.sentiment}
- Volatility: ${result.signals.volatilityLevel}
- BTC Dominance signal: ${result.signals.btcDominanceState} (raw: ${result.btcDominance}%)
- Volume: ${result.signals.volumeSignal} (ratio: ${result.signals.volumeRatio?.toFixed(2)}x) — ${result.signals.volumeSignalDesc}
- Funding/Derivatives: ${result.signals.fundingSignal} — ${result.signals.fundingSignalDesc}
- Momentum Divergence: ${result.signals.momentumDivergence} — ${result.signals.momentumDivergenceDesc}

## Generated Strategy Spec
${JSON.stringify(s, null, 2)}

---
Based on this MarketMind analysis, what additional insights or refinements would you suggest for this ${result.regime} strategy on ${result.asset}? Focus on risk management and entry timing.`;
  };

  const activeModal = strategyCopy.modalText
    ? { text: strategyCopy.modalText, label: strategyCopy.modalLabel, close: strategyCopy.closeModal }
    : llmCopy.modalText
    ? { text: llmCopy.modalText, label: llmCopy.modalLabel, close: llmCopy.closeModal }
    : null;

  return (
    <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
      {activeModal && <CopyModal text={activeModal.text} label={activeModal.label} onClose={activeModal.close} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>POWERED BY CMC DATA • ALTERNATIVE.ME F&G</span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-primary"
            onClick={handleExplain}
            style={{ fontSize: "10px", padding: "5px 12px", letterSpacing: "0.06em", background: "rgba(240,185,11,0.12)", borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            ✦ READ STRATEGY
          </button>
          <button
            className="btn"
            onClick={() => strategyCopy.copy(JSON.stringify(result, null, 2), "Strategy JSON")}
            style={{
              fontSize: "10px",
              padding: "5px 12px",
              color: strategyCopy.copied ? "var(--green)" : "var(--text-muted)",
              borderColor: strategyCopy.copied ? "var(--green)" : "var(--border-strong)",
              letterSpacing: "0.06em",
            }}
          >
            {strategyCopy.copied ? "✓ COPIED" : "⎘ COPY STRATEGY"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => llmCopy.copy(buildStrategyPrompt(), "LLM Strategy Prompt")}
            style={{ fontSize: "10px", padding: "5px 12px", letterSpacing: "0.06em" }}
          >
            {llmCopy.copied ? "✓ PROMPT COPIED" : "↗ TRY IN LLM"}
          </button>
        </div>
      </div>
    </div>
  );
}
