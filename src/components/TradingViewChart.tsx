'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────
interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  pair: string;
  timeframe: string;
  currentPrice: number;
  high: number;
  low: number;
  type: 'BUY' | 'SELL';
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  confidence: number;
  riskReward: string;
  pattern: string;
  killZone: string;
  liquidityType: string;
  pdZone: string;
  ictElements: string[];
  changePercent: number;
  candles?: OHLCVCandle[];
}

// ─── Constants ──────────────────────────────────────────────────────
const TV_BG = '#131722';
const TV_PANEL = '#1e222d';
const TV_GRID = '#1e222d';
const TV_TEXT = '#787b86';
const TV_TEXT_LIGHT = '#d1d4dc';
const TV_GREEN = '#26a69a';
const TV_RED = '#ef5350';
const TV_TP_GREEN = '#00c853';
const TV_SL_RED = '#ff1744';
const TV_ENTRY = '#ff9800';
const TV_BLUE = '#2962ff';
const TV_MA1 = '#2196f3';
const TV_MA2 = '#ff9800';
const TV_VOLUME_GREEN = 'rgba(38,166,154,0.4)';
const TV_VOLUME_RED = 'rgba(239,83,80,0.4)';

function formatPrice(price: number, pair: string): string {
  if (pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS')) {
    return price.toFixed(2);
  }
  return price.toFixed(5);
}

function formatCompactPrice(price: number, pair: string): string {
  if (pair.includes('JPY') || pair === 'XAU/USD' || pair.startsWith('US') || pair.startsWith('NAS')) {
    return price.toFixed(2);
  }
  return price.toFixed(4);
}

// Generate realistic candlestick data as fallback
function generateCandles(config: ChartData, count: number = 45) {
  const { currentPrice, high, low, type } = config;
  const candles: OHLCVCandle[] = [];

  const range = high - low;
  let price = currentPrice - (type === 'BUY' ? 1 : -1) * range * 0.2;

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    const trendBias = type === 'BUY' ? 0.25 : -0.25;
    const noise = (Math.random() - 0.5) * range * 0.06;
    const momentum = Math.sin(progress * Math.PI) * trendBias * range * 0.01;
    const change = noise + momentum + trendBias * range * 0.015;

    const open = price;
    const close = price + change;
    const wickUp = Math.abs(change) * (0.3 + Math.random() * 1.2);
    const wickDown = Math.abs(change) * (0.3 + Math.random() * 1.2);
    const candleHigh = Math.max(open, close) + wickUp;
    const candleLow = Math.min(open, close) - wickDown;

    candles.push({
      timestamp: Date.now() - (count - i) * 14400000,
      open: parseFloat(open.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      high: parseFloat(Math.min(candleHigh, high * 1.01).toFixed(5)),
      low: parseFloat(Math.max(candleLow, low * 0.99).toFixed(5)),
      volume: Math.round(50 + Math.random() * 150 + Math.abs(change) / range * 200),
    });

    price = close;
  }

  // Ensure last candle is near current price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    const diff = currentPrice - last.close;
    last.close = currentPrice;
    last.open = currentPrice - diff;
    last.high = Math.max(last.high, currentPrice + Math.abs(diff) * 0.5);
    last.low = Math.min(last.low, currentPrice - Math.abs(diff) * 0.5);
  }

  return candles;
}

// Format timestamp for time axis based on timeframe
function formatTimestamp(ts: number, timeframe: string): string {
  const date = new Date(ts);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  if (timeframe === 'D1') {
    return `${month}/${day}`;
  }
  return `${h}:${m}`;
}

