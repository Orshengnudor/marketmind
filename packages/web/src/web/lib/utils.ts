export function formatPrice(price: number): string {
  if (!price) return "$0.00";
  if (price >= 1000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export function formatLargeNumber(num: number): string {
  if (!num) return "0";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export function formatPct(val: number): string {
  const sign = val > 0 ? "+" : "";
  return `${sign}${val?.toFixed(2)}%`;
}

export function pctColor(val: number): string {
  if (val > 0) return "text-green";
  if (val < 0) return "text-red";
  return "text-muted";
}

export function regimeBadgeClass(regime: string): string {
  switch (regime) {
    case "BULL_TREND": return "badge-bull";
    case "BEAR_TREND": return "badge-bear";
    case "RANGING": return "badge-ranging";
    case "HIGH_VOLATILITY": return "badge-highvol";
    default: return "badge-ranging";
  }
}

export function regimeLabel(regime: string): string {
  switch (regime) {
    case "BULL_TREND": return "BULL TREND";
    case "BEAR_TREND": return "BEAR TREND";
    case "RANGING": return "RANGING";
    case "HIGH_VOLATILITY": return "HIGH VOLATILITY";
    default: return regime;
  }
}

export function fearGreedColor(val: number): string {
  if (val >= 75) return "text-red";
  if (val >= 55) return "text-yellow";
  if (val >= 45) return "text-muted";
  if (val >= 25) return "text-yellow";
  return "text-green"; // extreme fear = buy signal color
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// Helper to extract USD quote from CMC coin (quotes is an array)
export function getUSDQuote(coin: any): any {
  if (!coin?.quotes) return {};
  if (Array.isArray(coin.quotes)) {
    return coin.quotes.find((q: any) => q.name === "USD") ?? coin.quotes[0] ?? {};
  }
  return coin.quotes?.USD ?? {};
}

export function generateSparklinePoints(pct7d: number, pct24h: number, pct1h: number, width = 60, height = 24): string {
  // Generate a plausible sparkline from available % data
  const steps = 7;
  const rawPoints: number[] = [];
  
  // Work backwards from current price = 100
  let current = 100;
  rawPoints.unshift(current);
  current = current / (1 + pct1h / 100);
  rawPoints.unshift(current);
  
  // Interpolate 7d journey
  const dailyChange = pct24h / 1;
  for (let i = 1; i < steps; i++) {
    const noise = (Math.random() - 0.5) * Math.abs(dailyChange) * 0.5;
    current = current * (1 - (dailyChange + noise) / 100 / steps);
    rawPoints.unshift(current);
  }
  
  const min = Math.min(...rawPoints);
  const max = Math.max(...rawPoints);
  const range = max - min || 1;
  
  const points = rawPoints.map((v, i) => {
    const x = (i / (rawPoints.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  
  return points.join(" ");
}
