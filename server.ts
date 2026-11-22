import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { CRYPTO_ASSETS, generateCalibratedCandles } from './src/data/assets';
import type { Candle, CryptoAssetMeta, QuantAnalysisResult, ScannerRow, Timeframe } from './src/types/quant';
import { analyzeCandles } from './src/utils/quantEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const CACHE_TTL_MS = 30_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const candleCache = new Map<
  string,
  CacheEntry<{ candles: Candle[]; source: 'live' | 'calibrated'; sourceLabel: string }>
>();

function isValidTimeframe(tf: string): tf is Timeframe {
  return tf === '1h' || tf === '4h' || tf === '1d';
}

function findAsset(symbol: string): CryptoAssetMeta {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (
    CRYPTO_ASSETS.find((a) => a.symbol === normalized || a.base === normalized) ??
    CRYPTO_ASSETS[0]
  );
}

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinanceVisionCandles(
  symbol: string,
  timeframe: Timeframe,
  limit = 220
): Promise<Candle[] | null> {
  try {
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(
      symbol
    )}&interval=${encodeURIComponent(timeframe)}&limit=${limit}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const raw = (await res.json()) as unknown[];
    if (!Array.isArray(raw) || raw.length < 40) return null;

    return raw.map((row) => {
      const arr = row as (string | number)[];
      return {
        time: Number(arr[0]),
        open: Number(arr[1]),
        high: Number(arr[2]),
        low: Number(arr[3]),
        close: Number(arr[4]),
        volume: Number(arr[5]),
      };
    });
  } catch {
    return null;
  }
}

async function fetchCoinbaseCandles(
  base: string,
  timeframe: Timeframe
): Promise<Candle[] | null> {
  try {
    const granularity = timeframe === '1h' ? 3600 : timeframe === '4h' ? 14400 : 86400;
    // Coinbase does not support 14400 directly on all endpoints; map 4h -> 3600 and aggregate or use 3600/21600/86400
    const cbGranularity = timeframe === '1h' ? 3600 : timeframe === '4h' ? 21600 : 86400;
    const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(
      base
    )}-USD/candles?granularity=${cbGranularity}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const raw = (await res.json()) as number[][];
    if (!Array.isArray(raw) || raw.length < 40) return null;

    // Coinbase returns newest-first: [time_sec, low, high, open, close, volume]
    return raw
      .slice(0, 220)
      .reverse()
      .map((r) => ({
        time: Number(r[0]) * 1000,
        low: Number(r[1]),
        high: Number(r[2]),
        open: Number(r[3]),
        close: Number(r[4]),
        volume: Number(r[5]),
      }));
    void granularity;
  } catch {
    return null;
  }
}

async function getCandlesForSymbol(
  asset: CryptoAssetMeta,
  timeframe: Timeframe
): Promise<{ candles: Candle[]; source: 'live' | 'calibrated'; sourceLabel: string }> {
  const key = `${asset.symbol}:${timeframe}`;
  const cached = candleCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let result: { candles: Candle[]; source: 'live' | 'calibrated'; sourceLabel: string } | null =
    null;

  const binanceCandles = await fetchBinanceVisionCandles(asset.symbol, timeframe, 220);
  if (binanceCandles) {
    result = {
      candles: binanceCandles,
      source: 'live',
      sourceLabel: 'Dados em Tempo Real · Binance Market Data',
    };
  } else {
    const coinbaseCandles = await fetchCoinbaseCandles(asset.base, timeframe);
    if (coinbaseCandles) {
      result = {
        candles: coinbaseCandles,
        source: 'live',
        sourceLabel: 'Dados em Tempo Real · Coinbase Exchange',
      };
    }
  }

  if (!result) {
    result = {
      candles: generateCalibratedCandles(asset.symbol, timeframe, 220),
      source: 'calibrated',
      sourceLabel: 'Série Histórica Calibrada (Modo Offline)',
    };
  }

  candleCache.set(key, {
    data: result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/market/assets', (_req, res) => {
    res.json({ assets: CRYPTO_ASSETS });
  });

  app.get('/api/market/analysis', async (req, res) => {
    try {
      const symbolParam = typeof req.query.symbol === 'string' ? req.query.symbol : 'BTCUSDT';
      const tfParam = typeof req.query.timeframe === 'string' ? req.query.timeframe : '4h';
      const timeframe: Timeframe = isValidTimeframe(tfParam) ? tfParam : '4h';
      const asset = findAsset(symbolParam);

      const { candles, source, sourceLabel } = await getCandlesForSymbol(asset, timeframe);
      const analysis: QuantAnalysisResult = analyzeCandles(
        asset,
        candles,
        timeframe,
        source,
        sourceLabel
      );

      res.json(analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar análise.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/market/scanner', async (req, res) => {
    try {
      const tfParam = typeof req.query.timeframe === 'string' ? req.query.timeframe : '4h';
      const timeframe: Timeframe = isValidTimeframe(tfParam) ? tfParam : '4h';

      const rows: ScannerRow[] = await Promise.all(
        CRYPTO_ASSETS.map(async (asset) => {
          const { candles, source, sourceLabel } = await getCandlesForSymbol(asset, timeframe);
          const analysis = analyzeCandles(asset, candles, timeframe, source, sourceLabel);
          return {
            asset,
            currentPrice: analysis.currentPrice,
            change24hPct: analysis.change24hPct,
            regime: analysis.regime,
            bias: analysis.bias,
            confluenceScore: analysis.confluenceScore,
            zScore: analysis.zScore,
            rsi14: analysis.rsi14,
            rvol: analysis.rvol,
            atrPercent: analysis.levels.atrPercent,
            winRatePct: analysis.backtest.winRatePct,
            source: analysis.source,
          };
        })
      );

      res.json({ timeframe, updatedAt: Date.now(), rows });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao executar scanner.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Simons Quant server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