// ─── Main Component ─────────────────────────────────────────────────
export default function TradingViewChart({ data }: { data: ChartData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });

  // Responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = Math.max(440, Math.min(560, w * 0.65));
        setDimensions({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    drawChart(ctx, data, dimensions.width, dimensions.height);
  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}

// ─── Chart Drawing ──────────────────────────────────────────────────
function drawChart(
  ctx: CanvasRenderingContext2D,
  config: ChartData,
  W: number,
  H: number
) {
  // Use real candles if available, otherwise generate
  const candles = config.candles && config.candles.length > 5
    ? config.candles
    : generateCandles(config);

  // Layout
  const TOOLBAR_H = 36;
  const PRICE_SCALE_W = 72;
  const TIME_SCALE_H = 24;
  const VOLUME_H = 50;
  const CHART_LEFT = 6;
  const CHART_RIGHT = W - PRICE_SCALE_W;
  const CHART_TOP = TOOLBAR_H + 4;
  const CHART_BOTTOM = H - TIME_SCALE_H - VOLUME_H;
  const CHART_W = CHART_RIGHT - CHART_LEFT;
  const CHART_H = CHART_BOTTOM - CHART_TOP;
  const VOLUME_TOP = CHART_BOTTOM + 4;
  const VOLUME_BOTTOM = H - TIME_SCALE_H;

  // Calculate price range including TP/SL
  const allPrices = [
    config.high, config.low, config.entry, config.tp1, config.tp2, config.sl,
    ...candles.map(c => [c.high, c.low]).flat(),
  ];
  let minPrice = Math.min(...allPrices) * 0.9995;
  let maxPrice = Math.max(...allPrices) * 1.0005;
  if (maxPrice - minPrice < config.currentPrice * 0.001) {
    minPrice = config.currentPrice * 0.995;
    maxPrice = config.currentPrice * 1.005;
  }

  const maxVolume = Math.max(...candles.map(c => c.volume));

  function priceToY(price: number): number {
    return CHART_TOP + (1 - (price - minPrice) / (maxPrice - minPrice)) * CHART_H;
  }

  function yToPrice(y: number): number {
    return minPrice + (1 - (y - CHART_TOP) / CHART_H) * (maxPrice - minPrice);
  }

  // ─── Background ───────────────────────────────────────────────────
  ctx.fillStyle = TV_BG;
  ctx.fillRect(0, 0, W, H);

  // ─── Toolbar ──────────────────────────────────────────────────────
  ctx.fillStyle = TV_PANEL;
  ctx.fillRect(0, 0, W, TOOLBAR_H);

  // Pair name
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT_LIGHT;
  ctx.textBaseline = 'middle';
  ctx.fillText(config.pair, 12, TOOLBAR_H / 2);

  // Timeframe
  ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  const pairWidth = ctx.measureText(config.pair).width;
  ctx.fillText(config.timeframe, 14 + pairWidth + 10, TOOLBAR_H / 2);

  // BUY/SELL badge
  const badgeColor = config.type === 'BUY' ? TV_TP_GREEN : TV_SL_RED;
  const badgeText = config.type === 'BUY' ? 'BUY' : 'SELL';
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const badgeW = ctx.measureText(badgeText).width + 14;
  const badgeX = 14 + pairWidth + 36;
  ctx.fillStyle = badgeColor;
  roundRect(ctx, badgeX, 8, badgeW, 20, 3);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(badgeText, badgeX + 7, TOOLBAR_H / 2 + 1);

  // Current price
  const priceStr = formatPrice(config.currentPrice, config.pair);
  ctx.font = 'bold 13px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = TV_TEXT_LIGHT;
  ctx.textAlign = 'right';
  ctx.fillText(priceStr, W - PRICE_SCALE_W - 12, TOOLBAR_H / 2);

  // Change %
  const changeStr = `${config.changePercent >= 0 ? '+' : ''}${config.changePercent.toFixed(2)}%`;
  ctx.font = '12px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = config.changePercent >= 0 ? TV_GREEN : TV_RED;
  ctx.fillText(changeStr, W - 12, TOOLBAR_H / 2);
  ctx.textAlign = 'left';

  // ─── Grid Lines ──────────────────────────────────────────────────
  const gridCount = 6;
  ctx.strokeStyle = TV_GRID;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < gridCount; i++) {
    const y = CHART_TOP + (CHART_H / gridCount) * i;
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.moveTo(CHART_LEFT, y);
    ctx.lineTo(CHART_RIGHT, y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Vertical grid lines (time)
  const candleCount = candles.length;
  const candleStep = Math.ceil(candleCount / 8);
  for (let i = candleStep; i < candleCount; i += candleStep) {
    const x = CHART_LEFT + (CHART_W / candleCount) * (i + 0.5);
    ctx.beginPath();
    ctx.setLineDash([2, 3]);
    ctx.moveTo(x, CHART_TOP);
    ctx.lineTo(x, CHART_BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ─── TP Zone (GREEN BOX) ─────────────────────────────────────────
  const tpMinY = priceToY(Math.max(config.tp1, config.tp2));
  const tpMaxY = priceToY(Math.min(config.tp1, config.tp2));
  const tpHeight = Math.max(tpMaxY - tpMinY, 4);

  // Filled zone
  ctx.fillStyle = 'rgba(0,200,83,0.10)';
  ctx.fillRect(CHART_LEFT, tpMinY, CHART_W, tpHeight);

  // Border
  ctx.strokeStyle = TV_TP_GREEN;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(CHART_LEFT + 0.5, tpMinY, CHART_W - 1, tpHeight);
  ctx.setLineDash([]);

  // TP1 horizontal line
  const tp1Y = priceToY(config.tp1);
  ctx.strokeStyle = TV_TP_GREEN;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(CHART_LEFT, tp1Y);
  ctx.lineTo(CHART_RIGHT, tp1Y);
  ctx.stroke();
  ctx.setLineDash([]);

  // TP1 label on right
  ctx.fillStyle = TV_TP_GREEN;
  roundRect(ctx, CHART_RIGHT + 2, tp1Y - 9, PRICE_SCALE_W - 4, 18, 3);
  ctx.fill();
  ctx.font = 'bold 9px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('TP1 ' + formatCompactPrice(config.tp1, config.pair), CHART_RIGHT + PRICE_SCALE_W / 2, tp1Y + 3);
  ctx.textAlign = 'left';

  // TP2 horizontal line
  const tp2Y = priceToY(config.tp2);
  ctx.strokeStyle = TV_TP_GREEN;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(CHART_LEFT, tp2Y);
  ctx.lineTo(CHART_RIGHT, tp2Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // TP2 label
  ctx.fillStyle = 'rgba(0,200,83,0.8)';
  roundRect(ctx, CHART_RIGHT + 2, tp2Y - 9, PRICE_SCALE_W - 4, 18, 3);
  ctx.fill();
  ctx.font = 'bold 9px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('TP2 ' + formatCompactPrice(config.tp2, config.pair), CHART_RIGHT + PRICE_SCALE_W / 2, tp2Y + 3);
  ctx.textAlign = 'left';

  // TAKE PROFIT ZONE label
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TP_GREEN;
  ctx.globalAlpha = 0.85;
  ctx.fillText('TAKE PROFIT ZONE', CHART_LEFT + 8, tpMinY + tpHeight / 2 + 4);
  ctx.globalAlpha = 1;

  // ─── SL Zone (RED BOX) ───────────────────────────────────────────
  const slY = priceToY(config.sl);
  let slBoxTop: number, slBoxBottom: number;

  if (config.type === 'BUY') {
    slBoxTop = slY;
    slBoxBottom = CHART_BOTTOM;
  } else {
    slBoxTop = CHART_TOP;
    slBoxBottom = slY;
  }

  const slBoxHeight = Math.max(slBoxBottom - slBoxTop, 4);

  // Filled zone
  ctx.fillStyle = 'rgba(255,23,68,0.08)';
  ctx.fillRect(CHART_LEFT, slBoxTop, CHART_W, slBoxHeight);

  // Border
  ctx.strokeStyle = TV_SL_RED;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(CHART_LEFT + 0.5, slBoxTop, CHART_W - 1, slBoxHeight);
  ctx.setLineDash([]);

  // SL line
  ctx.strokeStyle = TV_SL_RED;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(CHART_LEFT, slY);
  ctx.lineTo(CHART_RIGHT, slY);
  ctx.stroke();
  ctx.setLineDash([]);

  // SL label
  ctx.fillStyle = TV_SL_RED;
  roundRect(ctx, CHART_RIGHT + 2, slY - 9, PRICE_SCALE_W - 4, 18, 3);
  ctx.fill();
  ctx.font = 'bold 9px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('SL ' + formatCompactPrice(config.sl, config.pair), CHART_RIGHT + PRICE_SCALE_W / 2, slY + 3);
  ctx.textAlign = 'left';

  // STOP LOSS ZONE label
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_SL_RED;
  ctx.globalAlpha = 0.85;
  ctx.fillText('STOP LOSS ZONE', CHART_LEFT + 8, slY + (config.type === 'BUY' ? 16 : -6));
  ctx.globalAlpha = 1;

  // ─── Candlesticks ────────────────────────────────────────────────
  const candleWidth = CHART_W / candleCount;
  const bodyWidth = Math.max(candleWidth * 0.65, 2);

  candles.forEach((candle, i) => {
    const x = CHART_LEFT + candleWidth * i + candleWidth / 2;
    const openYp = priceToY(candle.open);
    const closeYp = priceToY(candle.close);
    const highYp = priceToY(candle.high);
    const lowYp = priceToY(candle.low);

    const bodyTop = Math.min(openYp, closeYp);
    const bodyHeight = Math.max(Math.abs(closeYp - openYp), 1);
    const bullish = candle.close >= candle.open;
    const color = bullish ? TV_GREEN : TV_RED;

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, highYp);
    ctx.lineTo(x, lowYp);
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

    // Body border
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

    // Volume bar
    const volH = (candle.volume / maxVolume) * VOLUME_H * 0.85;
    const volY = VOLUME_BOTTOM - volH;
    ctx.fillStyle = bullish ? TV_VOLUME_GREEN : TV_VOLUME_RED;
    ctx.fillRect(x - bodyWidth / 2, volY, bodyWidth, volH);
  });

  // ─── Moving Averages ─────────────────────────────────────────────
  // SMA 20
  const sma20 = calculateSMA(candles, 20);
  if (sma20.length > 1) {
    ctx.strokeStyle = TV_MA1;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let started = false;
    sma20.forEach((val, i) => {
      if (val === null) return;
      const x = CHART_LEFT + candleWidth * (i + 19 - 0.5) + candleWidth / 2;
      const y = priceToY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  // SMA 50
  const sma50 = calculateSMA(candles, 50);
  if (sma50.length > 1) {
    ctx.strokeStyle = TV_MA2;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let started = false;
    sma50.forEach((val, i) => {
      if (val === null) return;
      const x = CHART_LEFT + candleWidth * (i + 49 - 0.5) + candleWidth / 2;
      const y = priceToY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  // ─── Entry Line ──────────────────────────────────────────────────
  const entryY = priceToY(config.entry);
  ctx.strokeStyle = TV_ENTRY;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(CHART_LEFT, entryY);
  ctx.lineTo(CHART_RIGHT, entryY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Entry label
  ctx.fillStyle = TV_ENTRY;
  roundRect(ctx, CHART_RIGHT + 2, entryY - 9, PRICE_SCALE_W - 4, 18, 3);
  ctx.fill();
  ctx.font = 'bold 9px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText('ENTRY ' + formatCompactPrice(config.entry, config.pair), CHART_RIGHT + PRICE_SCALE_W / 2, entryY + 3);
  ctx.textAlign = 'left';

  // Entry arrow
  const midChartX = CHART_LEFT + CHART_W / 2;
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_ENTRY;
  ctx.textAlign = 'center';
  if (config.type === 'BUY') {
    ctx.fillText('\u25BC ENTRY', midChartX, entryY - 10);
  } else {
    ctx.fillText('\u25B2 ENTRY', midChartX, entryY + 16);
  }
  ctx.textAlign = 'left';

  // ─── Current Price Line ──────────────────────────────────────────
  const currentY = priceToY(config.currentPrice);
  ctx.strokeStyle = TV_BLUE;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(CHART_LEFT, currentY);
  ctx.lineTo(CHART_RIGHT, currentY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Current price tag (right side, TradingView style)
  ctx.fillStyle = TV_BLUE;
  roundRect(ctx, CHART_RIGHT + 2, currentY - 9, PRICE_SCALE_W - 4, 18, 3);
  ctx.fill();
  ctx.font = 'bold 9px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(formatCompactPrice(config.currentPrice, config.pair), CHART_RIGHT + PRICE_SCALE_W / 2, currentY + 3);
  ctx.textAlign = 'left';

  // Left price marker
  ctx.fillStyle = TV_BLUE;
  ctx.fillRect(CHART_LEFT, currentY - 4, 5, 8);

  // ─── Price Scale ─────────────────────────────────────────────────
  ctx.font = '10px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = TV_TEXT;
  ctx.textAlign = 'right';
  for (let i = 0; i <= gridCount; i++) {
    const y = CHART_TOP + (CHART_H / gridCount) * i;
    const price = yToPrice(y);
    ctx.fillText(formatCompactPrice(price, config.pair), CHART_RIGHT - 4, y + 3);
  }
  ctx.textAlign = 'left';

  // ─── Time Scale (using real timestamps) ──────────────────────────
  ctx.font = '9px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillStyle = TV_TEXT;
  ctx.textAlign = 'center';
  const timeStep = Math.max(1, Math.ceil(candleCount / 8));
  for (let i = 0; i < candleCount; i += timeStep) {
    const x = CHART_LEFT + candleWidth * (i + 0.5);
    const label = formatTimestamp(candles[i].timestamp, config.timeframe);
    ctx.fillText(label, x, H - 6);
  }
  ctx.textAlign = 'left';

  // ─── MA Legend ───────────────────────────────────────────────────
  const legendX = 14 + pairWidth + badgeW + 30;
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  // SMA20
  ctx.fillStyle = TV_MA1;
  ctx.fillText('SMA(20)', legendX, TOOLBAR_H / 2);
  // SMA50
  const sma20W = ctx.measureText('SMA(20)').width;
  ctx.fillStyle = TV_MA2;
  ctx.fillText('SMA(50)', legendX + sma20W + 12, TOOLBAR_H / 2);

  // Volume label
  ctx.fillStyle = TV_TEXT;
  ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Vol', CHART_LEFT + 4, VOLUME_TOP + 10);

  // ─── Bottom Info Panel ───────────────────────────────────────────
  const panelH = 78;
  const panelY = H - panelH;

  // Panel background
  ctx.fillStyle = TV_PANEL;
  ctx.fillRect(0, panelY, W, panelH);

  // Separator line
  ctx.strokeStyle = '#2a2e39';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, panelY);
  ctx.lineTo(W, panelY);
  ctx.stroke();

  // Signal info
  const col1X = 14;
  const col2X = Math.min(200, W * 0.28);
  const col3X = Math.min(380, W * 0.52);

  ctx.textBaseline = 'top';

  // Column 1: Signal
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  ctx.fillText('Signal:', col1X, panelY + 8);
  ctx.fillStyle = config.type === 'BUY' ? TV_TP_GREEN : TV_SL_RED;
  ctx.fillText((config.type === 'BUY' ? '\u2191 BUY' : '\u2193 SELL') + ' ' + config.pair, col1X + 44, panelY + 8);

  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  ctx.fillText('Entry:', col1X, panelY + 26);
  ctx.fillStyle = TV_ENTRY;
  ctx.font = '10px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillText(formatPrice(config.entry, config.pair), col1X + 36, panelY + 26);

  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  ctx.fillText('TP1:', col1X, panelY + 42);
  ctx.fillStyle = TV_TP_GREEN;
  ctx.font = '10px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillText(formatPrice(config.tp1, config.pair), col1X + 28, panelY + 42);

  ctx.fillStyle = TV_TEXT;
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('TP2:', col1X, panelY + 56);
  ctx.fillStyle = TV_TP_GREEN;
  ctx.font = '10px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillText(formatPrice(config.tp2, config.pair), col1X + 28, panelY + 56);

  // Column 2: Technical
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  ctx.fillText('SL:', col1X, panelY + 70);
  ctx.fillStyle = TV_SL_RED;
  ctx.font = '10px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillText(formatPrice(config.sl, config.pair), col1X + 22, panelY + 70);

  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  ctx.fillText('Pattern:', col2X, panelY + 8);
  ctx.fillStyle = TV_TEXT_LIGHT;
  ctx.fillText(config.pattern || 'N/A', col2X + 52, panelY + 8);

  ctx.fillStyle = TV_TEXT;
  ctx.fillText('Confidence:', col2X, panelY + 26);
  const confColor = config.confidence >= 75 ? TV_TP_GREEN : config.confidence >= 50 ? TV_ENTRY : TV_SL_RED;
  ctx.fillStyle = confColor;
  ctx.fillText(config.confidence + '%', col2X + 68, panelY + 26);

  ctx.fillStyle = TV_TEXT;
  ctx.fillText('R:R:', col2X, panelY + 42);
  ctx.fillStyle = TV_BLUE;
  ctx.font = '10px "Roboto Mono", "SF Mono", "Consolas", monospace';
  ctx.fillText(config.riskReward || '1:2', col2X + 28, panelY + 42);

  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT;
  ctx.fillText('Kill Zone:', col2X, panelY + 56);
  ctx.fillStyle = TV_TEXT_LIGHT;
  ctx.fillText(config.killZone || 'N/A', col2X + 56, panelY + 56);

  ctx.fillStyle = TV_TEXT;
  ctx.fillText('PD Zone:', col2X, panelY + 70);
  ctx.fillStyle = TV_TEXT_LIGHT;
  ctx.fillText(config.pdZone || 'N/A', col2X + 54, panelY + 70);

  // Column 3: ICT Elements
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#ff9800';
  ctx.fillText('ICT Elements:', col3X, panelY + 8);

  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = TV_TEXT_LIGHT;
  const ictElements = config.ictElements || [];
  ictElements.slice(0, 3).forEach((el, i) => {
    ctx.fillText('\u2022 ' + el, col3X + 8, panelY + 24 + i * 14);
  });

  if (config.liquidityType) {
    ctx.fillStyle = '#e91e63';
    ctx.fillText('\u2022 ' + config.liquidityType, col3X + 8, panelY + 24 + Math.min(ictElements.length, 3) * 14);
  }

  ctx.textBaseline = 'alphabetic';

  // ─── Watermark ───────────────────────────────────────────────────
  ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#2a2e39';
  ctx.textAlign = 'center';
  const dataSource = config.candles && config.candles.length > 5 ? 'Yahoo Finance Live Data' : 'Simulated Data';
  ctx.fillText(`TradingView \u2022 ICT Pro Bot \u2022 ${dataSource}`, W / 2, panelY - 4);
  ctx.textAlign = 'left';

  // ─── Chart Border ────────────────────────────────────────────────
  ctx.strokeStyle = '#2a2e39';
  ctx.lineWidth = 1;
  ctx.strokeRect(CHART_LEFT, CHART_TOP, CHART_W, CHART_H);
}

// ─── Helpers ────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function calculateSMA(
  candles: Array<{ close: number }>,
  period: number
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    result.push(sum / period);
  }
  return result;
}
