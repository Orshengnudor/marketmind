import { generateSparklinePoints } from "../lib/utils";

interface SparklineProps {
  pct7d: number;
  pct24h: number;
  pct1h: number;
  width?: number;
  height?: number;
}

export default function Sparkline({ pct7d, pct24h, pct1h, width = 60, height = 24 }: SparklineProps) {
  const points = generateSparklinePoints(pct7d, pct24h, pct1h, width, height);
  // Use CSS vars via currentColor trick — read computed style for theme-awareness
  const isUp = pct7d >= 0;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "var(--green)" : "var(--red)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
