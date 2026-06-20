import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getUSDQuote, regimeLabel } from "../lib/utils";
import TokenModal from "../components/TokenModal";

function classifyRegime(coin: any) {
  const q = getUSDQuote(coin);
  const h1 = q?.percentChange1h ?? 0;
  const h24 = q?.percentChange24h ?? 0;
  const d7 = q?.percentChange7d ?? 0;
  const d30 = q?.percentChange30d ?? 0;
  const score = h1 * 0.2 + h24 * 0.3 + d7 * 0.3 + d30 * 0.2;
  if (score > 3) return "BULL_TREND";
  if (score < -3) return "BEAR_TREND";
  if (Math.abs(score) < 1) return "RANGING";
  return "ACCUMULATION";
}

const REGIME_COLORS: Record<string, string> = {
  BULL_TREND:   "#0ECB81",
  BEAR_TREND:   "#F6465D",
  RANGING:      "#F0B90B",
  ACCUMULATION: "#8855ff",
};

const REGIME_BG: Record<string, string> = {
  BULL_TREND:   "rgba(14,203,129,0.15)",
  BEAR_TREND:   "rgba(246,70,93,0.15)",
  RANGING:      "rgba(240,185,11,0.15)",
  ACCUMULATION: "rgba(136,85,255,0.15)",
};

type ColorMode = "regime" | "24h" | "7d";

