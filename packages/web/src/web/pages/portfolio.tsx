import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatPrice, formatLargeNumber, formatPct, pctColor, getUSDQuote, regimeBadgeClass, regimeLabel } from "../lib/utils";
import TokenModal from "../components/TokenModal";
import CoinSearch from "../components/CoinSearch";

const REGIME_COLORS: Record<string, string> = {
  BULL_TREND: "var(--green)",
  BEAR_TREND: "var(--red)",
  RANGING: "var(--yellow)",
  HIGH_VOLATILITY: "#8855ff",
};

function computeRegime(pct1h: number, pct24h: number, pct7d: number, pct30d: number, fg: number, btcDom: number) {
  const momentumScore = (pct1h * 0.2) + (pct24h * 0.3) + (pct30d * 0.5);
  const dailyReturns = [pct1h * 24, pct24h, pct7d / 7, pct30d / 30];
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / 4;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 4;
  const volScore = Math.sqrt(variance);
  const bbWidth = Math.max(...dailyReturns) - Math.min(...dailyReturns);
  const volatility = (volScore * 0.6) + (bbWidth * 0.4);
  const btcDominanceState = btcDom > 54 ? "BTC_DOMINANT" : btcDom < 48 ? "ALT_SEASON" : "NEUTRAL";
  if (volatility > 8) return { regime: "HIGH_VOLATILITY", score: momentumScore };
  if (momentumScore > 2.5 && fg > 60 && btcDominanceState !== "BTC_DOMINANT") return { regime: "BULL_TREND", score: momentumScore };
  if (momentumScore < -2.5 && fg < 40) return { regime: "BEAR_TREND", score: momentumScore };
  return { regime: "RANGING", score: momentumScore };
}

type Holding = { coinId: number; symbol: string; amount: string };

const PORTFOLIO_KEY = "mm_portfolio";

