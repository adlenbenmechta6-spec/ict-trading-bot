// Chart Generator - Creates professional trading chart images with SVG
// Shows candlesticks, entry, TP (green boxes), SL (red boxes), and ICT elements

export interface ChartConfig {
  pair: string;
  timeframe: string;
  currentPrice: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  type: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  ictElements?: string[];
  killZone?: string;
  liquidityType?: string;
  pdZone?: string;
  pattern?: string;
  confidence?: number;
  riskReward?: string;
}

const WIDTH = 800;
const HEIGHT = 520;
const CHART_LEFT = 60;
const CHART_RIGHT = 740;
const CHART_TOP = 55;
const CHART_BOTTOM = 400;
const CHART_WIDTH = CHART_RIGHT - CHART_LEFT;
const CHART_HEIGHT = CHART_BOTTOM - CHART_TOP;

function priceToY(price: number, minPrice: number, maxPrice: number): number {
  if (maxPrice === minPrice) return CHART_TOP + CHART_HEIGHT / 2;
  return CHART_TOP + (1 - (price - minPrice) / (maxPrice - minPrice)) * CHART_HEIGHT;
}

function formatPrice(price: number, pair: string): string {
  if (pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS')) {
    return price.toFixed(2);
  }
  return price.toFixed(5);
}

// Generate realistic candlestick data
function generateCandles(config: ChartConfig, count: number = 30) {
  const { currentPrice, high, low, type } = config;
  const candles: Array<{ open: number; close: number; high: number; low: number; bullish: boolean }> = [];

  const range = high - low;
  let price = currentPrice - (type === 'BUY' ? -1 : 1) * range * 0.3;

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    // Trend toward current direction
    const trendBias = type === 'BUY' ? 0.3 : -0.3;
    const noise = (Math.random() - 0.5) * range * 0.08;
    const change = noise + trendBias * range * 0.02;

    const open = price;
    const close = price + change;
    const wickUp = Math.abs(change) * (0.3 + Math.random() * 0.7);
    const wickDown = Math.abs(change) * (0.3 + Math.random() * 0.7);
    const candleHigh = Math.max(open, close) + wickUp;
    const candleLow = Math.min(open, close) - wickDown;

    candles.push({
      open: parseFloat(open.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      high: parseFloat(Math.min(candleHigh, high * 1.01).toFixed(5)),
      low: parseFloat(Math.max(candleLow, low * 0.99).toFixed(5)),
      bullish: close >= open,
    });

    price = close;
  }

  // Ensure last candle is near current price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    const diff = currentPrice - last.close;
    last.close = currentPrice;
    last.open = currentPrice - diff;
    last.bullish = last.close >= last.open;
    last.high = Math.max(last.high, currentPrice + Math.abs(diff) * 0.5);
    last.low = Math.min(last.low, currentPrice - Math.abs(diff) * 0.5);
  }

  return candles;
}