export default function HeatmapPage() {
  const [modalCoin, setModalCoin] = useState<any>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("regime");
  const [limit, setLimit] = useState(50);

  const listing = useQuery({
    queryKey: ["listing-heatmap", limit],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: String(limit) } });
      return res.json();
    },
    staleTime: 60_000,
  });

  const coins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];

  // Size: top coins get bigger cells. Rank 1 → size 5, rank 50 → size 1
  function getCellSize(rank: number): number {
    if (rank <= 5) return 5;
    if (rank <= 10) return 4;
    if (rank <= 20) return 3;
    if (rank <= 35) return 2;
    return 1;
  }

  function get24hColor(pct: number): string {
    if (pct >= 5) return "rgba(14,203,129,0.25)";
    if (pct >= 2) return "rgba(14,203,129,0.15)";
    if (pct >= 0) return "rgba(14,203,129,0.08)";
    if (pct >= -2) return "rgba(246,70,93,0.08)";
    if (pct >= -5) return "rgba(246,70,93,0.15)";
    return "rgba(246,70,93,0.25)";
  }

  function get24hBorder(pct: number): string {
    if (pct >= 2) return "#0ECB81";
    if (pct >= 0) return "rgba(14,203,129,0.4)";
    if (pct >= -2) return "rgba(246,70,93,0.4)";
    return "#F6465D";
  }

  function getCellBg(coin: any): string {
    const q = getUSDQuote(coin);
    if (colorMode === "regime") return REGIME_BG[classifyRegime(coin)] ?? "var(--surface)";
    if (colorMode === "24h") return get24hColor(q?.percentChange24h ?? 0);
    return get24hColor(q?.percentChange7d ?? 0);
  }

  function getCellBorder(coin: any): string {
    const q = getUSDQuote(coin);
    if (colorMode === "regime") return REGIME_COLORS[classifyRegime(coin)] ?? "var(--border)";
    if (colorMode === "24h") return get24hBorder(q?.percentChange24h ?? 0);
    return get24hBorder(q?.percentChange7d ?? 0);
  }

  const regimeCounts = { BULL_TREND: 0, BEAR_TREND: 0, RANGING: 0, ACCUMULATION: 0 };
  coins.forEach((c) => { const r = classifyRegime(c); if (r in regimeCounts) regimeCounts[r as keyof typeof regimeCounts]++; });

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--accent)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
              REGIME HEATMAP
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              Cell size = market cap rank · color = regime · click to open chart
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Color mode toggle */}
            {(["regime", "24h", "7d"] as ColorMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setColorMode(m)}
                style={{
                  background: colorMode === m ? "var(--accent)" : "var(--surface)",
                  border: `1px solid ${colorMode === m ? "var(--accent)" : "var(--border)"}`,
                  color: colorMode === m ? "#000" : "var(--text-dim)",
                  padding: "4px 10px",
                  fontSize: "10px",
                  letterSpacing: "0.06em",
                  cursor: "pointer",
                }}
              >
                {m === "regime" ? "REGIME" : m === "24h" ? "24H PNL" : "7D PNL"}
              </button>
            ))}
            {/* Limit toggle */}
            {([25, 50, 100] as number[]).map((n) => (
              <button
                key={n}
                onClick={() => setLimit(n)}
                style={{
                  background: limit === n ? "var(--accent)" : "var(--surface)",
                  border: `1px solid ${limit === n ? "var(--accent)" : "var(--border)"}`,
                  color: limit === n ? "#000" : "var(--text-dim)",
                  padding: "4px 8px",
                  fontSize: "10px",
                  cursor: "pointer",
                }}
              >
                TOP {n}
              </button>
            ))}
          </div>
        </div>

        {/* Regime distribution bar */}
        {coins.length > 0 && colorMode === "regime" && (
          <div style={{ marginTop: "14px" }}>
            <div style={{ display: "flex", height: "6px", gap: "2px" }}>
              {Object.entries(regimeCounts).map(([r, c]) => c > 0 && (
                <div key={r} title={`${regimeLabel(r)}: ${c}`}
                  style={{ flex: c, background: REGIME_COLORS[r], transition: "flex 0.3s" }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: "14px", marginTop: "6px", flexWrap: "wrap" }}>
              {Object.entries(regimeCounts).filter(([, c]) => c > 0).map(([r, c]) => (
                <span key={r} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "7px", height: "7px", background: REGIME_COLORS[r], display: "inline-block" }} />
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{regimeLabel(r)}: {c}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {listing.isLoading ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>
          <div style={{ fontSize: "13px", letterSpacing: "0.1em" }}>BUILDING HEATMAP<span className="cursor-blink">_</span></div>
        </div>
      ) : coins.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)", fontSize: "11px" }}>
          CMC data unavailable.
        </div>
      ) : (
        <div className="panel">
          {/* Treemap-style flex layout */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {coins.map((coin, idx) => {
              const q = getUSDQuote(coin);
              const h24 = q?.percentChange24h ?? 0;
              const h1 = q?.percentChange1h ?? 0;
              const regime = classifyRegime(coin);
              const size = getCellSize(idx + 1);
              const bg = getCellBg(coin);
              const borderColor = getCellBorder(coin);

              // Cell dimensions scale with size
              const w = size === 5 ? 160 : size === 4 ? 120 : size === 3 ? 90 : size === 2 ? 70 : 56;
              const h = size === 5 ? 100 : size === 4 ? 80 : size === 3 ? 64 : size === 2 ? 52 : 44;

              return (
                <div
                  key={coin.id}
                  onClick={() => setModalCoin(coin)}
                  title={`${coin.name} — ${regimeLabel(regime)}\n24h: ${h24 >= 0 ? "+" : ""}${h24.toFixed(2)}%`}
                  style={{
                    width: `${w}px`,
                    height: `${h}px`,
                    background: bg,
                    border: `1px solid ${borderColor}`,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "4px",
                    transition: "opacity 0.1s, transform 0.1s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.85";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  <div style={{
                    color: "var(--text)",
                    fontWeight: 700,
                    fontSize: size >= 4 ? "14px" : size === 3 ? "12px" : "10px",
                    letterSpacing: "0.04em",
                    lineHeight: 1.2,
                    textAlign: "center",
                  }}>
                    {coin.symbol}
                  </div>
                  {size >= 2 && (
                    <div style={{
                      color: h24 >= 0 ? "var(--green)" : "var(--red)",
                      fontSize: size >= 4 ? "12px" : "9px",
                      fontWeight: 600,
                      marginTop: "2px",
                    }}>
                      {h24 >= 0 ? "+" : ""}{h24.toFixed(2)}%
                    </div>
                  )}
                  {size >= 4 && (
                    <div style={{ color: "var(--text-dim)", fontSize: "9px", marginTop: "2px", letterSpacing: "0.05em" }}>
                      {regimeLabel(regime).split(" ")[0]}
                    </div>
                  )}
                  {/* Rank badge */}
                  <div style={{
                    position: "absolute",
                    top: "2px",
                    left: "3px",
                    color: "var(--text-dim)",
                    fontSize: "8px",
                    opacity: 0.5,
                  }}>
                    #{idx + 1}
                  </div>
                  {/* 1h indicator dot */}
                  {size >= 3 && (
                    <div style={{
                      position: "absolute",
                      bottom: "3px",
                      right: "4px",
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: h1 >= 0 ? "var(--green)" : "var(--red)",
                      opacity: 0.7,
                    }} title={`1h: ${h1 >= 0 ? "+" : ""}${h1.toFixed(2)}%`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em" }}>LEGEND:</span>
            <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>CELL SIZE = MCAP RANK (larger = top rank)</span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--green)", display: "inline-block" }} />
              <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>DOT = 1h momentum</span>
            </span>
            <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.04em" }}>CLICK CELL = OPEN CHART</span>
          </div>
        </div>
      )}

      {modalCoin && <TokenModal coin={modalCoin} onClose={() => setModalCoin(null)} />}
    </div>
  );
}