function loadHoldings(): Holding[] {
  try {
    const saved = JSON.parse(localStorage.getItem(PORTFOLIO_KEY) ?? "[]");
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return [{ coinId: 1, symbol: "BTC", amount: "" }];
}

function saveHoldings(holdings: Holding[]) {
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(holdings));
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [modalCoin, setModalCoin] = useState<any | null>(null);

  const listing = useQuery({
    queryKey: ["listing"],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: "5000" } });
      return res.json();
    },
    staleTime: 60_000,
  });

  const global = useQuery({
    queryKey: ["global"],
    queryFn: async () => { const res = await api.market.global.$get(); return res.json(); },
    staleTime: 60_000,
  });

  const fg = useQuery({
    queryKey: ["fear-greed"],
    queryFn: async () => { const res = await api.market["fear-greed"].$get(); return res.json(); },
    staleTime: 60_000,
  });

  const coins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];
  const btcDom: number = (global.data as any)?.data?.btcDominance ?? 50;
  const fgValue: number = parseInt((fg.data as any)?.data?.[0]?.value ?? "50");

  const availableCoins = coins.map((c: any) => ({ id: c.id, symbol: c.symbol, name: c.name }));

  const rows = useMemo(() => {
    return holdings.map((h) => {
      const coin = coins.find((c: any) => c.id === h.coinId);
      if (!coin) return null;
      const q = getUSDQuote(coin);
      const amount = parseFloat(h.amount) || 0;
      const value = amount * (q.price ?? 0);
      const { regime, score } = computeRegime(
        q.percentChange1h ?? 0, q.percentChange24h ?? 0,
        q.percentChange7d ?? 0, q.percentChange30d ?? 0,
        fgValue, btcDom
      );
      return { coin, q, amount, value, regime, score, holding: h };
    }).filter(Boolean) as NonNullable<ReturnType<typeof useMemo>>[];
  }, [holdings, coins, btcDom, fgValue]);

  const totalValue = rows.reduce((s, r) => s + (r as any).value, 0);

  // Weighted aggregate regime score
  const weightedScore = totalValue > 0
    ? rows.reduce((s, r: any) => s + r.score * (r.value / totalValue), 0)
    : 0;

  const regimeCounts: Record<string, number> = { BULL_TREND: 0, BEAR_TREND: 0, RANGING: 0, HIGH_VOLATILITY: 0 };
  rows.forEach((r: any) => { if (regimeCounts[r.regime] != null) regimeCounts[r.regime]++; });

  const portfolioRegime = weightedScore > 2 ? "BULL_TREND"
    : weightedScore < -2 ? "BEAR_TREND"
    : "RANGING";

  const riskScore = Math.min(100, Math.max(0,
    (regimeCounts.HIGH_VOLATILITY / Math.max(rows.length, 1)) * 40 +
    (Math.abs(weightedScore) / 10) * 30 +
    (regimeCounts.BEAR_TREND / Math.max(rows.length, 1)) * 30
  ));

  const riskLabel = riskScore > 65 ? "HIGH RISK" : riskScore > 35 ? "MODERATE" : "LOW RISK";
  const riskColor = riskScore > 65 ? "var(--red)" : riskScore > 35 ? "var(--yellow)" : "var(--green)";

  function setAndSave(next: Holding[]) {
    setHoldings(next);
    saveHoldings(next);
  }

  function addRow() {
    const unused = availableCoins.find((c) => !holdings.some((h) => h.coinId === c.id));
    if (unused) setAndSave([...holdings, { coinId: unused.id, symbol: unused.symbol, amount: "" }]);
  }

  function removeRow(idx: number) {
    setAndSave(holdings.filter((_, i) => i !== idx));
  }

  function updateCoin(idx: number, coinId: number) {
    const coin = availableCoins.find((c) => c.id === coinId);
    if (!coin) return;
    setAndSave(holdings.map((h, i) => i === idx ? { ...h, coinId: coin.id, symbol: coin.symbol } : h));
  }

  function updateAmount(idx: number, amount: string) {
    setAndSave(holdings.map((h, i) => i === idx ? { ...h, amount } : h));
  }

  function exportReport() {
    const lines: string[] = [
      "# MarketMind Portfolio Regime Report",
      `Generated: ${new Date().toUTCString()}`,
      "",
      `## Portfolio Summary`,
      `Total Value: ${formatLargeNumber(totalValue)}`,
      `Portfolio Regime: ${regimeLabel(portfolioRegime)}`,
      `Weighted Momentum Score: ${weightedScore > 0 ? "+" : ""}${weightedScore.toFixed(3)}`,
      `Risk Score: ${riskScore.toFixed(0)}/100 (${riskLabel})`,
      "",
      "## Holdings",
      ...rows.map((r: any) => `- ${r.holding.symbol}: ${r.holding.amount} units @ ${formatPrice(r.q.price)} = ${formatLargeNumber(r.value)} | Regime: ${regimeLabel(r.regime)} | Score: ${r.score > 0 ? "+" : ""}${r.score.toFixed(2)}`),
      "",
      "## Regime Distribution",
      ...Object.entries(regimeCounts).map(([r, c]) => `- ${regimeLabel(r)}: ${c} assets`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "marketmind-portfolio.md"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "16px", alignItems: "start" }}>
        {/* Input panel */}
        <div className="panel">
          <div style={{ color: "var(--text-muted)", fontSize: "12px", letterSpacing: "0.08em", marginBottom: "16px" }}>
            PORTFOLIO HOLDINGS
          </div>

          {listing.isLoading ? (
            <div style={{ color: "var(--text-dim)", fontSize: "11px" }}>Loading market data<span className="cursor-blink">...</span></div>
          ) : (
            <>
              {holdings.map((h, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  <CoinSearch
                    coins={availableCoins}
                    value={availableCoins.find((c) => c.id === h.coinId) ?? null}
                    onChange={(coin) => updateCoin(idx, coin.id)}
                    loading={listing.isLoading}
                    style={{ flex: 1 }}
                    placeholder="Search coin..."
                  />
                  <input
                    className="term-input"
                    style={{ width: "90px" }}
                    type="number"
                    placeholder="Amount"
                    value={h.amount}
                    onChange={(e) => updateAmount(idx, e.target.value)}
                  />
                  {holdings.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--red)", cursor: "pointer", padding: "4px 8px", fontSize: "12px" }}
                    >✕</button>
                  )}
                </div>
              ))}

              <button
                onClick={addRow}
                style={{ width: "100%", background: "transparent", border: "1px dashed var(--border)", color: "var(--text-dim)", cursor: "pointer", padding: "8px", fontSize: "11px", letterSpacing: "0.06em", marginTop: "4px" }}
              >
                + ADD ASSET
              </button>

              <div style={{ marginTop: "12px", color: "var(--text-dim)", fontSize: "10px", lineHeight: 1.6 }}>
                Enter holdings to compute aggregate regime, weighted momentum score, and portfolio risk level.
              </div>
            </>
          )}
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Aggregate regime card */}
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "8px" }}>PORTFOLIO REGIME</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className={regimeBadgeClass(portfolioRegime)} style={{ fontSize: "13px", padding: "4px 12px" }}>
                    {regimeLabel(portfolioRegime)}
                  </span>
                  <span style={{ color: weightedScore > 0 ? "var(--green)" : "var(--red)", fontSize: "18px", fontWeight: 700 }}>
                    {weightedScore > 0 ? "+" : ""}{weightedScore.toFixed(3)}
                  </span>
                  <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>WEIGHTED SCORE</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "4px" }}>TOTAL VALUE</div>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)" }}>{formatLargeNumber(totalValue)}</div>
              </div>
            </div>

            {/* Risk meter */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em" }}>PORTFOLIO RISK SCORE</span>
                <span style={{ color: riskColor, fontSize: "11px", fontWeight: 700 }}>{riskScore.toFixed(0)}/100 — {riskLabel}</span>
              </div>
              <div style={{ height: "6px", background: "var(--surface)" }}>
                <div style={{ height: "100%", width: `${riskScore}%`, background: riskColor, transition: "width 0.4s" }} />
              </div>
            </div>

            {/* Regime distribution mini-bar */}
            <div style={{ marginTop: "12px" }}>
              <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>REGIME MIX</div>
              <div style={{ display: "flex", height: "8px", gap: "2px" }}>
                {Object.entries(regimeCounts).map(([r, c]) => c > 0 && (
                  <div key={r} title={`${regimeLabel(r)}: ${c}`}
                    style={{ flex: c, background: REGIME_COLORS[r] }} />
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "6px", flexWrap: "wrap" }}>
                {Object.entries(regimeCounts).map(([r, c]) => (
                  <div key={r} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "7px", height: "7px", background: REGIME_COLORS[r] }} />
                    <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{regimeLabel(r)}: {c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Holdings breakdown */}
          {rows.length > 0 && (
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em" }}>HOLDINGS BREAKDOWN</div>
                <button
                  onClick={exportReport}
                  style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--accent)", cursor: "pointer", padding: "4px 10px", fontSize: "10px", letterSpacing: "0.06em" }}
                >
                  ↓ EXPORT MD
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["ASSET", "AMOUNT", "PRICE", "VALUE", "WEIGHT", "24H", "REGIME", "SCORE"].map((h) => (
                        <th key={h} style={{ padding: "6px 8px", color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", fontWeight: 400, textAlign: "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any, i) => {
                      const weight = totalValue > 0 ? (r.value / totalValue) * 100 : 0;
                      return (
                        <tr
                          key={i}
                          onClick={() => setModalCoin(r.coin)}
                          style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <td style={{ padding: "8px" }}>
                            <span style={{ fontWeight: 700, color: "var(--text)" }}>{r.holding.symbol}</span>
                          </td>
                          <td style={{ padding: "8px", color: "var(--text-muted)" }}>{r.holding.amount || "—"}</td>
                          <td style={{ padding: "8px" }}>{formatPrice(r.q.price)}</td>
                          <td style={{ padding: "8px", color: r.value > 0 ? "var(--text)" : "var(--text-dim)" }}>
                            {r.value > 0 ? formatLargeNumber(r.value) : "—"}
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ width: "40px", height: "4px", background: "var(--border)" }}>
                                <div style={{ height: "100%", width: `${weight}%`, background: REGIME_COLORS[r.regime] }} />
                              </div>
                              <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{weight.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <span className={pctColor(r.q.percentChange24h)}>{formatPct(r.q.percentChange24h)}</span>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <span className={regimeBadgeClass(r.regime)} style={{ fontSize: "9px", padding: "2px 6px" }}>
                              {regimeLabel(r.regime)}
                            </span>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <span style={{ color: r.score > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
                              {r.score > 0 ? "+" : ""}{r.score.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Regime advice */}
          {rows.length > 0 && (
            <div className="panel">
              <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
                REGIME-BASED PORTFOLIO ADVICE
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {regimeCounts.HIGH_VOLATILITY > 0 && (
                  <Alert color="var(--purple)" label="HIGH VOLATILITY ASSETS"
                    text={`${regimeCounts.HIGH_VOLATILITY} asset(s) in HIGH_VOLATILITY — consider reducing position size or widening stops.`} />
                )}
                {regimeCounts.BEAR_TREND > 0 && (
                  <Alert color="var(--red)" label="BEAR TREND EXPOSURE"
                    text={`${regimeCounts.BEAR_TREND} asset(s) in BEAR_TREND — check stop-loss levels. Momentum score is negative.`} />
                )}
                {regimeCounts.BULL_TREND > 0 && (
                  <Alert color="var(--green)" label="BULL TREND CONFIRMED"
                    text={`${regimeCounts.BULL_TREND} asset(s) in BULL_TREND with positive momentum. Trend-following strategies favored.`} />
                )}
                {regimeCounts.RANGING > 0 && (
                  <Alert color="var(--yellow)" label="RANGING ASSETS"
                    text={`${regimeCounts.RANGING} asset(s) in RANGING regime. Grid or mean-reversion strategies apply.`} />
                )}
                {weightedScore > 3 && (
                  <Alert color="var(--green)" label="STRONG POSITIVE MOMENTUM"
                    text={`Aggregate weighted momentum score ${weightedScore.toFixed(2)} — portfolio is broadly bullish across timeframes.`} />
                )}
                {weightedScore < -3 && (
                  <Alert color="var(--red)" label="NEGATIVE MOMENTUM"
                    text={`Aggregate weighted momentum score ${weightedScore.toFixed(2)} — broad weakness. Review capital allocation.`} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalCoin && <TokenModal coin={modalCoin} onClose={() => setModalCoin(null)} />}
    </div>
  );
}

function Alert({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <div style={{ border: `1px solid ${color}44`, background: `${color}11`, padding: "10px 12px" }}>
      <div style={{ color, fontSize: "10px", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "4px" }}>{label}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{text}</div>
    </div>
  );
}
