import { useState, useRef, useEffect } from "react";

interface Coin {
  id: number;
  symbol: string;
  name: string;
  cmcRank?: number;
}

interface CoinSearchProps {
  coins: Coin[];
  value: Coin | null;
  onChange: (coin: Coin) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  loading?: boolean;
}

export default function CoinSearch({ coins, value, onChange, placeholder = "Search coin...", style, loading }: CoinSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim() === ""
    ? coins.slice(0, 50)
    : coins.filter((c) =>
        c.symbol.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 50);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlighted(0); }, [query]);

  function select(coin: Coin) {
    onChange(coin);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
    else if (e.key === "Escape") { setOpen(false); setQuery(""); inputRef.current?.blur(); }
  }

  const displayValue = open ? query : (value ? `#${value.cmcRank ?? "?"} ${value.symbol} — ${value.name}` : "");

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      <input
        ref={inputRef}
        className="term-input"
        style={{ width: "100%", boxSizing: "border-box" }}
        value={displayValue}
        placeholder={loading ? "Loading coins..." : placeholder}
        disabled={loading}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {open && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 999,
            background: "var(--sidebar-bg)",
            border: "1px solid var(--border-strong)",
            maxHeight: "240px",
            overflowY: "auto",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          {filtered.map((coin, i) => (
            <div
              key={coin.id}
              onMouseDown={() => select(coin)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: "7px 10px",
                cursor: "pointer",
                background: i === highlighted ? "var(--nav-active-bg)" : "transparent",
                borderLeft: i === highlighted ? "2px solid var(--accent)" : "2px solid transparent",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "9px", minWidth: "24px" }}>#{coin.cmcRank ?? i + 1}</span>
                <span style={{ color: "var(--accent)", fontSize: "12px", fontWeight: 700 }}>{coin.symbol}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{coin.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && query.trim() !== "" && filtered.length === 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
          background: "var(--sidebar-bg)", border: "1px solid var(--border-strong)",
          padding: "10px", color: "var(--text-dim)", fontSize: "11px",
        }}>
          No match for "{query}" in top 5000 coins
        </div>
      )}
    </div>
  );
}
