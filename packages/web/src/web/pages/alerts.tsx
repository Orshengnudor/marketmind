import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatPrice, formatPct, pctColor, getUSDQuote, regimeLabel } from "../lib/utils";
import TokenModal from "../components/TokenModal";

function classifyRegime(score: number) {
  if (score > 3) return "BULL_TREND";
  if (score < -3) return "BEAR_TREND";
  if (Math.abs(score) < 1) return "RANGING";
  return "ACCUMULATION";
}

function computeScore(coin: any): number {
  const q = getUSDQuote(coin);
  const h1 = q?.percentChange1h ?? 0;
  const h24 = q?.percentChange24h ?? 0;
  const d7 = q?.percentChange7d ?? 0;
  const d30 = q?.percentChange30d ?? 0;
  return h1 * 0.2 + h24 * 0.3 + d7 * 0.3 + d30 * 0.2;
}

const REGIME_COLORS: Record<string, string> = {
  BULL_TREND:   "#0ECB81",
  BEAR_TREND:   "#F6465D",
  RANGING:      "#F0B90B",
  ACCUMULATION: "#8855ff",
};

// Thresholds between regimes
const THRESHOLDS = [
  { score: 3,  from: "ACCUMULATION", to: "BULL_TREND" },
  { score: -3, from: "ACCUMULATION", to: "BEAR_TREND" },
  { score: 1,  from: "RANGING",      to: "ACCUMULATION" },
  { score: -1, from: "RANGING",      to: "ACCUMULATION" },
];

const PROXIMITY = 0.5; // within 0.5 of a threshold = about to flip

type AlertType = "FLIP_BULL" | "FLIP_BEAR" | "DIVERGENCE" | "EXTREME_BULL" | "EXTREME_BEAR" | "VOLATILITY";

interface Alert {
  type: AlertType;
  coin: any;
  score: number;
  message: string;
  distance: number;
  severity: "HIGH" | "MED" | "LOW";
}

const ALERT_COLORS: Record<AlertType, string> = {
  FLIP_BULL:    "#0ECB81",
  FLIP_BEAR:    "#F6465D",
  DIVERGENCE:   "#F0B90B",
  EXTREME_BULL: "#0ECB81",
  EXTREME_BEAR: "#F6465D",
  VOLATILITY:   "#8855ff",
};

const ALERT_ICONS: Record<AlertType, string> = {
  FLIP_BULL:    "▲",
  FLIP_BEAR:    "▼",
  DIVERGENCE:   "◈",
  EXTREME_BULL: "◉",
  EXTREME_BEAR: "◉",
  VOLATILITY:   "⚡",
};

function buildAlerts(coins: any[]): Alert[] {
  const alerts: Alert[] = [];

  coins.forEach((coin) => {
    const score = computeScore(coin);
    const regime = classifyRegime(score);
    const q = getUSDQuote(coin);
    const h1 = q?.percentChange1h ?? 0;
    const h24 = q?.percentChange24h ?? 0;
    const d7 = q?.percentChange7d ?? 0;

    // Regime flip proximity
    const distToBull = Math.abs(score - 3);
    const distToBear = Math.abs(score - (-3));

    if (distToNull(score, 3) && score > 0) {
      alerts.push({
        type: "FLIP_BULL",
        coin,
        score,
        message: `${coin.symbol} approaching BULL_TREND flip (score ${score.toFixed(2)} / threshold 3.0)`,
        distance: distToNull(score, 3) as number,
        severity: distToNull(score, 3) as number < 0.25 ? "HIGH" : "MED",
      });
    }

    if (distToNull(score, -3) && score < 0) {
      alerts.push({
        type: "FLIP_BEAR",
        coin,
        score,
        message: `${coin.symbol} approaching BEAR_TREND flip (score ${score.toFixed(2)} / threshold -3.0)`,
        distance: distToNull(score, -3) as number,
        severity: distToNull(score, -3) as number < 0.25 ? "HIGH" : "MED",
      });
    }

    // Divergence: short-term vs long-term in opposite directions
    if ((h1 > 1 && d7 < -5) || (h1 < -1 && d7 > 5)) {
      alerts.push({
        type: "DIVERGENCE",
        coin,
        score,
        message: `${coin.symbol} divergence — 1h ${h1 >= 0 ? "+" : ""}${h1.toFixed(2)}% vs 7d ${d7 >= 0 ? "+" : ""}${d7.toFixed(2)}%`,
        distance: Math.abs(h1 - d7),
        severity: Math.abs(h1 - d7) > 10 ? "HIGH" : "MED",
      });
    }

    // Extreme momentum
    if (score > 8) {
      alerts.push({
        type: "EXTREME_BULL",
        coin,
        score,
        message: `${coin.symbol} extreme bull momentum — score ${score.toFixed(2)} (overbought risk)`,
        distance: 0,
        severity: "MED",
      });
    }
    if (score < -8) {
      alerts.push({
        type: "EXTREME_BEAR",
        coin,
        score,
        message: `${coin.symbol} extreme bear momentum — score ${score.toFixed(2)} (oversold opportunity)`,
        distance: 0,
        severity: "MED",
      });
    }

    // High volatility proxy: large spread between h1 and h24
    const spread = Math.abs(h1 * 24 - h24);
    if (spread > 8 && Math.abs(h1) > 1.5) {
      alerts.push({
        type: "VOLATILITY",
        coin,
        score,
        message: `${coin.symbol} high volatility detected — intraday spread ${spread.toFixed(1)}%`,
        distance: spread,
        severity: spread > 15 ? "HIGH" : "LOW",
      });
    }
  });

  // Sort: HIGH first, then by distance (closest to threshold first)
  return alerts.sort((a, b) => {
    const sev = { HIGH: 0, MED: 1, LOW: 2 };
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
    return a.distance - b.distance;
  });
}

