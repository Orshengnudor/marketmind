import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatPrice, formatLargeNumber, formatPct, pctColor, getUSDQuote } from "../lib/utils";
import { isWatched, toggleWatchlist } from "../lib/watchlist";
import Sparkline from "../components/Sparkline";
import TokenModal from "../components/TokenModal";

export default function DashboardPage() {
  const [selectedCoin, setSelectedCoin] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [, forceUpdate] = useState(0);

  const listing = useQuery({
    queryKey: ["listing"],
    queryFn: async () => {
      const res = await api.market.listing.$get({ query: { limit: "5000" } });
      return res.json();
    },
    refetchInterval: 60000,
  });

  const global = useQuery({
    queryKey: ["global"],
    queryFn: async () => {
      const res = await api.market.global.$get();
      return res.json();
    },
    refetchInterval: 60000,
  });

  const fg = useQuery({
    queryKey: ["fear-greed"],
    queryFn: async () => {
      const res = await api.market["fear-greed"].$get();
      return res.json();
    },
    refetchInterval: 300000,
  });

  const allCoins: any[] = (listing.data as any)?.data?.cryptoCurrencyList ?? [];
  const globalData = (global.data as any)?.data ?? {};
  const fgData = (fg.data as any)?.data?.[0] ?? {};
  const fgValue = fgData?.value ? parseInt(fgData.value) : null;

  const q2 = query.trim().toLowerCase();
  const coins = q2
    ? allCoins.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q2) ||
          c.name.toLowerCase().includes(q2)
      )
    : allCoins;

  return (
    <div>
      {/* Global Stats Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "1px",
          marginBottom: "16px",
          background: "var(--border)",
          border: "1px solid var(--border)",
        }}
      >
        {[
          {
            label: "DEFI MARKET CAP",
            value: globalData?.defiMarketCap ? formatLargeNumber(globalData.defiMarketCap) : "—",
            sub: globalData?.defi24hPercentageChange != null ? formatPct(globalData.defi24hPercentageChange) : null,
            subColor: pctColor(globalData?.defi24hPercentageChange ?? 0),
          },
          {
            label: "DERIVATIVES VOL",
            value: globalData?.derivativesVolume24h ? formatLargeNumber(globalData.derivativesVolume24h) : "—",
          },
          {
            label: "BTC DOMINANCE",
            value: globalData?.btcDominance ? `${globalData.btcDominance.toFixed(1)}%` : "—",
            sub: globalData?.btcDominance24hPercentageChange != null ? formatPct(globalData.btcDominance24hPercentageChange) : null,
            subColor: pctColor(globalData?.btcDominance24hPercentageChange ?? 0),
          },
          {
            label: "ETH DOMINANCE",
            value: globalData?.ethDominance ? `${globalData.ethDominance.toFixed(1)}%` : "—",
          },
          {
            label: "ACTIVE CRYPTOS",
            value: globalData?.activeCryptoCurrencies?.toLocaleString() ?? "—",
          },
          {
            label: "FEAR & GREED",
            value: fgValue != null ? `${fgValue}` : "—",
            sub: fgData?.value_classification ?? null,
            subColor: fgValue != null
              ? fgValue >= 75 ? "text-red"
              : fgValue >= 55 ? "text-yellow"
              : fgValue >= 45 ? "text-muted"
              : fgValue >= 25 ? "text-yellow"
              : "text-green"
              : "text-muted",
          },
        ].map((stat, i) => (
          <div key={i} style={{ background: "var(--surface)", padding: "10px 12px" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "10px", letterSpacing: "0.08em", marginBottom: "4px" }}>
              {stat.label}
            </div>
            {global.isLoading || listing.isLoading ? (
              <div className="skeleton" style={{ height: "20px", width: "70%" }} />
            ) : (
              <>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>{stat.value}</div>
                {stat.sub && (
                  <div className={stat.subColor} style={{ fontSize: "11px" }}>{stat.sub}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Coin Table */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
            MARKET OVERVIEW — TOP 100 <span style={{ color: "var(--text-dim)" }}>/ CMC RANKED</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
            {/* Search */}
            <input
              className="term-input"
              style={{ width: "200px", padding: "5px 10px", fontSize: "11px" }}
              placeholder="Search symbol / name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              spellCheck={false}
            />
            <div style={{ fontSize: "10px", color: "var(--text-dim)", whiteSpace: "nowrap" }}>
              AUTO-REFRESH 60s <span className="cursor-blink">|</span>
            </div>
          </div>
        </div>

        {listing.isLoading ? (
          <LoadingSkeleton rows={15} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "28px", textAlign: "center" }}>★</th>
                  <th style={{ width: "32px" }}>#</th>
                  <th>NAME</th>
                  <th style={{ textAlign: "right" }}>PRICE</th>
                  <th style={{ textAlign: "right" }}>1H %</th>
                  <th style={{ textAlign: "right" }}>24H %</th>
                  <th style={{ textAlign: "right" }}>7D %</th>
                  <th style={{ textAlign: "right" }}>MARKET CAP</th>
                  <th style={{ textAlign: "right" }}>VOLUME 24H</th>
                  <th style={{ textAlign: "right" }}>7D CHART</th>
                </tr>
              </thead>
              <tbody>
                {coins.map((coin: any) => {
                  const q = getUSDQuote(coin);
                  const watched = isWatched(coin.id);
                  return (
                    <tr
                      key={coin.id}
                      onClick={() => setSelectedCoin(coin)}
                      style={{ cursor: "pointer" }}
                      className="table-row-hover"
                    >
                      <td
                        style={{ textAlign: "center", padding: "0 4px" }}
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
                            lineHeight: 1,
                            userSelect: "none",
                          }}
                        >
                          {watched ? "★" : "☆"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-dim)", fontSize: "11px" }}>{coin.cmcRank}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--text)", fontWeight: 500 }}>{coin.symbol}</span>
                          <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{coin.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text)", fontWeight: 500 }}>
                        {formatPrice(q.price)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={pctColor(q.percentChange1h)}>
                          {formatPct(q.percentChange1h)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={pctColor(q.percentChange24h)}>
                          {formatPct(q.percentChange24h)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span className={pctColor(q.percentChange7d)}>
                          {formatPct(q.percentChange7d)}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                        {formatLargeNumber(q.marketCap)}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--text-muted)" }}>
                        {formatLargeNumber(q.volume24h)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <Sparkline
                            pct7d={q.percentChange7d ?? 0}
                            pct24h={q.percentChange24h ?? 0}
                            pct1h={q.percentChange1h ?? 0}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {coins.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-dim)", fontSize: "12px" }}>
                No coins match "{query}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fear & Greed History */}
      {!fg.isLoading && (fg.data as any)?.data?.length > 0 && (
        <div className="panel" style={{ marginTop: "16px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "12px", letterSpacing: "0.08em", marginBottom: "12px" }}>
            FEAR & GREED — 7 DAY HISTORY
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {((fg.data as any)?.data ?? []).slice(0, 7).reverse().map((d: any, i: number) => {
              const val = parseInt(d.value);
              const color = val >= 75 ? "var(--red)" : val >= 55 ? "var(--yellow)" : val >= 45 ? "var(--text-muted)" : val >= 25 ? "var(--yellow)" : "var(--green)";
              return (
                <div key={i} style={{ textAlign: "center", flex: 1 }}>
                  <div
                    style={{
                      height: `${(val / 100) * 60 + 8}px`,
                      background: color,
                      opacity: 0.8,
                      marginBottom: "4px",
                      minHeight: "8px",
                    }}
                  />
                  <div style={{ fontSize: "13px", color, fontWeight: 600 }}>{val}</div>
                  <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {d.value_classification?.split(" ")[0].toUpperCase()}
                  </div>
                  <div style={{ fontSize: "9px", color: "var(--text-dim)" }}>
                    {new Date(parseInt(d.timestamp) * 1000).toLocaleDateString("en", { weekday: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Token Chart Modal */}
      {selectedCoin && (
        <TokenModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
      )}
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: "34px", marginBottom: "2px" }}
        />
      ))}
    </div>
  );
}
