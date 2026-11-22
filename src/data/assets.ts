import type { Candle, CryptoAssetMeta, Timeframe } from '../types/quant';

export const CRYPTO_ASSETS: CryptoAssetMeta[] = [
  { symbol: 'BTCUSDT', pair: 'BTC/USDT', name: 'Bitcoin', base: 'BTC' },
  { symbol: 'ETHUSDT', pair: 'ETH/USDT', name: 'Ethereum', base: 'ETH' },
  { symbol: 'SOLUSDT', pair: 'SOL/USDT', name: 'Solana', base: 'SOL' },
  { symbol: 'BNBUSDT', pair: 'BNB/USDT', name: 'BNB', base: 'BNB' },
  { symbol: 'XRPUSDT', pair: 'XRP/USDT', name: 'XRP', base: 'XRP' },
  { symbol: 'AVAXUSDT', pair: 'AVAX/USDT', name: 'Avalanche', base: 'AVAX' },
  { symbol: 'LINKUSDT', pair: 'LINK/USDT', name: 'Chainlink', base: 'LINK' },
  { symbol: 'DOGEUSDT', pair: 'DOGE/USDT', name: 'Dogecoin', base: 'DOGE' },
];

const BASE_PRICES: Record<string, { price: number; vol: number; drift: number }> = {
  BTCUSDT: { price: 91450, vol: 0.016, drift: 0.0008 },
  ETHUSDT: { price: 3280, vol: 0.021, drift: 0.0006 },
  SOLUSDT: { price: 214.5, vol: 0.032, drift: 0.0011 },
  BNBUSDT: { price: 642.0, vol: 0.019, drift: 0.0005 },
  XRPUSDT: { price: 1.42, vol: 0.034, drift: 0.0009 },
  AVAXUSDT: { price: 38.4, vol: 0.031, drift: 0.0004 },
  LINKUSDT: { price: 16.85, vol: 0.027, drift: 0.0007 },
  DOGEUSDT: { price: 0.365, vol: 0.038, drift: 0.0005 },
};

function createSeededRng(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function timeframeToMs(tf: Timeframe): number {
  if (tf === '1h') return 3600 * 1000;
  if (tf === '4h') return 4 * 3600 * 1000;
  return 24 * 3600 * 1000;
}

export function generateCalibratedCandles(
  symbol: string,
  timeframe: Timeframe,
  count = 220,
  anchorEndMs = 1763820000000
): Candle[] {
  const cfg = BASE_PRICES[symbol] ?? { price: 100, vol: 0.025, drift: 0.0005 };
  const rng = createSeededRng(`${symbol}-${timeframe}`);
  const stepMs = timeframeToMs(timeframe);
  const tfVolScale = timeframe === '1h' ? 0.55 : timeframe === '4h' ? 1.0 : 1.75;
  const vol = cfg.vol * tfVolScale;

  // Generate mean-reverting + cyclic regime path so Z-Score and trends behave realistically
  const closes: number[] = [];
  let price = cfg.price * 0.86;
  for (let i = 0; i < count; i++) {
    const cycle = Math.sin(i / 14) * 0.006 + Math.cos(i / 31) * 0.004;
    const shock = (rng() - 0.5) * 2 * vol;
    const meanPull = ((cfg.price * (1 + i * 0.0005)) - price) / price * 0.06;
    const ret = cfg.drift + cycle + shock + meanPull;
    price = Math.max(price * (1 + ret), cfg.price * 0.25);
    closes.push(price);
  }

  // Scale final close close to reference price
  const scale = cfg.price / closes[closes.length - 1];
  const candles: Candle[] = [];
  let prevClose = closes[0] * scale;

  for (let i = 0; i < count; i++) {
    const close = closes[i] * scale;
    const open = i === 0 ? close * (1 + (rng() - 0.5) * vol * 0.4) : prevClose;
    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const wickUp = bodyMax * (0.002 + rng() * vol * 0.45);
    const wickDown = bodyMin * (0.002 + rng() * vol * 0.45);
    const high = bodyMax + wickUp;
    const low = Math.max(bodyMin - wickDown, bodyMin * 0.85);
    const baseVolume = (cfg.price > 1000 ? 1800 : 140000) * (0.65 + rng() * 1.1 + Math.abs(close - open) / open * 18);

    candles.push({
      time: anchorEndMs - (count - 1 - i) * stepMs,
      open: Number(open.toPrecision(6)),
      high: Number(high.toPrecision(6)),
      low: Number(low.toPrecision(6)),
      close: Number(close.toPrecision(6)),
      volume: Number(baseVolume.toFixed(2)),
    });
    prevClose = close;
  }

  return candles;
}
