import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYPTO_ASSETS, generateCalibratedCandles } from '../data/assets';
import {
  analyzeCandles,
  calculateKellySizing,
  classifyRegime,
  computeEMA,
  computeRSISeries,
  computeZScoreSeries,
} from './quantEngine';

test('computeEMA produces exact SMA seed and exponential progression', () => {
  const ema = computeEMA([10, 12, 14, 16, 18], 3);
  assert.equal(ema[0], null);
  assert.equal(ema[1], null);
  assert.equal(ema[2], 12); // (10+12+14)/3
  assert.equal(ema[3], 14); // 16*0.5 + 12*0.5
  assert.equal(ema[4], 16); // 18*0.5 + 14*0.5
});

test('computeZScoreSeries flags positive and negative deviations accurately', () => {
  const flatPlusSpike = new Array(19).fill(100).concat([120]);
  const z = computeZScoreSeries(flatPlusSpike, 20);
  assert.equal(z[18], null);
  assert.ok((z[19] as number) > 4, 'Spike above flat mean yields high positive Z-score');

  const constantSeries = new Array(25).fill(50);
  const zConst = computeZScoreSeries(constantSeries, 20);
  assert.equal(zConst[24], 0);
});

test('computeRSISeries stays bounded between 0 and 100', () => {
  const uptrend = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
  const rsiUp = computeRSISeries(uptrend, 14);
  assert.equal(rsiUp[29], 100);

  const downtrend = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
  const rsiDown = computeRSISeries(downtrend, 14);
  assert.equal(rsiDown[29], 0);
});

test('classifyRegime distinguishes trend, mean reversion, and high volatility', () => {
  assert.equal(
    classifyRegime({
      price: 110,
      ema20: 105,
      ema50: 100,
      ema20Prev: 103,
      atrPercent: 2.0,
      medianAtrPercent: 2.0,
    }),
    'Tendência de Alta'
  );

  assert.equal(
    classifyRegime({
      price: 90,
      ema20: 95,
      ema50: 100,
      ema20Prev: 97,
      atrPercent: 2.0,
      medianAtrPercent: 2.0,
    }),
    'Tendência de Baixa'
  );

  assert.equal(
    classifyRegime({
      price: 110,
      ema20: 105,
      ema50: 100,
      ema20Prev: 103,
      atrPercent: 5.0,
      medianAtrPercent: 2.0,
    }),
    'Alta Volatilidade'
  );
});

test('analyzeCandles returns complete quantitative analysis and backtest metrics', () => {
  const btc = CRYPTO_ASSETS[0];
  const candles = generateCalibratedCandles(btc.symbol, '4h', 220);
  const analysis = analyzeCandles(btc, candles, '4h', 'calibrated', 'Calibrado');

  assert.equal(analysis.asset.symbol, 'BTCUSDT');
  assert.equal(analysis.candles.length, 220);
  assert.equal(analysis.factors.length, 5);
  assert.ok(analysis.confluenceScore >= -100 && analysis.confluenceScore <= 100);
  assert.ok(analysis.rsi14 >= 0 && analysis.rsi14 <= 100);
  assert.ok(analysis.levels.atr > 0);
  assert.ok(analysis.backtest.equityCurve.length > 100);
});

test('calculateKellySizing computes positive allocation for positive expectancy and caps position', () => {
  const sizing = calculateKellySizing({
    capitalUsd: 10000,
    riskPerTradePct: 1.5,
    winRatePct: 55,
    rewardToRisk: 2.0,
    entryPrice: 50000,
    stopPrice: 48500, // 3% stop
  });

  // Kelly = (2*0.55 - 0.45)/2 = 32.5%, Half-Kelly = 16.25%
  assert.equal(sizing.fullKellyPct, 32.5);
  assert.equal(sizing.halfKellyPct, 16.25);
  assert.ok(sizing.positionValueUsd > 0 && sizing.positionValueUsd <= 10000);
  assert.ok(sizing.expectancyPerDollar > 0);
  assert.equal(sizing.stopDistancePct, 3);
});
