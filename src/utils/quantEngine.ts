import type {
  BacktestSummary,
  BacktestTrade,
  Candle,
  CryptoAssetMeta,
  EnrichedCandle,
  EquityPoint,
  FactorScore,
  KellySizingInput,
  KellySizingOutput,
  MarketRegime,
  QuantAnalysisResult,
  SignalBias,
  Timeframe,
  TradeLevels,
} from '../types/quant';

export function computeEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  result[period - 1] = ema;

  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export function computeZScoreSeries(values: number[], period = 20): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 1 || values.length < period) return result;

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += values[j];
    }
    const mean = sum / period;
    let sqDiff = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - mean;
      sqDiff += diff * diff;
    }
    const std = Math.sqrt(sqDiff / period);
    result[i] = std > 1e-12 ? (values[i] - mean) / std : 0;
  }
  return result;
}

export function computeRSISeries(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return result;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function computeMACDSeries(values: number[]): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const ema12 = computeEMA(values, 12);
  const ema26 = computeEMA(values, 26);
  const macd: (number | null)[] = values.map((_, i) =>
    ema12[i] !== null && ema26[i] !== null ? (ema12[i] as number) - (ema26[i] as number) : null
  );

  const validMacd: number[] = [];
  const validIndices: number[] = [];
  macd.forEach((v, idx) => {
    if (v !== null) {
      validMacd.push(v);
      validIndices.push(idx);
    }
  });

  const signalCompact = computeEMA(validMacd, 9);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  const histogram: (number | null)[] = new Array(values.length).fill(null);

  signalCompact.forEach((sigVal, compactIdx) => {
    const origIdx = validIndices[compactIdx];
    signal[origIdx] = sigVal;
    if (sigVal !== null && macd[origIdx] !== null) {
      histogram[origIdx] = (macd[origIdx] as number) - sigVal;
    }
  });

  return { macd, signal, histogram };
}

export function computeATRSeries(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  const tr: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].close;
    const highLow = candles[i].high - candles[i].low;
    const highClose = Math.abs(candles[i].high - prevClose);
    const lowClose = Math.abs(candles[i].low - prevClose);
    tr.push(Math.max(highLow, highClose, lowClose));
  }

  let sum = 0;
  for (let i = 1; i <= period; i++) {
    sum += tr[i];
  }
  let atr = sum / period;
  result[period] = atr;

  for (let i = period + 1; i < candles.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    result[i] = atr;
  }
  return result;
}

export function classifyRegime(params: {
  price: number;
  ema20: number;
  ema50: number;
  ema20Prev: number;
  atrPercent: number;
  medianAtrPercent: number;
}): MarketRegime {
  const { price, ema20, ema50, ema20Prev, atrPercent, medianAtrPercent } = params;
  const slopePct = ema20Prev > 0 ? (ema20 - ema20Prev) / ema20Prev : 0;
  const spreadPct = ema50 > 0 ? (ema20 - ema50) / ema50 : 0;

  if (medianAtrPercent > 0 && atrPercent > medianAtrPercent * 1.45) {
    return 'Alta Volatilidade';
  }
  if (price > ema20 && ema20 > ema50 && slopePct > 0.0005 && spreadPct > 0.002) {
    return 'Tendência de Alta';
  }
  if (price < ema20 && ema20 < ema50 && slopePct < -0.0005 && spreadPct < -0.002) {
    return 'Tendência de Baixa';
  }
  return 'Reversão à Média';
}

