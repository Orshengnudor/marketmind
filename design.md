# MarketMind Design System

## Concept
Bloomberg Terminal meets Cryptowatch. Dense, data-forward, zero decorative fluff. Every pixel earns its place. Dark, authoritative, fast.

## Color Palette
```
Background:       #000000  (pure black)
Surface:          #0a0a0a  (near-black panels)
Border:           #1a1a1a  (subtle grid lines)
Border bright:    #2a2a2a  (active panel borders)

Green (up/bull):  #00ff88  (bright neon green)
Green dim:        #00cc66  (secondary green)
Red (down/bear):  #ff3355  (neon red)
Red dim:          #cc2244  (secondary red)

Yellow (neutral): #ffaa00  (ranging/neutral signal)
Blue (info):      #0088ff  (info highlights)
Purple (special): #8855ff  (regime badge accent)

Text primary:     #e8e8e8  (near-white)
Text secondary:   #888888  (muted gray)
Text dim:         #444444  (very muted)

Accent:           #00ff88  (primary brand accent = green)
```

## Typography
- **Primary font**: `JetBrains Mono` (monospace) — for all data, numbers, labels
- **Display font**: `JetBrains Mono` — consistent terminal feel throughout
- Import via Google Fonts: `JetBrains+Mono:wght@300;400;500;600;700`

### Scale
- `text-xs` 11px — table labels, timestamps
- `text-sm` 13px — body data
- `text-base` 15px — section headers
- `text-lg` 18px — panel titles
- `text-xl` 22px — major headings
- `text-2xl` 28px — hero numbers

## Layout
- **Zero border-radius** on all containers — sharp corners, terminal style
- Dense grid: 4–6 columns on desktop, 2 on tablet, 1 on mobile
- Tight padding: 8px–12px inside panels
- 1px borders everywhere using `#1a1a1a`
- Scrollable tables with sticky headers
- Fixed sidebar navigation (left, 200px wide)

## Components

### Panel / Card
```
bg: #0a0a0a
border: 1px solid #1a1a1a
padding: 12px
no border-radius
```

### Header bar
```
bg: #000
border-bottom: 1px solid #1a1a1a
height: 44px
flex items-center justify-between
padding: 0 16px
```

### Table rows
```
even rows: bg #050505
odd rows: bg #000
hover: bg #111111
border-bottom: 1px solid #111
```

### Badge / Tag
```
padding: 2px 6px
font-size: 11px
no border-radius (sharp)
```
Regime badges:
- BULL TREND → bg #001a0d, color #00ff88, border #00ff88
- BEAR TREND → bg #1a000a, color #ff3355, border #ff3355
- RANGING → bg #1a1000, color #ffaa00, border #ffaa00
- HIGH VOL → bg #0a001a, color #8855ff, border #8855ff

### Sparkline
- Tiny inline SVG line chart (60x24px)
- Green line if trend up, red if trend down
- No axes, no labels — pure visual signal

### Signal bars
- Horizontal bars showing indicator strength (0-100)
- RSI bar: green/red based on value
- MACD bar: green if positive, red if negative

## Navigation
Sidebar left:
- Logo: `MARKETMIND` in green monospace, caps
- Nav items: Dashboard, Strategy Engine, Skill Spec, About
- Active state: left border 2px green, text white
- Inactive: text #444, hover text #888

## Animations
- Blinking cursor: `|` character, 1s blink cycle on terminal sections
- Number counter: animate from 0 to value on load (0.8s)
- Skeleton pulse: `#111` → `#1a1a1a` loading state
- Page transitions: instant (no slide animations — feels slow)

## Data Display Rules
- Positive % → green + "+" prefix
- Negative % → red, no prefix change
- Large numbers: formatted with commas (e.g., $1,234,567)
- BTC price: always 2 decimal places
- Alt prices < $1: 4–6 decimal places
- Timestamps: UTC always

## Anti-patterns (never use)
- Rounded corners on panels
- White or light backgrounds
- Purple/blue gradients
- Emojis in data UI
- Shadow/glow effects (except subtle green glow on active elements)
- Padding > 16px on inner panels
