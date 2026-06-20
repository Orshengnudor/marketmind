import { Link, useLocation } from "wouter";
import { useThemeContext } from "../lib/theme";
import { useState, useEffect } from "react";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", label: "DASHBOARD", icon: "◈" },
  { path: "/strategy", label: "STRATEGY ENGINE", icon: "◉" },
  { path: "/scanner", label: "REGIME SCANNER", icon: "◑" },
  { path: "/portfolio", label: "PORTFOLIO", icon: "◧" },
  { path: "/watchlist", label: "WATCHLIST", icon: "★" },
  { path: "/heatmap", label: "HEATMAP", icon: "▦" },
  { path: "/alerts", label: "ALERTS", icon: "▲" },
  { path: "/skill-spec", label: "SKILL SPEC", icon: "◎" },
  { path: "/about", label: "ABOUT", icon: "◇" },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { theme, toggle } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Backdrop (mobile only) ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 40,
            display: "none",
          }}
          className="mobile-backdrop"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        style={{
          width: "210px",
          minWidth: "210px",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "transform 0.22s ease",
          zIndex: 50,
        }}
        className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
      >
        {/* Logo */}
        <div
          style={{
            padding: "14px 14px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <img
            src="/icon-512.png"
            alt="MarketMind"
            style={{ width: "32px", height: "32px", objectFit: "contain" }}
          />
          <div>
            <div style={{ color: "var(--accent)", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", lineHeight: 1.2 }}>
              MARKET<span style={{ color: "var(--text)" }}>MIND</span>
            </div>
            <div style={{ color: "var(--text-dim)", fontSize: "9px", marginTop: "1px", letterSpacing: "0.06em" }}>
              REGIME-AWARE STRATEGY
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: "8px" }}>
          {navItems.map((item) => {
            const isActive = item.path === "/" ? location === "/" : location.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 14px",
                    borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    background: isActive ? "var(--nav-active-bg)" : "transparent",
                    color: isActive ? "var(--text)" : "var(--text-dim)",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    transition: "all 0.1s",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
                  }}
                >
                  <span style={{ fontSize: "13px", color: isActive ? "var(--accent)" : "inherit" }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          <div style={{ color: "var(--text-dim)", fontSize: "10px", lineHeight: 1.6 }}>
            <div>CMC POWERED</div>
            <div style={{ color: "var(--accent)" }}>● LIVE DATA</div>
            <div style={{ marginTop: "4px", color: "var(--text-dim)" }}>
              BNB Chain Hackathon 2026
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflow: "auto",
          background: "var(--bg)",
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            height: "44px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            position: "sticky",
            top: 0,
            background: "var(--topbar-bg)",
            zIndex: 10,
            gap: "8px",
          }}
        >
          {/* Left: hamburger (mobile) + page label */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {/* Hamburger button — hidden on desktop via CSS */}
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="hamburger-btn"
              aria-label="Toggle menu"
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "14px",
                padding: "4px 8px",
                lineHeight: 1,
                letterSpacing: 0,
                flexShrink: 0,
                display: "none", // shown via CSS on mobile
              }}
            >
              {sidebarOpen ? "✕" : "☰"}
            </button>

            <div style={{ color: "var(--text-dim)", fontSize: "11px", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {navItems.find((n) => (n.path === "/" ? location === "/" : location.startsWith(n.path)))?.label ?? "MARKETMIND"}
            </div>
          </div>

          {/* Right: live + time + theme */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
            <LiveIndicator />
            <div className="hide-mobile" style={{ color: "var(--text-dim)", fontSize: "11px" }}>
              {new Date().toUTCString().slice(0, 25)} UTC
            </div>
            <button
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "13px",
                padding: "3px 7px",
                lineHeight: 1,
                letterSpacing: "0",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLElement).style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
            >
              {theme === "dark" ? "☀" : "◑"}
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "16px" }}>
          {children}
        </div>
      </main>

      {/* ── Responsive styles ─────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-100%);
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
          .mobile-backdrop {
            display: block !important;
          }
          .hamburger-btn {
            display: block !important;
          }
          .hide-mobile {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function LiveIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "var(--green)",
          display: "inline-block",
          boxShadow: "0 0 4px var(--green)",
          animation: "pulse-dot 2s ease-in-out infinite",
        }}
      />
      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
      <span style={{ fontSize: "10px", color: "var(--green)", letterSpacing: "0.08em" }}>LIVE</span>
    </div>
  );
}
