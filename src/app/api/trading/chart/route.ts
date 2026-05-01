import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { generateChartSVG, ChartConfig } from '@/lib/chart-generator';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const pair = searchParams.get('pair') || 'XAU/USD';
    const timeframe = searchParams.get('tf') || 'H4';
    const currentPrice = parseFloat(searchParams.get('price') || '0');
    const high = parseFloat(searchParams.get('high') || '0');
    const low = parseFloat(searchParams.get('low') || '0');
    const change = parseFloat(searchParams.get('change') || '0');
    const changePercent = parseFloat(searchParams.get('changePct') || '0');
    const type = (searchParams.get('type') || 'BUY') as 'BUY' | 'SELL';
    const entry = parseFloat(searchParams.get('entry') || '0');
    const tp1 = parseFloat(searchParams.get('tp1') || '0');
    const tp2 = parseFloat(searchParams.get('tp2') || '0');
    const sl = parseFloat(searchParams.get('sl') || '0');
    const confidence = parseInt(searchParams.get('conf') || '65');
    const riskReward = searchParams.get('rr') || '1:2';
    const pattern = searchParams.get('pattern') || '';
    const killZone = searchParams.get('kz') || '';
    const liquidityType = searchParams.get('liq') || '';
    const pdZone = searchParams.get('pd') || '';
    const ictElementsStr = searchParams.get('ict') || '';

    if (!currentPrice || !entry) {
      return NextResponse.json({ error: 'Missing required params: price, entry' }, { status: 400 });
    }

    const ictElements = ictElementsStr ? ictElementsStr.split(',').filter(Boolean) : [];

    const config: ChartConfig = {
      pair,
      timeframe,
      currentPrice,
      high: high || currentPrice * 1.008,
      low: low || currentPrice * 0.992,
      change,
      changePercent,
      type,
      entry,
      tp1,
      tp2,
      sl,
      ictElements,
      killZone,
      liquidityType,
      pdZone,
      pattern,
      confidence,
      riskReward,
    };

    const svg = generateChartSVG(config);

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (error) {
    console.error('Chart generation error:', error);
    return NextResponse.json({ error: 'Failed to generate chart' }, { status: 500 });
  }
}
