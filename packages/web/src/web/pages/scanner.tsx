import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatPrice, formatPct, formatLargeNumber, pctColor, getUSDQuote, generateSparklinePoints, regimeBadgeClass, regimeLabel } from "../lib/utils";
import { isWatched, toggleWatchlist } from "../lib/watchlist";
import TokenModal from "../components/TokenModal";

// BNB-native BEP-20 eligible tokens (competition tokens)
const BNB_NATIVE_IDS = new Set([1839, 7186, 2010, 4030, 6758, 2130, 3794, 5765, 7083, 4269, 10603]);

// v1.1.0 — synced with API regime classifier
// Dynamic BTC dominance bands: >54 = BTC_DOMINANT, <48 = ALT_SEASON
// Momentum: 1h(20%) + 24h(30%) + 30d(50%) — no timeframe overlap
// Bollinger Width proxy volatility
function computeRegime(
  pct1h: number, pct24h: number, pct7d: number, pct30d: number,
  fg: number, btcDom: number
) {
  const momentumScore = (pct1h * 0.2) + (pct24h * 0.3) + (pct30d * 0.5);

  const dailyReturns = [pct1h * 24, pct24h, pct7d / 7, pct30d / 30];
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / 4;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 4;
  const volScore = Math.sqrt(variance);
  const bbWidth = Math.max(...dailyReturns) - Math.min(...dailyReturns);
  const volatility = (volScore * 0.6) + (bbWidth * 0.4);

  const btcDominanceState = btcDom > 54 ? "BTC_DOMINANT" : btcDom < 48 ? "ALT_SEASON" : "NEUTRAL";
  const sentimentBullish = fg > 60;
  const sentimentBearish = fg < 40;

  if (volatility > 8) return { regime: "HIGH_VOLATILITY", score: momentumScore, volatility, btcDominanceState };
  if (momentumScore > 2.5 && sentimentBullish && btcDominanceState !== "BTC_DOMINANT") return { regime: "BULL_TREND", score: momentumScore, volatility, btcDominanceState };
  if (momentumScore < -2.5 && sentimentBearish) return { regime: "BEAR_TREND", score: momentumScore, volatility, btcDominanceState };
  return { regime: "RANGING", score: momentumScore, volatility, btcDominanceState };
}

function computeDivergence(pct24h: number, pct30d: number): { label: string; color: string } {
  const longerTermDaily = pct30d / 30;
  const diff = pct24h - longerTermDaily;
  if (diff > 5 && pct30d < 5)   return { label: "DIST",    color: "var(--red)" };
  if (diff < -5 && pct30d > 5)  return { label: "EXHAUST", color: "var(--yellow)" };
  if (diff > 3 && pct30d > 8)   return { label: "BREAKOUT", color: "var(--green)" };
  if (diff < -5 && pct24h < -2) return { label: "ACCUM",   color: "#0088ff" };
  return { label: "NEUTRAL", color: "var(--text-dim)" };
}

const REGIME_COLORS: Record<string, string> = {
  BULL_TREND:      "var(--green)",
  BEAR_TREND:      "var(--red)",
  RANGING:         "var(--yellow)",
  HIGH_VOLATILITY: "#8855ff",
};