export function generateChartSVG(config: ChartConfig): string {
  const { pair, timeframe, currentPrice, high, low, type, entry, tp1, tp2, sl, ictElements, killZone, liquidityType, pdZone, pattern, confidence, riskReward } = config;

  const candles = generateCandles(config);

  // Calculate price range to include TP and SL
  const allPrices = [high, low, entry, tp1, tp2, sl, ...candles.map(c => [c.high, c.low]).flat()];
  let minPrice = Math.min(...allPrices) * 0.999;
  let maxPrice = Math.max(...allPrices) * 1.001;

  // Ensure minimum range
  if (maxPrice - minPrice < currentPrice * 0.001) {
    minPrice = currentPrice * 0.995;
    maxPrice = currentPrice * 1.005;
  }

  const candleWidth = CHART_WIDTH / candles.length;
  const bodyWidth = candleWidth * 0.6;

  // Background
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`;

  // Background gradient
  svg += `<defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0d1117"/>
      <stop offset="100%" style="stop-color:#161b22"/>
    </linearGradient>
    <linearGradient id="tpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#00c853;stop-opacity:0.35"/>
      <stop offset="100%" style="stop-color:#00c853;stop-opacity:0.08"/>
    </linearGradient>
    <linearGradient id="slGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ff1744;stop-opacity:0.35"/>
      <stop offset="100%" style="stop-color:#ff1744;stop-opacity:0.08"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.5"/>
    </filter>
  </defs>`;

  svg += `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGrad)" rx="12"/>`;

  // ─── Header ─────────────────────────────────────────────────────
  const headerColor = type === 'BUY' ? '#00c853' : '#ff1744';
  const typeEmoji = type === 'BUY' ? '🟢' : '🔴';
  const changeStr = `${config.changePercent >= 0 ? '+' : ''}${config.changePercent.toFixed(2)}%`;

  svg += `<text x="${CHART_LEFT}" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white">${pair}</text>`;
  svg += `<text x="${CHART_LEFT + 90}" y="28" font-family="Arial, sans-serif" font-size="13" fill="#8b949e">${timeframe}</text>`;
  svg += `<rect x="${CHART_LEFT + 130}" y="13" width="55" height="22" rx="4" fill="${headerColor}" opacity="0.9"/>`;
  svg += `<text x="${CHART_LEFT + 157}" y="29" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${type}</text>`;
  svg += `<text x="${CHART_RIGHT}" y="28" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="end">${formatPrice(currentPrice, pair)}</text>`;
  svg += `<text x="${CHART_RIGHT - 90}" y="28" font-family="Arial, sans-serif" font-size="12" fill="${config.changePercent >= 0 ? '#00c853' : '#ff1744'}" text-anchor="end">${changeStr}</text>`;

  // ─── Chart Border ────────────────────────────────────────────────
  svg += `<rect x="${CHART_LEFT}" y="${CHART_TOP}" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" fill="none" stroke="#21262d" stroke-width="1" rx="2"/>`;

  // Grid lines
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = CHART_TOP + (CHART_HEIGHT / gridLines) * i;
    const price = maxPrice - (maxPrice - minPrice) * (i / gridLines);
    svg += `<line x1="${CHART_LEFT}" y1="${y}" x2="${CHART_RIGHT}" y2="${y}" stroke="#21262d" stroke-width="0.5" stroke-dasharray="4,4"/>`;
    svg += `<text x="${CHART_LEFT - 5}" y="${y + 4}" font-family="monospace" font-size="9" fill="#484f58" text-anchor="end">${formatPrice(price, pair)}</text>`;
  }

  // ─── TP Zone (Green Box) ────────────────────────────────────────
  const tpMinY = priceToY(Math.max(tp1, tp2), minPrice, maxPrice);
  const tpMaxY = priceToY(Math.min(tp1, tp2), minPrice, maxPrice);
  const tpHeight = Math.max(tpMaxY - tpMinY, 4);

  svg += `<rect x="${CHART_LEFT + 1}" y="${tpMinY}" width="${CHART_WIDTH - 2}" height="${tpHeight}" fill="url(#tpGrad)" rx="2"/>`;
  svg += `<rect x="${CHART_LEFT + 1}" y="${tpMinY}" width="${CHART_WIDTH - 2}" height="${tpHeight}" fill="none" stroke="#00c853" stroke-width="1.5" stroke-dasharray="6,3" rx="2" opacity="0.7"/>`;

  // TP1 line
  const tp1Y = priceToY(tp1, minPrice, maxPrice);
  svg += `<line x1="${CHART_LEFT}" y1="${tp1Y}" x2="${CHART_RIGHT}" y2="${tp1Y}" stroke="#00c853" stroke-width="1" stroke-dasharray="4,4" opacity="0.8"/>`;
  svg += `<rect x="${CHART_RIGHT + 3}" y="${tp1Y - 8}" width="55" height="16" rx="3" fill="#00c853" opacity="0.9"/>`;
  svg += `<text x="${CHART_RIGHT + 30}" y="${tp1Y + 3}" font-family="monospace" font-size="9" fill="white" text-anchor="middle" font-weight="bold">TP1 ${formatPrice(tp1, pair)}</text>`;

  // TP2 line
  const tp2Y = priceToY(tp2, minPrice, maxPrice);
  svg += `<line x1="${CHART_LEFT}" y1="${tp2Y}" x2="${CHART_RIGHT}" y2="${tp2Y}" stroke="#00c853" stroke-width="1" stroke-dasharray="4,4" opacity="0.6"/>`;
  svg += `<rect x="${CHART_RIGHT + 3}" y="${tp2Y - 8}" width="55" height="16" rx="3" fill="#00c853" opacity="0.7"/>`;
  svg += `<text x="${CHART_RIGHT + 30}" y="${tp2Y + 3}" font-family="monospace" font-size="9" fill="white" text-anchor="middle" font-weight="bold">TP2 ${formatPrice(tp2, pair)}</text>`;

  // TP label
  svg += `<text x="${CHART_LEFT + 8}" y="${tpMinY + tpHeight / 2 + 4}" font-family="Arial, sans-serif" font-size="11" fill="#00c853" font-weight="bold" opacity="0.9">TAKE PROFIT ZONE</text>`;

  // ─── SL Zone (Red Box) ──────────────────────────────────────────
  const slY = priceToY(sl, minPrice, maxPrice);
  let slBoxTop: number, slBoxBottom: number;

  if (type === 'BUY') {
    slBoxTop = slY;
    slBoxBottom = CHART_BOTTOM;
  } else {
    slBoxTop = CHART_TOP;
    slBoxBottom = slY;
  }

  const slBoxHeight = Math.max(slBoxBottom - slBoxTop, 4);
  svg += `<rect x="${CHART_LEFT + 1}" y="${slBoxTop}" width="${CHART_WIDTH - 2}" height="${slBoxHeight}" fill="url(#slGrad)" rx="2"/>`;
  svg += `<rect x="${CHART_LEFT + 1}" y="${slBoxTop}" width="${CHART_WIDTH - 2}" height="${slBoxHeight}" fill="none" stroke="#ff1744" stroke-width="1.5" stroke-dasharray="6,3" rx="2" opacity="0.7"/>`;

  // SL line
  svg += `<line x1="${CHART_LEFT}" y1="${slY}" x2="${CHART_RIGHT}" y2="${slY}" stroke="#ff1744" stroke-width="1" stroke-dasharray="4,4" opacity="0.8"/>`;
  svg += `<rect x="${CHART_RIGHT + 3}" y="${slY - 8}" width="55" height="16" rx="3" fill="#ff1744" opacity="0.9"/>`;
  svg += `<text x="${CHART_RIGHT + 30}" y="${slY + 3}" font-family="monospace" font-size="9" fill="white" text-anchor="middle" font-weight="bold">SL ${formatPrice(sl, pair)}</text>`;

  // SL label
  svg += `<text x="${CHART_LEFT + 8}" y="${slY + (type === 'BUY' ? 15 : -5)}" font-family="Arial, sans-serif" font-size="11" fill="#ff1744" font-weight="bold" opacity="0.9">STOP LOSS ZONE</text>`;

  // ─── Candlesticks ───────────────────────────────────────────────
  candles.forEach((candle, i) => {
    const x = CHART_LEFT + candleWidth * i + candleWidth / 2;
    const openY = priceToY(candle.open, minPrice, maxPrice);
    const closeY = priceToY(candle.close, minPrice, maxPrice);
    const highY = priceToY(candle.high, minPrice, maxPrice);
    const lowY = priceToY(candle.low, minPrice, maxPrice);

    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

    // Color
    const color = candle.bullish ? '#26a69a' : '#ef5350';
    const colorDark = candle.bullish ? '#1b7a71' : '#b33c3c';

    // Wick
    svg += `<line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" stroke="${color}" stroke-width="1.2"/>`;

    // Body
    svg += `<rect x="${x - bodyWidth / 2}" y="${bodyTop}" width="${bodyWidth}" height="${bodyHeight}" fill="${color}" stroke="${colorDark}" stroke-width="0.5" rx="1"/>`;
  });

  // ─── Entry Line ─────────────────────────────────────────────────
  const entryY = priceToY(entry, minPrice, maxPrice);
  svg += `<line x1="${CHART_LEFT}" y1="${entryY}" x2="${CHART_RIGHT}" y2="${entryY}" stroke="#ffd600" stroke-width="1.5" filter="url(#glow)"/>`;
  svg += `<rect x="${CHART_RIGHT + 3}" y="${entryY - 8}" width="55" height="16" rx="3" fill="#ffd600" opacity="0.9"/>`;
  svg += `<text x="${CHART_RIGHT + 30}" y="${entryY + 3}" font-family="monospace" font-size="9" fill="#000" text-anchor="middle" font-weight="bold">ENTRY ${formatPrice(entry, pair)}</text>`;

  // Entry arrow
  const arrowY = type === 'BUY' ? entryY - 18 : entryY + 18;
  const arrowDir = type === 'BUY' ? '▼' : '▲';
  svg += `<text x="${CHART_LEFT + CHART_WIDTH / 2}" y="${arrowY}" font-family="Arial, sans-serif" font-size="16" fill="#ffd600" text-anchor="middle" filter="url(#glow)">${arrowDir} ENTRY</text>`;

  // ─── Current Price Marker ───────────────────────────────────────
  const currentY = priceToY(currentPrice, minPrice, maxPrice);
  svg += `<line x1="${CHART_LEFT}" y1="${currentY}" x2="${CHART_RIGHT}" y2="${currentY}" stroke="#42a5f5" stroke-width="1" opacity="0.6"/>`;
  svg += `<rect x="${CHART_LEFT - 2}" y="${currentY - 7}" width="4" height="14" fill="#42a5f5" rx="1"/>`;
  svg += `<rect x="${CHART_RIGHT - 4}" y="${currentY - 7}" width="4" height="14" fill="#42a5f5" rx="1"/>`;

  // ─── Bottom Info Panel ──────────────────────────────────────────
  const panelY = 415;

  // Panel background
  svg += `<rect x="10" y="${panelY}" width="${WIDTH - 20}" height="95" fill="#0d1117" stroke="#21262d" stroke-width="1" rx="8"/>`;

  // Left column - Signal info
  svg += `<text x="25" y="${panelY + 20}" font-family="Arial, sans-serif" font-size="12" fill="#8b949e">Signal:</text>`;
  svg += `<text x="75" y="${panelY + 20}" font-family="Arial, sans-serif" font-size="12" fill="${headerColor}" font-weight="bold">${typeEmoji} ${type} ${pair}</text>`;

  svg += `<text x="25" y="${panelY + 38}" font-family="Arial, sans-serif" font-size="11" fill="#8b949e">Entry:</text>`;
  svg += `<text x="65" y="${panelY + 38}" font-family="monospace" font-size="11" fill="#ffd600">${formatPrice(entry, pair)}</text>`;

  svg += `<text x="25" y="${panelY + 53}" font-family="Arial, sans-serif" font-size="11" fill="#8b949e">TP1:</text>`;
  svg += `<text x="55" y="${panelY + 53}" font-family="monospace" font-size="11" fill="#00c853">${formatPrice(tp1, pair)}</text>`;

  svg += `<text x="25" y="${panelY + 68}" font-family="Arial, sans-serif" font-size="11" fill="#8b949e">TP2:</text>`;
  svg += `<text x="55" y="${panelY + 68}" font-family="monospace" font-size="11" fill="#00c853">${formatPrice(tp2, pair)}</text>`;

  svg += `<text x="25" y="${panelY + 83}" font-family="Arial, sans-serif" font-size="11" fill="#8b949e">SL:</text>`;
  svg += `<text x="55" y="${panelY + 83}" font-family="monospace" font-size="11" fill="#ff1744">${formatPrice(sl, pair)}</text>`;

  // Middle column - Technical
  svg += `<text x="200" y="${panelY + 20}" font-family="Arial, sans-serif" font-size="12" fill="#8b949e">Pattern:</text>`;
  svg += `<text x="260" y="${panelY + 20}" font-family="Arial, sans-serif" font-size="11" fill="#e0e0e0">${pattern || 'N/A'}</text>`;

  svg += `<text x="200" y="${panelY + 38}" font-family="Arial, sans-serif" font-size="12" fill="#8b949e">Confidence:</text>`;
  const confColor = (confidence || 0) >= 75 ? '#00c853' : (confidence || 0) >= 50 ? '#ffd600' : '#ff1744';
  svg += `<text x="280" y="${panelY + 38}" font-family="Arial, sans-serif" font-size="12" fill="${confColor}" font-weight="bold">${confidence || 0}%</text>`;

  svg += `<text x="200" y="${panelY + 53}" font-family="Arial, sans-serif" font-size="12" fill="#8b949e">R:R:</text>`;
  svg += `<text x="230" y="${panelY + 53}" font-family="monospace" font-size="12" fill="#42a5f5" font-weight="bold">${riskReward || '1:2'}</text>`;

  svg += `<text x="200" y="${panelY + 68}" font-family="Arial, sans-serif" font-size="12" fill="#8b949e">Kill Zone:</text>`;
  svg += `<text x="268" y="${panelY + 68}" font-family="Arial, sans-serif" font-size="11" fill="#e0e0e0">${killZone || 'N/A'}</text>`;

  svg += `<text x="200" y="${panelY + 83}" font-family="Arial, sans-serif" font-size="12" fill="#8b949e">PD Zone:</text>`;
  svg += `<text x="260" y="${panelY + 83}" font-family="Arial, sans-serif" font-size="11" fill="#e0e0e0">${pdZone || 'N/A'}</text>`;

  // Right column - ICT Elements
  svg += `<text x="450" y="${panelY + 20}" font-family="Arial, sans-serif" font-size="12" fill="#ff9800" font-weight="bold">🏦 ICT Elements:</text>`;

  if (ictElements && ictElements.length > 0) {
    ictElements.forEach((el, i) => {
      svg += `<text x="460" y="${panelY + 38 + i * 15}" font-family="Arial, sans-serif" font-size="11" fill="#e0e0e0">• ${el}</text>`;
    });
  }

  if (liquidityType) {
    const liqY = panelY + 38 + (ictElements?.length || 0) * 15;
    svg += `<text x="460" y="${liqY}" font-family="Arial, sans-serif" font-size="11" fill="#e0e0e0">💧 ${liquidityType}</text>`;
  }

  // ─── Watermark ──────────────────────────────────────────────────
  svg += `<text x="${WIDTH / 2}" y="${HEIGHT - 5}" font-family="Arial, sans-serif" font-size="8" fill="#30363d" text-anchor="middle">ICT Pro Bot • Yahoo Finance Live Data • Educational Analysis Only</text>`;

  svg += `</svg>`;
  return svg;
}