// Helper: returns distance if within PROXIMITY, else false
function distToNull(score: number, threshold: number): number | false {
  const d = Math.abs(score - threshold);
  return d <= PROXIMITY ? d : false;
}

const SEV_COLORS = { HIGH: "#F6465D", MED: "#F0B90B", LOW: "#8855ff" };

export default function AlertsPage() {
  const [modalCoin, setModalCoin] = useState<any>(null);
  const [filter, setFilter] = useState<AlertType | "ALL">("ALL");

  const listing = useQuery({
    queryKey: ["listing-alerts"],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: "50" } });
      return res.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const coins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];
  const allAlerts = buildAlerts(coins);
  const filtered = filter === "ALL" ? allAlerts : allAlerts.filter((a) => a.type === filter);

  const highCount = allAlerts.filter((a) => a.severity === "HIGH").length;
  const medCount = allAlerts.filter((a) => a.severity === "MED").length;
  const typeCounts: Partial<Record<AlertType, number>> = {};
  allAlerts.forEach((a) => { typeCounts[a.type] = (typeCounts[a.type] ?? 0) + 1; });

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--accent)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
              ALERTS PANEL
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              Regime flip proximity · divergence · extreme momentum · volatility — derived from CMC live data
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {highCount > 0 && (
              <span style={{ background: "rgba(246,70,93,0.15)", border: "1px solid #F6465D", color: "#F6465D", padding: "4px 10px", fontSize: "10px", letterSpacing: "0.06em" }}>
                ▲ {highCount} HIGH
              </span>
            )}
            {medCount > 0 && (
              <span style={{ background: "rgba(240,185,11,0.1)", border: "1px solid #F0B90B", color: "#F0B90B", padding: "4px 10px", fontSize: "10px" }}>
                {medCount} MED
              </span>
            )}
            <span style={{ border: "1px solid var(--border)", color: "var(--text-dim)", padding: "4px 10px", fontSize: "10px" }}>
              {allAlerts.length} TOTAL
            </span>
          </div>
        </div>

        {/* Filter pills */}
        {coins.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginTop: "14px", flexWrap: "wrap" }}>
            {(["ALL", "FLIP_BULL", "FLIP_BEAR", "DIVERGENCE", "EXTREME_BULL", "EXTREME_BEAR", "VOLATILITY"] as const).map((t) => {
              const count = t === "ALL" ? allAlerts.length : (typeCounts[t as AlertType] ?? 0);
              if (t !== "ALL" && count === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  style={{
                    background: filter === t ? (t === "ALL" ? "var(--accent)" : ALERT_COLORS[t as AlertType]) : "var(--surface)",
                    border: `1px solid ${filter === t ? (t === "ALL" ? "var(--accent)" : ALERT_COLORS[t as AlertType]) : "var(--border)"}`,
                    color: filter === t ? (t === "ALL" ? "#000" : "#000") : "var(--text-dim)",
                    padding: "3px 10px",
                    fontSize: "10px",
                    letterSpacing: "0.06em",
                    cursor: "pointer",
                  }}
                >
                  {t === "ALL" ? "ALL" : `${ALERT_ICONS[t as AlertType]} ${t.replace(/_/g, " ")}`} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {listing.isLoading ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>
          <div style={{ fontSize: "13px", letterSpacing: "0.1em" }}>SCANNING FOR ALERTS<span className="cursor-blink">_</span></div>
          {["Fetching CMC data...", "Computing momentum scores...", "Detecting regime thresholds...", "Building alert queue..."].map((s, i) => (
            <div key={i} style={{ fontSize: "11px", marginBottom: "4px", marginTop: "6px", color: "var(--text-dim)" }}>{">"} {s}</div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "20px", marginBottom: "10px", color: "var(--green)" }}>◉</div>
          <div style={{ color: "var(--text-dim)", fontSize: "13px", letterSpacing: "0.1em" }}>NO ALERTS</div>
          <div style={{ color: "var(--text-dim)", fontSize: "11px", marginTop: "6px" }}>
            {filter !== "ALL" ? `No ${filter.replace(/_/g, " ")} alerts active.` : "Market conditions are stable — no regime flips or divergences detected."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((alert, i) => {
            const q = getUSDQuote(alert.coin);
            const price = q?.price ?? 0;
            const h24 = q?.percentChange24h ?? 0;
            const regime = classifyRegime(alert.score);

            return (
              <div
                key={i}
                className="panel"
                style={{
                  borderLeft: `3px solid ${SEV_COLORS[alert.severity]}`,
                  cursor: "pointer",
                  transition: "background 0.1s",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  flexWrap: "wrap",
                }}
                onClick={() => setModalCoin(alert.coin)}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--surface)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = ""}
              >
                {/* Alert type icon */}
                <div style={{
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `${ALERT_COLORS[alert.type]}22`,
                  border: `1px solid ${ALERT_COLORS[alert.type]}`,
                  fontSize: "16px",
                  color: ALERT_COLORS[alert.type],
                  flexShrink: 0,
                }}>
                  {ALERT_ICONS[alert.type]}
                </div>

                {/* Coin info */}
                <div style={{ minWidth: "70px" }}>
                  <div style={{ color: "var(--text)", fontWeight: 700, fontSize: "13px" }}>{alert.coin.symbol}</div>
                  <div style={{ color: "var(--text-dim)", fontSize: "9px" }}>{alert.coin.name}</div>
                </div>

                {/* Alert message */}
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ color: ALERT_COLORS[alert.type], fontSize: "10px", letterSpacing: "0.06em", marginBottom: "2px" }}>
                    {alert.type.replace(/_/g, " ")}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{alert.message}</div>
                </div>

                {/* Right side: price + severity + regime */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--text)", fontSize: "12px", fontWeight: 600 }}>{formatPrice(price)}</div>
                    <div style={{ color: pctColor(h24), fontSize: "10px" }}>{formatPct(h24)} 24h</div>
                  </div>
                  <span style={{
                    padding: "3px 8px",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    border: `1px solid ${REGIME_COLORS[regime]}`,
                    color: REGIME_COLORS[regime],
                    background: `${REGIME_COLORS[regime]}18`,
                  }}>
                    {regimeLabel(regime)}
                  </span>
                  <span style={{
                    padding: "3px 8px",
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    border: `1px solid ${SEV_COLORS[alert.severity]}`,
                    color: SEV_COLORS[alert.severity],
                    fontWeight: 700,
                  }}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div style={{ marginTop: "16px", padding: "12px 16px", border: "1px solid var(--border)", color: "var(--text-dim)", fontSize: "10px", lineHeight: 1.7 }}>
        <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: "4px", letterSpacing: "0.06em" }}>ALERT LOGIC</div>
        <div>▲ FLIP BULL — momentum score within 0.5 of +3.0 threshold (regime about to turn bullish)</div>
        <div>▼ FLIP BEAR — momentum score within 0.5 of −3.0 threshold (regime about to turn bearish)</div>
        <div>◈ DIVERGENCE — 1h and 7d moving in opposite directions (trend confusion)</div>
        <div>◉ EXTREME — momentum score beyond ±8 (overbought / oversold)</div>
        <div>⚡ VOLATILITY — large intraday spread relative to 24h move</div>
        <div style={{ marginTop: "4px", color: "var(--text-dim)", opacity: 0.6 }}>All alerts derived from live CMC data — no execution, information only.</div>
      </div>

      {modalCoin && <TokenModal coin={modalCoin} onClose={() => setModalCoin(null)} />}
    </div>
  );
}