export default function ScannerPage() {
  const [selectedCoin, setSelectedCoin] = useState<any | null>(null);
  const [bnbOnly, setBnbOnly] = useState(false);
  const [, forceUpdate] = useState(0);

  const listing = useQuery({
    queryKey: ["listing-scanner"],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: "5000" } });
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  const global = useQuery({
    queryKey: ["global-scanner"],
    queryFn: async () => {
      const res = await api.market.global.$get();
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  const fg = useQuery({
    queryKey: ["fg-scanner"],
    queryFn: async () => {
      const res = await api.market["fear-greed"].$get();
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  const liveCMCCoins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];
  const btcDom: number = (global.data as any)?.data?.btcDominance ?? 50;
  const fgValue: number = (fg.data as any)?.data?.[0]?.value
    ? parseInt((fg.data as any).data[0].value)
    : 50;

  const isLoading = listing.isLoading || global.isLoading;

  const scannerData = liveCMCCoins.slice(0, 20).map((coin: any) => {
    const q = getUSDQuote(coin);
    const pct1h  = q.percentChange1h  ?? 0;
    const pct24h = q.percentChange24h ?? 0;
    const pct7d  = q.percentChange7d  ?? 0;
    const pct30d = q.percentChange30d ?? 0;
    const { regime, score, volatility, btcDominanceState } = computeRegime(pct1h, pct24h, pct7d, pct30d, fgValue, btcDom);
    const divergence  = computeDivergence(pct24h, pct30d);
    const isBnbNative = BNB_NATIVE_IDS.has(coin.id);
    const sparkPoints = generateSparklinePoints(pct7d, pct24h, pct1h, 80, 28);
    return {
      id: coin.id, symbol: coin.symbol, name: coin.name, slug: coin.slug,
      price: q.price ?? 0, pct1h, pct24h, pct7d, pct30d,
      volume: q.volume24h ?? 0, marketCap: q.marketCap ?? 0,
      circulatingSupply: coin.circulatingSupply,
      totalSupply: coin.totalSupply,
      maxSupply: coin.maxSupply,
      regime, score, volatility, btcDominanceState,
      divergence, isBnbNative, sparkPoints, cmcRank: coin.cmcRank,
      // keep raw coin for modal
      _raw: coin,
    };
  });

  const regimeCounts = { BULL_TREND: 0, BEAR_TREND: 0, RANGING: 0, HIGH_VOLATILITY: 0 };
  scannerData.forEach((c) => { regimeCounts[c.regime as keyof typeof regimeCounts]++; });
  const dominantRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0] ?? ["RANGING", 0];

  const displayData  = bnbOnly ? scannerData.filter((c) => c.isBnbNative) : scannerData;
  const bullCoins    = displayData.filter((c) => c.regime === "BULL_TREND").sort((a, b) => b.score - a.score);
  const bearCoins    = displayData.filter((c) => c.regime === "BEAR_TREND").sort((a, b) => a.score - b.score);
  const rangingCoins = displayData.filter((c) => c.regime === "RANGING");
  const bnbCoins     = scannerData.filter((c) => c.isBnbNative);

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--accent)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
              PORTFOLIO REGIME SCANNER
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              Multi-asset regime detection v1.1.0 — live CMC data
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isLoading ? (
              <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>Loading<span className="cursor-blink">...</span></span>
            ) : scannerData.length > 0 ? (
              <>
                <span style={{ background: "var(--surface)", border: `1px solid ${REGIME_COLORS[dominantRegime[0]]}`, color: REGIME_COLORS[dominantRegime[0]], padding: "4px 10px", fontSize: "10px", letterSpacing: "0.06em" }}>
                  DOMINANT: {regimeLabel(dominantRegime[0])} ({dominantRegime[1]}/20)
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "10px", padding: "4px 10px", border: "1px solid var(--border)" }}>
                  F&G: {fgValue}
                </span>
                <span style={{
                  color: btcDom > 54 ? "var(--yellow)" : btcDom < 48 ? "var(--green)" : "var(--text-dim)",
                  fontSize: "10px", padding: "4px 10px", border: "1px solid var(--border)",
                }}>
                  BTC DOM: {btcDom.toFixed(1)}% {btcDom > 54 ? "▲ BTC_DOMINANT" : btcDom < 48 ? "◈ ALT_SEASON" : "NEUTRAL"}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {!isLoading && scannerData.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>
              REGIME DISTRIBUTION — TOP 20 ASSETS (v1.1.0 CLASSIFIER)
            </div>
            <div style={{ display: "flex", height: "8px", gap: "2px" }}>
              {Object.entries(regimeCounts).map(([regime, count]) => count > 0 && (
                <div key={regime} title={`${regimeLabel(regime)}: ${count}`}
                  style={{ flex: count, background: REGIME_COLORS[regime], transition: "flex 0.3s" }}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "6px", flexWrap: "wrap" }}>
              {Object.entries(regimeCounts).map(([regime, count]) => (
                <div key={regime} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: "8px", height: "8px", background: REGIME_COLORS[regime] }} />
                  <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>{regimeLabel(regime)}: {count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>
          <div style={{ fontSize: "13px", letterSpacing: "0.1em", marginBottom: "12px" }}>
            SCANNING MARKET REGIMES<span className="cursor-blink">_</span>
          </div>
          {["Fetching CMC listing data...", "Computing momentum signals (v1.1.0)...", "Running regime classifier...", "Detecting divergence patterns..."].map((s, i) => (
            <div key={i} style={{ fontSize: "11px", marginBottom: "4px", color: "var(--text-dim)" }}>{">"} {s}</div>
          ))}
        </div>
      ) : scannerData.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>
          <div style={{ fontSize: "13px", letterSpacing: "0.1em", marginBottom: "8px" }}>NO DATA</div>
          <div style={{ fontSize: "11px" }}>CMC data unavailable. Check API connection.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Main scanner table */}
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em" }}>
                  {bnbOnly ? "BNB-NATIVE ASSETS ONLY" : "FULL SCAN — TOP 20 BY MARKET CAP"}
                </div>
                <button
                  onClick={() => setBnbOnly((v) => !v)}
                  style={{
                    background: bnbOnly ? "var(--accent)" : "var(--surface)",
                    border: `1px solid ${bnbOnly ? "var(--accent)" : "var(--border)"}`,
                    color: bnbOnly ? "#000" : "var(--text-dim)",
                    padding: "3px 10px",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                    fontWeight: bnbOnly ? 700 : 400,
                  }}
                >
                  ◈ BNB ONLY
                </button>
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>CLICK ROW TO OPEN CHART · ★ TO WATCH</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["★", "#", "ASSET", "PRICE", "1H", "24H", "7D", "30D", "REGIME", "SCORE", "DIVERGENCE", "TREND", "BNB"].map((h) => (
                      <th key={h} style={{ textAlign: h === "#" || h === "BNB" || h === "★" ? "center" : "left", padding: "6px 8px", color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 400, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((coin, idx) => {
                    const watched = isWatched(coin.id);
                    return (
                      <tr
                        key={coin.id}
                        onClick={() => setSelectedCoin(coin._raw)}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"; }}
                      >
                        <td
                          style={{ padding: "8px", textAlign: "center" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(coin.id);
                            forceUpdate((n) => n + 1);
                          }}
                        >
                          <span
                            title={watched ? "Unpin" : "Pin to watchlist"}
                            style={{
                              color: watched ? "var(--accent)" : "var(--text-dim)",
                              fontSize: "13px",
                              cursor: "pointer",
                              userSelect: "none",
                            }}
                          >
                            {watched ? "★" : "☆"}
                          </span>
                        </td>
                        <td style={{ padding: "8px", textAlign: "center", color: "var(--text-dim)", fontSize: "10px" }}>{coin.cmcRank}</td>
                        <td style={{ padding: "8px" }}>
                          <div style={{ fontWeight: 700, color: "var(--text)" }}>{coin.symbol}</div>
                          <div style={{ color: "var(--text-dim)", fontSize: "10px" }}>{coin.name}</div>
                        </td>
                        <td style={{ padding: "8px", fontWeight: 600 }}>{formatPrice(coin.price)}</td>
                        <td style={{ padding: "8px" }}><span className={pctColor(coin.pct1h)}>{formatPct(coin.pct1h)}</span></td>
                        <td style={{ padding: "8px" }}><span className={pctColor(coin.pct24h)}>{formatPct(coin.pct24h)}</span></td>
                        <td style={{ padding: "8px" }}><span className={pctColor(coin.pct7d)}>{formatPct(coin.pct7d)}</span></td>
                        <td style={{ padding: "8px" }}><span className={pctColor(coin.pct30d)}>{formatPct(coin.pct30d)}</span></td>
                        <td style={{ padding: "8px" }}>
                          <span className={regimeBadgeClass(coin.regime)} style={{ fontSize: "9px", padding: "2px 6px", letterSpacing: "0.04em" }}>
                            {regimeLabel(coin.regime)}
                          </span>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <span style={{ color: coin.score > 0 ? "var(--green)" : coin.score < 0 ? "var(--red)" : "var(--text-dim)", fontWeight: 600 }}>
                            {coin.score > 0 ? "+" : ""}{coin.score.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <span style={{ color: coin.divergence.color, fontSize: "10px", fontWeight: 600 }}>
                            {coin.divergence.label}
                          </span>
                        </td>
                        <td style={{ padding: "8px 4px" }}>
                          <svg width="80" height="28" viewBox="0 0 80 28">
                            <polyline points={coin.sparkPoints} fill="none"
                              stroke={coin.pct24h >= 0 ? "var(--green)" : "var(--red)"}
                              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </td>
                        <td style={{ padding: "8px", textAlign: "center" }}>
                          {coin.isBnbNative
                            ? <span style={{ color: "var(--accent)", fontSize: "12px" }} title="BNB-native / BEP-20">◈</span>
                            : <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Regime cluster panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ color: "var(--green)", fontSize: "11px", letterSpacing: "0.1em" }}>▲ BULL TREND ({bullCoins.length})</div>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>BY MOMENTUM SCORE</span>
              </div>
              {bullCoins.length === 0
                ? <div style={{ color: "var(--text-dim)", fontSize: "11px", padding: "8px 0" }}>No assets in bull trend</div>
                : bullCoins.map((c) => <ClusterRow key={c.id} coin={c} onSelect={() => setSelectedCoin(c._raw)} onToggleWatch={() => { toggleWatchlist(c.id); forceUpdate((n) => n + 1); }} />)}
            </div>

            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ color: "var(--red)", fontSize: "11px", letterSpacing: "0.1em" }}>▼ BEAR TREND ({bearCoins.length})</div>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>BY MOMENTUM SCORE</span>
              </div>
              {bearCoins.length === 0
                ? <div style={{ color: "var(--text-dim)", fontSize: "11px", padding: "8px 0" }}>No assets in bear trend</div>
                : bearCoins.map((c) => <ClusterRow key={c.id} coin={c} onSelect={() => setSelectedCoin(c._raw)} onToggleWatch={() => { toggleWatchlist(c.id); forceUpdate((n) => n + 1); }} />)}
            </div>

            <div className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ color: "var(--yellow)", fontSize: "11px", letterSpacing: "0.1em" }}>◈ RANGING ({rangingCoins.length})</div>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>GRID CANDIDATES</span>
              </div>
              {rangingCoins.length === 0
                ? <div style={{ color: "var(--text-dim)", fontSize: "11px", padding: "8px 0" }}>No ranging assets</div>
                : rangingCoins.map((c) => <ClusterRow key={c.id} coin={c} onSelect={() => setSelectedCoin(c._raw)} onToggleWatch={() => { toggleWatchlist(c.id); forceUpdate((n) => n + 1); }} />)}
            </div>

            <div className="panel" style={{ border: "1px solid rgba(240,185,11,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ color: "var(--accent)", fontSize: "11px", letterSpacing: "0.1em" }}>◈ BNB-NATIVE / BEP-20</div>
                <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>HACKATHON TRACK</span>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "10px", marginBottom: "8px" }}>Competition-eligible BNB Chain tokens</div>
              {bnbCoins.length === 0
                ? <div style={{ color: "var(--text-dim)", fontSize: "11px", padding: "8px 0" }}>No BNB-native in top 20</div>
                : bnbCoins.map((c) => <ClusterRow key={c.id} coin={c} showBnb onSelect={() => setSelectedCoin(c._raw)} onToggleWatch={() => { toggleWatchlist(c.id); forceUpdate((n) => n + 1); }} />)}
            </div>
          </div>

          <DivergenceAlerts coins={scannerData} onSelect={(coin) => setSelectedCoin(coin._raw)} />

          {/* Export */}
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
            <span style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em" }}>EXPORT SCAN DATA</span>
            <button
              onClick={() => {
                const data = displayData.map(({ id, symbol, regime, score, divergence, isBnbNative, cmcRank }) => ({ id, symbol, regime, score, divergence, isBnbNative, cmcRank }));
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `marketmind-scan-${Date.now()}.json`; a.click();
                URL.revokeObjectURL(url);
              }}
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-dim)", padding: "4px 12px", fontSize: "10px", letterSpacing: "0.06em", cursor: "pointer" }}
            >
              ↓ JSON
            </button>
          </div>
        </div>
      )}

      {selectedCoin && (
        <TokenModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
      )}
    </div>
  );
}

function ClusterRow({ coin, showBnb, onSelect, onToggleWatch }: { coin: any; showBnb?: boolean; onSelect: () => void; onToggleWatch: () => void }) {
  const watched = isWatched(coin.id);
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div
        onClick={onSelect}
        style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}
      >
        <span style={{ color: "var(--text-dim)", fontSize: "10px", minWidth: "20px" }}>{coin.cmcRank}</span>
        <div>
          <span style={{ color: "var(--text)", fontSize: "11px", fontWeight: 700 }}>{coin.symbol}</span>
          {showBnb && <span style={{ color: "var(--accent)", fontSize: "10px", marginLeft: "4px" }}>◈</span>}
        </div>
        <span style={{ color: coin.divergence.color, fontSize: "9px" }}>{coin.divergence.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div onClick={onSelect} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <svg width="50" height="20" viewBox="0 0 80 28">
            <polyline points={coin.sparkPoints} fill="none"
              stroke={coin.pct24h >= 0 ? "var(--green)" : "var(--red)"}
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px" }}>{formatPrice(coin.price)}</div>
            <div className={pctColor(coin.pct24h)} style={{ fontSize: "10px" }}>{formatPct(coin.pct24h)}</div>
          </div>
          <div style={{ color: coin.score > 0 ? "var(--green)" : coin.score < 0 ? "var(--red)" : "var(--text-dim)", fontSize: "11px", fontWeight: 700, minWidth: "40px", textAlign: "right" }}>
            {coin.score > 0 ? "+" : ""}{coin.score.toFixed(2)}
          </div>
        </div>
        <span
          onClick={(e) => { e.stopPropagation(); onToggleWatch(); }}
          title={watched ? "Unpin" : "Pin to watchlist"}
          style={{
            color: watched ? "var(--accent)" : "var(--text-dim)",
            fontSize: "13px",
            cursor: "pointer",
            userSelect: "none",
            padding: "0 4px",
          }}
        >
          {watched ? "★" : "☆"}
        </span>
      </div>
    </div>
  );
}

function DivergenceAlerts({ coins, onSelect }: { coins: any[]; onSelect: (coin: any) => void }) {
  const alerts = coins.filter((c) => c.divergence.label !== "NEUTRAL");
  if (alerts.length === 0) return null;

  return (
    <div className="panel">
      <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px" }}>
        DIVERGENCE ALERTS ({alerts.length}) — 24H vs 30D MOMENTUM
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
        {alerts.map((coin) => (
          <div
            key={coin.id}
            onClick={() => onSelect(coin)}
            style={{ background: "var(--surface)", border: `1px solid ${coin.divergence.color}44`, padding: "10px 12px", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--text)", fontWeight: 700, fontSize: "13px" }}>{coin.symbol}</span>
                {coin.isBnbNative && <span style={{ color: "var(--accent)", fontSize: "10px" }}>◈ BNB</span>}
              </div>
              <span style={{ color: coin.divergence.color, fontSize: "11px", fontWeight: 700 }}>{coin.divergence.label}</span>
            </div>
            <div style={{ display: "flex", gap: "12px", fontSize: "10px" }}>
              <span style={{ color: "var(--text-dim)" }}>24H: <span className={pctColor(coin.pct24h)}>{formatPct(coin.pct24h)}</span></span>
              <span style={{ color: "var(--text-dim)" }}>30D: <span className={pctColor(coin.pct30d)}>{formatPct(coin.pct30d)}</span></span>
              <span style={{ color: "var(--text-dim)" }}>VOL: {formatLargeNumber(coin.volume)}</span>
            </div>
            <div style={{ marginTop: "6px", color: "var(--text-dim)", fontSize: "10px" }}>
              {coin.divergence.label === "DIST"     && "24h spike diverges from 30d trend — possible distribution"}
              {coin.divergence.label === "EXHAUST"  && "30d uptrend stalling on 24h weakness — momentum fading"}
              {coin.divergence.label === "ACCUM"    && "Oversell vs 30d trend — smart-money accumulation zone"}
              {coin.divergence.label === "BREAKOUT" && "24h and 30d both aligned — confirmed breakout signal"}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: "12px", color: "var(--text-dim)", fontSize: "10px", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
        POWERED BY CMC DATA • ALTERNATIVE.ME F&G • MARKETMIND REGIME SCANNER v1.1.0
      </div>
    </div>
  );
}
