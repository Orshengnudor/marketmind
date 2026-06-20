import { useEffect, useRef, useState } from "react";
import { formatPrice, formatLargeNumber, formatPct, pctColor, getUSDQuote } from "../lib/utils";
import { isWatched, toggleWatchlist } from "../lib/watchlist";

interface TokenModalProps {
  coin: any;
  onClose: () => void;
}

export default function TokenModal({ coin, onClose }: TokenModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const q = getUSDQuote(coin);
  const [, forceUpdate] = useState(0);

  // TradingView widget
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (!(window as any).TradingView) return;
      new (window as any).TradingView.widget({
        container_id: "tv-chart-container",
        autosize: true,
        symbol: `BINANCE:${coin.symbol}USDT`,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        toolbar_bg: "#0B0E11",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        save_image: false,
        studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
        overrides: {
          "paneProperties.background": "#0B0E11",
          "paneProperties.backgroundType": "solid",
          "scalesProperties.textColor": "#848E9C",
          "mainSeriesProperties.candleStyle.upColor": "#0ECB81",
          "mainSeriesProperties.candleStyle.downColor": "#F6465D",
          "mainSeriesProperties.candleStyle.wickUpColor": "#0ECB81",
          "mainSeriesProperties.candleStyle.wickDownColor": "#F6465D",
          "mainSeriesProperties.candleStyle.borderUpColor": "#0ECB81",
          "mainSeriesProperties.candleStyle.borderDownColor": "#F6465D",
        },
      });
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [coin.symbol]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const volMcapRatio = q.marketCap > 0 ? (q.volume24h / q.marketCap) * 100 : 0;
  const circulatingPct = coin.maxSupply > 0 ? (coin.circulatingSupply / coin.maxSupply) * 100 : null;
  const watched = isWatched(coin.id);

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "var(--bg)", border: "1px solid var(--border)",
          width: "100%", maxWidth: "1100px", maxHeight: "90vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--surface)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ color: "var(--text)", fontSize: "20px", fontWeight: 700, letterSpacing: "0.05em" }}>
                  {coin.symbol}
                </span>
                <span style={{ color: "var(--text-dim)", fontSize: "13px" }}>{coin.name}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "11px", background: "var(--bg)", padding: "2px 6px", border: "1px solid var(--border)" }}>
                  #{coin.cmcRank}
                </span>
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "6px", alignItems: "center" }}>
                <span style={{ color: "var(--text)", fontSize: "22px", fontWeight: 700 }}>
                  {formatPrice(q.price)}
                </span>
                <span className={pctColor(q.percentChange24h)} style={{ fontSize: "14px", fontWeight: 600 }}>
                  {formatPct(q.percentChange24h)} 24H
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {/* Watchlist star */}
            <button
              onClick={() => {
                toggleWatchlist(coin.id);
                forceUpdate((n) => n + 1);
              }}
              title={watched ? "Remove from watchlist" : "Add to watchlist"}
              style={{
                background: watched ? "rgba(240,185,11,0.1)" : "transparent",
                border: `1px solid ${watched ? "var(--accent)" : "var(--border)"}`,
                color: watched ? "var(--accent)" : "var(--text-dim)",
                cursor: "pointer",
                padding: "6px 12px",
                fontSize: "14px",
                letterSpacing: "0.06em",
                lineHeight: 1,
                transition: "all 0.15s",
              }}
            >
              {watched ? "★" : "☆"}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "1px solid var(--border)",
                color: "var(--text-dim)", cursor: "pointer", padding: "6px 12px",
                fontSize: "12px", letterSpacing: "0.06em",
              }}
            >
              ESC ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Chart */}
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <div id="tv-chart-container" ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "460px" }} />
          </div>

          {/* Stats sidebar */}
          <div style={{
            width: "240px", flexShrink: 0, borderLeft: "1px solid var(--border)",
            overflowY: "auto", background: "var(--surface)",
          }}>
            {/* Price performance */}
            <Section title="PRICE PERFORMANCE">
              <StatRow label="1 Hour" value={formatPct(q.percentChange1h)} cls={pctColor(q.percentChange1h)} />
              <StatRow label="24 Hours" value={formatPct(q.percentChange24h)} cls={pctColor(q.percentChange24h)} />
              <StatRow label="7 Days" value={formatPct(q.percentChange7d)} cls={pctColor(q.percentChange7d)} />
              <StatRow label="30 Days" value={formatPct(q.percentChange30d)} cls={pctColor(q.percentChange30d)} />
              {q.percentChange60d != null && (
                <StatRow label="60 Days" value={formatPct(q.percentChange60d)} cls={pctColor(q.percentChange60d)} />
              )}
              {q.percentChange90d != null && (
                <StatRow label="90 Days" value={formatPct(q.percentChange90d)} cls={pctColor(q.percentChange90d)} />
              )}
            </Section>

            {/* Market data */}
            <Section title="MARKET DATA">
              <StatRow label="Market Cap" value={formatLargeNumber(q.marketCap)} />
              <StatRow label="Volume 24H" value={formatLargeNumber(q.volume24h)} />
              <StatRow
                label="Vol/MCap"
                value={`${volMcapRatio.toFixed(2)}%`}
                cls={volMcapRatio > 20 ? "text-green" : volMcapRatio > 5 ? "text-yellow" : "text-muted"}
              />
              {q.marketCapDominance != null && (
                <StatRow label="Dominance" value={`${q.marketCapDominance?.toFixed(2)}%`} />
              )}
            </Section>

            {/* Supply */}
            <Section title="SUPPLY">
              {coin.circulatingSupply != null && (
                <StatRow label="Circulating" value={formatSupply(coin.circulatingSupply)} />
              )}
              {coin.totalSupply != null && (
                <StatRow label="Total" value={formatSupply(coin.totalSupply)} />
              )}
              {coin.maxSupply != null && (
                <StatRow label="Max" value={formatSupply(coin.maxSupply)} />
              )}
              {circulatingPct != null && (
                <div style={{ padding: "6px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>CIRC / MAX</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{circulatingPct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: "4px", background: "var(--border)" }}>
                    <div style={{ height: "100%", width: `${Math.min(circulatingPct, 100)}%`, background: "var(--accent)" }} />
                  </div>
                </div>
              )}
            </Section>

            {/* Links */}
            <Section title="LINKS">
              <div style={{ padding: "4px 14px 8px" }}>
                <a
                  href={`https://coinmarketcap.com/currencies/${coin.slug ?? coin.name?.toLowerCase().replace(/\s+/g, "-")}/`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)", fontSize: "11px", textDecoration: "none", display: "block", marginBottom: "6px" }}
                >
                  ↗ CoinMarketCap
                </a>
                <a
                  href={`https://www.tradingview.com/chart/?symbol=BINANCE:${coin.symbol}USDT`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent)", fontSize: "11px", textDecoration: "none", display: "block" }}
                >
                  ↗ TradingView (full)
                </a>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div style={{
        padding: "8px 14px 6px",
        color: "var(--text-dim)", fontSize: "10px",
        letterSpacing: "0.08em", background: "rgba(0,0,0,0.2)",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 14px", borderBottom: "1px solid rgba(255,255,255,0.03)",
    }}>
      <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{label}</span>
      <span className={cls} style={{ fontSize: "11px", fontWeight: 500, color: cls ? undefined : "var(--text-muted)" }}>
        {value}
      </span>
    </div>
  );
}

function formatSupply(n: number): string {
  if (!n) return "—";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
}
