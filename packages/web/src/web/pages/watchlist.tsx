import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { getWatchlist, toggleWatchlist } from "../lib/watchlist";
import { formatPrice, formatPct, pctColor, getUSDQuote, generateSparklinePoints, regimeBadgeClass, regimeLabel } from "../lib/utils";
import TokenModal from "../components/TokenModal";
import CoinSearch from "../components/CoinSearch";

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
  BULL_TREND: "#0ECB81",
  BEAR_TREND: "#F6465D",
  RANGING: "#F0B90B",
  ACCUMULATION: "#8855ff",
};

export default function WatchlistPage() {
  const [watchIds, setWatchIds] = useState<number[]>([]);
  const [modalCoin, setModalCoin] = useState<any>(null);

  useEffect(() => {
    setWatchIds(getWatchlist());
  }, []);

  const listing = useQuery({
    queryKey: ["listing-watchlist"],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: "5000" } });
      return res.json();
    },
    staleTime: 60_000,
  });

  const allCoins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];
  const watched = allCoins.filter((c) => watchIds.includes(c.id));

  function handleToggle(id: number) {
    const next = toggleWatchlist(id);
    setWatchIds(next);
  }

  // CoinSearch: add coin to watchlist if not already pinned
  function handleSearchSelect(coin: { id: number }) {
    if (!watchIds.includes(coin.id)) {
      const next = toggleWatchlist(coin.id);
      setWatchIds(next);
    }
  }

  const regimeCounts = { BULL_TREND: 0, BEAR_TREND: 0, RANGING: 0, ACCUMULATION: 0 };
  watched.forEach((c) => { const r = classifyRegime(c); if (r in regimeCounts) regimeCounts[r as keyof typeof regimeCounts]++; });

  return (
    <div>
      {/* Header */}
      <div className="panel" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ color: "var(--accent)", fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", marginBottom: "4px" }}>
              WATCHLIST
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
              Pinned assets — regime computed live from CMC data
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ border: "1px solid var(--border)", padding: "4px 10px", color: "var(--text-dim)", fontSize: "10px" }}>
              {watchIds.length} PINNED
            </span>
            {watched.length > 0 && (
              <span style={{ border: "1px solid var(--border)", padding: "4px 10px", color: REGIME_COLORS[Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0][0]], fontSize: "10px" }}>
                DOMINANT: {regimeLabel(Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0][0])}
              </span>
            )}
          </div>
        </div>

        {/* Search to pin new coins */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>
            PIN A COIN
          </div>
          <CoinSearch
            coins={allCoins}
            value={null}
            onChange={handleSearchSelect}
            placeholder="Search and pin any coin from top 100..."
            loading={listing.isLoading}
            style={{ maxWidth: "360px" }}
          />
        </div>
      </div>

      {listing.isLoading ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px", color: "var(--text-dim)" }}>
          <div style={{ fontSize: "13px", letterSpacing: "0.1em", marginBottom: "8px" }}>LOADING WATCHLIST<span className="cursor-blink">_</span></div>
        </div>
      ) : watchIds.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "60px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>★</div>
          <div style={{ color: "var(--text-dim)", fontSize: "13px", letterSpacing: "0.1em", marginBottom: "8px" }}>NO ASSETS PINNED</div>
          <div style={{ color: "var(--text-dim)", fontSize: "11px" }}>
            Use the search above, or star any asset from the Dashboard or Scanner.
          </div>
        </div>
      ) : watched.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "11px" }}>
          Pinned assets not found in current CMC data slice. Try refreshing.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Regime distribution bar */}
          {watched.length > 1 && (
            <div className="panel" style={{ padding: "10px 14px" }}>
              <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.06em", marginBottom: "6px" }}>REGIME DISTRIBUTION</div>
              <div style={{ display: "flex", height: "6px", gap: "2px" }}>
                {Object.entries(regimeCounts).map(([r, c]) => c > 0 && (
                  <div key={r} title={`${regimeLabel(r)}: ${c}`}
                    style={{ flex: c, background: REGIME_COLORS[r] }}
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

          {/* Watchlist table */}
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "11px", letterSpacing: "0.1em" }}>PINNED ASSETS</div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>CLICK ROW TO OPEN CHART · ★ TO UNPIN</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["★", "ASSET", "PRICE", "1H", "24H", "7D", "30D", "REGIME", "TREND"].map((h) => (
                      <th key={h} style={{ textAlign: h === "★" ? "center" : "left", padding: "6px 8px", color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", fontWeight: 400, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {watched.map((coin) => {
                    const q = getUSDQuote(coin);
                    const price = q?.price ?? 0;
                    const h1 = q?.percentChange1h ?? 0;
                    const h24 = q?.percentChange24h ?? 0;
                    const d7 = q?.percentChange7d ?? 0;
                    const d30 = q?.percentChange30d ?? 0;
                    const regime = classifyRegime(coin);
                    const sparkPoints = generateSparklinePoints([d30, d7, h24, h1]);

                    return (
                      <tr
                        key={coin.id}
                        style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.1s" }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "var(--surface)"}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                        onClick={() => setModalCoin(coin)}
                      >
                        <td style={{ textAlign: "center", padding: "8px" }} onClick={(e) => { e.stopPropagation(); handleToggle(coin.id); }}>
                          <span style={{ color: "var(--accent)", fontSize: "14px", cursor: "pointer" }} title="Unpin">★</span>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div>
                              <div style={{ color: "var(--text)", fontWeight: 600 }}>{coin.symbol}</div>
                              <div style={{ color: "var(--text-dim)", fontSize: "9px" }}>{coin.name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "8px", color: "var(--text)", fontWeight: 600 }}>{formatPrice(price)}</td>
                        <td style={{ padding: "8px", color: pctColor(h1) }}>{formatPct(h1)}</td>
                        <td style={{ padding: "8px", color: pctColor(h24) }}>{formatPct(h24)}</td>
                        <td style={{ padding: "8px", color: pctColor(d7) }}>{formatPct(d7)}</td>
                        <td style={{ padding: "8px", color: pctColor(d30) }}>{formatPct(d30)}</td>
                        <td style={{ padding: "8px" }}>
                          <span className={regimeBadgeClass(regime)} style={{ fontSize: "9px", padding: "2px 6px" }}>
                            {regimeLabel(regime)}
                          </span>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <svg width="60" height="22" style={{ display: "block" }}>
                            <polyline
                              points={sparkPoints}
                              fill="none"
                              stroke={h24 >= 0 ? "var(--green)" : "var(--red)"}
                              strokeWidth="1.5"
                            />
                          </svg>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modalCoin && (
        <TokenModal coin={modalCoin} onClose={() => setModalCoin(null)} />
      )}
    </div>
  );
}