export function runStrategyBacktest(
  candles: Candle[],
  timeframe: Timeframe
): BacktestSummary {
  if (candles.length < 60) {
    return {
      totalTrades: 0,
      winRatePct: 0,
      profitFactor: 0,
      totalReturnPct: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      avgWinPct: 0,
      avgLossPct: 0,
      equityCurve: candles.map((c) => ({ time: c.time, equity: 100, drawdownPct: 0 })),
      trades: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const ema20 = computeEMA(closes, 20);
  const ema50 = computeEMA(closes, 50);
  const zScores = computeZScoreSeries(closes, 20);
  const rsis = computeRSISeries(closes, 14);
  const atrs = computeATRSeries(candles, 14);

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [];
  const feePct = 0.001; // 0.10% per side (institutional slippage + fee discipline)

  let equity = 100;
  let peakEquity = 100;
  let maxDrawdownPct = 0;
  const barReturns: number[] = [];

  let openPosition: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    entryTime: number;
    stopPrice: number;
    targetPrice: number;
  } | null = null;

  for (let i = 52; i < candles.length; i++) {
    const c = candles[i];
    const e20 = ema20[i];
    const e50 = ema50[i];
    const z = zScores[i];
    const rsi = rsis[i];
    const atr = atrs[i];

    let barReturn = 0;

    if (openPosition) {
      let exitPrice: number | null = null;
      let reason = '';

      if (openPosition.side === 'LONG') {
        if (c.low <= openPosition.stopPrice) {
          exitPrice = openPosition.stopPrice;
          reason = 'Stop ATR';
        } else if (c.high >= openPosition.targetPrice) {
          exitPrice = openPosition.targetPrice;
          reason = 'Alvo Estatístico';
        } else if (z !== null && z > 1.3 && c.close > openPosition.entryPrice) {
          exitPrice = c.close;
          reason = 'Reversão Z-Score';
        }
      } else {
        if (c.high >= openPosition.stopPrice) {
          exitPrice = openPosition.stopPrice;
          reason = 'Stop ATR';
        } else if (c.low <= openPosition.targetPrice) {
          exitPrice = openPosition.targetPrice;
          reason = 'Alvo Estatístico';
        } else if (z !== null && z < -1.3 && c.close < openPosition.entryPrice) {
          exitPrice = c.close;
          reason = 'Reversão Z-Score';
        }
      }

      if (exitPrice !== null) {
        const grossPct =
          openPosition.side === 'LONG'
            ? (exitPrice - openPosition.entryPrice) / openPosition.entryPrice
            : (openPosition.entryPrice - exitPrice) / openPosition.entryPrice;
        const netPct = grossPct - feePct * 2;
        equity = equity * (1 + netPct);
        barReturn = netPct;

        trades.push({
          entryTime: openPosition.entryTime,
          exitTime: c.time,
          side: openPosition.side,
          entryPrice: openPosition.entryPrice,
          exitPrice,
          returnPct: Number((netPct * 100).toFixed(2)),
          reason,
        });
        openPosition = null;
      }
    } else if (e20 !== null && e50 !== null && z !== null && rsi !== null && atr !== null) {
      // Entry rule combining Simons Mean Reversion Z-Score + Trend/Momentum filter
      const bullishPullback = e20 >= e50 * 0.992 && z <= -1.15 && rsi <= 46;
      const deepOversold = z <= -1.85 && rsi <= 34;
      const bearishRejection = e20 <= e50 * 1.008 && z >= 1.15 && rsi >= 54;
      const deepOverbought = z >= 1.85 && rsi >= 66;

      if (bullishPullback || (deepOversold && c.close > c.open && c.close > candles[i - 1].close && e20 >= e50 * 0.97)) {
        openPosition = {
          side: 'LONG',
          entryPrice: c.close,
          entryTime: c.time,
          stopPrice: c.close - atr * 1.8,
          targetPrice: c.close + atr * 3.0,
        };
      } else if (bearishRejection || (deepOverbought && c.close < c.open && c.close < candles[i - 1].close && e20 <= e50 * 1.03)) {
        openPosition = {
          side: 'SHORT',
          entryPrice: c.close,
          entryTime: c.time,
          stopPrice: c.close + atr * 1.8,
          targetPrice: c.close - atr * 3.0,
        };
      }
    }

    barReturns.push(barReturn);
    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (dd > maxDrawdownPct) maxDrawdownPct = dd;

    equityCurve.push({
      time: c.time,
      equity: Number(equity.toFixed(2)),
      drawdownPct: Number(dd.toFixed(2)),
    });
  }

  const wins = trades.filter((t) => t.returnPct > 0);
  const losses = trades.filter((t) => t.returnPct <= 0);
  const grossWin = wins.reduce((acc, t) => acc + t.returnPct, 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.returnPct, 0));

  const winRatePct = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const profitFactor =
    grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 3.5 : 0;
  const avgWinPct = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLossPct = losses.length > 0 ? grossLoss / losses.length : 0;

  // Annualized Sharpe approximation over trade-bar returns
  const periodsPerYear = timeframe === '1h' ? 8760 : timeframe === '4h' ? 2190 : 365;
  const meanRet =
    barReturns.length > 0
      ? barReturns.reduce((a, b) => a + b, 0) / barReturns.length
      : 0;
  const variance =
    barReturns.length > 1
      ? barReturns.reduce((acc, r) => acc + (r - meanRet) ** 2, 0) / (barReturns.length - 1)
      : 0;
  const stdRet = Math.sqrt(variance);
  const sharpeRatio = stdRet > 1e-9 ? (meanRet / stdRet) * Math.sqrt(periodsPerYear) : 0;

  return {
    totalTrades: trades.length,
    winRatePct: Number(winRatePct.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    totalReturnPct: Number((equity - 100).toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    sharpeRatio: Number(Math.max(-5, Math.min(8, sharpeRatio)).toFixed(2)),
    avgWinPct: Number(avgWinPct.toFixed(2)),
    avgLossPct: Number(avgLossPct.toFixed(2)),
    equityCurve,
    trades: trades.slice().reverse(),
  };
}

export function analyzeCandles(
  asset: CryptoAssetMeta,
  candles: Candle[],
  timeframe: Timeframe,
  source: 'live' | 'calibrated',
  sourceLabel: string
): QuantAnalysisResult {
  if (candles.length < 30) {
    throw new Error('São necessários pelo menos 30 candles para análise quantitativa.');
  }

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const ema20Arr = computeEMA(closes, 20);
  const ema50Arr = computeEMA(closes, 50);
  const ema200Arr = computeEMA(closes, 200);
  const zArr = computeZScoreSeries(closes, 20);
  const rsiArr = computeRSISeries(closes, 14);
  const macdData = computeMACDSeries(closes);
  const atrArr = computeATRSeries(candles, 14);

  const lastIdx = candles.length - 1;
  const last = candles[lastIdx];
  const currentPrice = last.close;

  // 24h window calculation depending on timeframe
  const bars24h = timeframe === '1h' ? 24 : timeframe === '4h' ? 6 : 1;
  const refIdx = Math.max(0, lastIdx - bars24h);
  const refPrice = candles[refIdx].close;
  const change24hPct = refPrice > 0 ? ((currentPrice - refPrice) / refPrice) * 100 : 0;

  const recent24h = candles.slice(Math.max(0, lastIdx - bars24h + 1));
  const high24h = Math.max(...recent24h.map((c) => c.high));
  const low24h = Math.min(...recent24h.map((c) => c.low));
  const volume24hUsd = recent24h.reduce((sum, c) => sum + c.volume * c.close, 0);

  const ema20 = ema20Arr[lastIdx] ?? currentPrice;
  const ema50 = ema50Arr[lastIdx] ?? ema20;
  const ema200 = ema200Arr[lastIdx];
  const ema20Prev = ema20Arr[Math.max(0, lastIdx - 3)] ?? ema20;
  const zScore = zArr[lastIdx] ?? 0;
  const rsi14 = rsiArr[lastIdx] ?? 50;
  const macdHist = macdData.histogram[lastIdx] ?? 0;
  const macdHistPrev = macdData.histogram[Math.max(0, lastIdx - 1)] ?? macdHist;
  const atr = atrArr[lastIdx] ?? currentPrice * 0.02;
  const atrPercent = currentPrice > 0 ? (atr / currentPrice) * 100 : 2;

  // Median ATR% over available bars for volatility regime check
  const atrPcts = atrArr
    .map((v, idx) => (v !== null && closes[idx] > 0 ? (v / closes[idx]) * 100 : null))
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  const medianAtrPercent =
    atrPcts.length > 0 ? atrPcts[Math.floor(atrPcts.length / 2)] : atrPercent;

  // Relative Volume (RVOL) vs 20-period average
  const volSlice = volumes.slice(Math.max(0, lastIdx - 20), lastIdx);
  const avgVol =
    volSlice.length > 0 ? volSlice.reduce((a, b) => a + b, 0) / volSlice.length : last.volume;
  const rvol = avgVol > 0 ? last.volume / avgVol : 1;

  const regime = classifyRegime({
    price: currentPrice,
    ema20,
    ema50,
    ema20Prev,
    atrPercent,
    medianAtrPercent,
  });

  // 5-Factor Auditable Confluence Score (-100 to +100)
  // 1. Structural Trend Alignment (-25 to +25)
  let trendScore = 0;
  if (currentPrice > ema20 && ema20 > ema50) trendScore = 22;
  else if (currentPrice > ema20) trendScore = 10;
  else if (currentPrice < ema20 && ema20 < ema50) trendScore = -22;
  else if (currentPrice < ema20) trendScore = -10;
  if (ema200 !== null) {
    trendScore += currentPrice > ema200 ? 3 : -3;
  }

  // 2. Mean Reversion Z-Score Elasticity (-25 to +25)
  // Negative Z-score suggests oversold mean-reversion edge (+), positive Z-score suggests overextension (-)
  const clampedZ = Math.max(-2.5, Math.min(2.5, zScore));
  const zFactorScore = Math.round((-clampedZ / 2.5) * 25);

  // 3. RSI-14 Regime (-20 to +20)
  let rsiScore = 0;
  if (rsi14 <= 30) rsiScore = 20;
  else if (rsi14 <= 42) rsiScore = 12;
  else if (rsi14 >= 70) rsiScore = -20;
  else if (rsi14 >= 58) rsiScore = -12;
  else rsiScore = Math.round(((50 - rsi14) / 10) * 4);

  // 4. MACD Impulse Slope (-15 to +15)
  let macdScore = 0;
  const macdDelta = macdHist - macdHistPrev;
  if (macdHist > 0 && macdDelta > 0) macdScore = 15;
  else if (macdDelta > 0) macdScore = 8;
  else if (macdHist < 0 && macdDelta < 0) macdScore = -15;
  else if (macdDelta < 0) macdScore = -8;

  // 5. Volume Conviction (-15 to +15)
  const directionSign = trendScore + zFactorScore + macdScore >= 0 ? 1 : -1;
  let volScore = 0;
  if (rvol >= 1.5) volScore = 15 * directionSign;
  else if (rvol >= 1.1) volScore = 8 * directionSign;
  else if (rvol <= 0.7) volScore = -5 * directionSign;

  const confluenceScore = Math.max(
    -100,
    Math.min(100, trendScore + zFactorScore + rsiScore + macdScore + volScore)
  );

  const bias: SignalBias =
    confluenceScore >= 22
      ? 'Compra Estatística'
      : confluenceScore <= -22
      ? 'Venda Estatística'
      : 'Neutro / Aguardar';

  const factors: FactorScore[] = [
    {
      id: 'trend',
      label: 'Estrutura de Médias (EMA 20/50)',
      valueDisplay:
        currentPrice >= ema20 ? 'Preço > EMA20' : 'Preço < EMA20',
      score: trendScore,
      maxAbs: 25,
      interpretation:
        trendScore > 0
          ? 'Alinhamento comprador na estrutura de curto e médio prazo.'
          : trendScore < 0
          ? 'Pressão vendedora abaixo das médias de referência.'
          : 'Estrutura equilibrada sem tendência direcional clara.',
    },
    {
      id: 'zscore',
      label: 'Elasticidade Z-Score (20p)',
      valueDisplay: `${zScore >= 0 ? '+' : ''}${zScore.toFixed(2)}σ`,
      score: zFactorScore,
      maxAbs: 25,
      interpretation:
        zScore <= -1.5
          ? 'Desvio negativo extremo: alta probabilidade de retorno à média.'
          : zScore >= 1.5
          ? 'Preço esticado acima da média: risco elevado de correção.'
          : 'Desvio dentro da banda estatística normal (±1.5σ).',
    },
    {
      id: 'rsi',
      label: 'Momentum Relativo (RSI 14)',
      valueDisplay: rsi14.toFixed(1),
      score: rsiScore,
      maxAbs: 20,
      interpretation:
        rsi14 <= 35
          ? 'Zona de sobrevenda estatística favorável a repique.'
          : rsi14 >= 65
          ? 'Zona de sobrecompra com exaustão de impulso.'
          : 'Momentum neutro sem extremos de exaustão.',
    },
    {
      id: 'macd',
      label: 'Aceleração MACD (12,26,9)',
      valueDisplay: macdHist >= 0 ? 'Positivo' : 'Negativo',
      score: macdScore,
      maxAbs: 15,
      interpretation:
        macdDelta >= 0
          ? 'Histograma em aceleração ascendente.'
          : 'Histograma perdendo força compradora.',
    },
    {
      id: 'rvol',
      label: 'Volume Relativo (RVOL)',
      valueDisplay: `${rvol.toFixed(2)}x`,
      score: volScore,
      maxAbs: 15,
      interpretation:
        rvol >= 1.2
          ? 'Participação institucional acima da média de 20 períodos.'
          : 'Volume moderado ou abaixo da média recente.',
    },
  ];

  const direction: TradeLevels['direction'] =
    confluenceScore >= 22 ? 'LONG' : confluenceScore <= -22 ? 'SHORT' : 'NEUTRAL';

  const stopDist = atr * 1.5;
  const levels: TradeLevels =
    direction === 'SHORT'
      ? {
          direction,
          entry: currentPrice,
          stopLoss: currentPrice + stopDist,
          takeProfit1: Math.max(0, currentPrice - stopDist * 2.0),
          takeProfit2: Math.max(0, currentPrice - stopDist * 3.2),
          atr,
          atrPercent: Number(atrPercent.toFixed(2)),
          riskRewardRatio: 2.0,
        }
      : {
          direction,
          entry: currentPrice,
          stopLoss: Math.max(0, currentPrice - stopDist),
          takeProfit1: currentPrice + stopDist * 2.0,
          takeProfit2: currentPrice + stopDist * 3.2,
          atr,
          atrPercent: Number(atrPercent.toFixed(2)),
          riskRewardRatio: 2.0,
        };

  const backtest = runStrategyBacktest(candles, timeframe);

  const enrichedCandles: EnrichedCandle[] = candles.map((c, i) => ({
    ...c,
    ema20: ema20Arr[i],
    ema50: ema50Arr[i],
    zScore: zArr[i],
    rsi14: rsiArr[i],
  }));

  return {
    asset,
    timeframe,
    source,
    sourceLabel,
    updatedAt: Date.now(),
    currentPrice,
    change24hPct: Number(change24hPct.toFixed(2)),
    high24h,
    low24h,
    volume24hUsd,
    regime,
    bias,
    confluenceScore,
    zScore: Number(zScore.toFixed(2)),
    rsi14: Number(rsi14.toFixed(1)),
    macdHistogram: macdHist,
    rvol: Number(rvol.toFixed(2)),
    ema20,
    ema50,
    ema200,
    factors,
    levels,
    backtest,
    candles: enrichedCandles,
  };
}

export function calculateKellySizing(input: KellySizingInput): KellySizingOutput {
  const capital = Math.max(0, input.capitalUsd);
  const maxUserRiskPct = Math.max(0.1, Math.min(10, input.riskPerTradePct));
  const winProb = Math.max(0.05, Math.min(0.95, input.winRatePct / 100));
  const lossProb = 1 - winProb;
  const b = Math.max(0.2, input.rewardToRisk);

  // Classic Kelly fraction: f* = (b*p - q) / b
  const rawKelly = (b * winProb - lossProb) / b;
  const fullKellyPct = Math.max(0, Math.min(100, rawKelly * 100));
  const halfKellyPct = fullKellyPct / 2;

  // Simons discipline: cap per-trade capital risk by user's hard risk ceiling and Half-Kelly
  const effectiveRiskPct =
    halfKellyPct > 0
      ? Math.min(maxUserRiskPct, Math.max(0.25, halfKellyPct / 4))
      : maxUserRiskPct * 0.5;

  const stopDistancePct =
    input.entryPrice > 0
      ? Math.max(0.002, Math.abs(input.entryPrice - input.stopPrice) / input.entryPrice)
      : 0.03;

  const maxLossUsd = capital * (effectiveRiskPct / 100);
  const rawPositionUsd = maxLossUsd / stopDistancePct;
  // Never exceed 100% of spot capital in unleveraged recommendation
  const positionValueUsd = Math.min(capital, rawPositionUsd);
  const actualMaxLossUsd = positionValueUsd * stopDistancePct;
  const positionUnits = input.entryPrice > 0 ? positionValueUsd / input.entryPrice : 0;
  const expectancyPerDollar = winProb * b - lossProb;

  return {
    fullKellyPct: Number(fullKellyPct.toFixed(2)),
    halfKellyPct: Number(halfKellyPct.toFixed(2)),
    recommendedRiskPct: Number(effectiveRiskPct.toFixed(2)),
    positionValueUsd: Number(positionValueUsd.toFixed(2)),
    positionUnits: Number(positionUnits.toFixed(6)),
    maxLossUsd: Number(actualMaxLossUsd.toFixed(2)),
    stopDistancePct: Number((stopDistancePct * 100).toFixed(2)),
    expectancyPerDollar: Number(expectancyPerDollar.toFixed(3)),
  };
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1000) {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (value >= 1) {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

export function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}
