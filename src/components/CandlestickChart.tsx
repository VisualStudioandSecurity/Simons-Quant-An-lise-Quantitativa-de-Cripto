import { useMemo, useState } from 'react';
import type { EnrichedCandle, TradeLevels } from '../types/quant';
import { formatPrice } from '../utils/quantEngine';

interface CandlestickChartProps {
  candles: EnrichedCandle[];
  levels: TradeLevels;
  pair: string;
}

export function CandlestickChart({ candles, levels, pair }: CandlestickChartProps) {
  const [windowSize, setWindowSize] = useState<60 | 90 | 120>(90);
  const [showLevels, setShowLevels] = useState<boolean>(true);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const visibleCandles = useMemo(
    () => candles.slice(-windowSize),
    [candles, windowSize]
  );

  const width = 920;
  const priceHeight = 290;
  const zHeight = 110;
  const padLeft = 14;
  const padRight = 74;
  const padTop = 18;
  const padBottom = 16;

  const plotWidth = width - padLeft - padRight;
  const plotPriceHeight = priceHeight - padTop - padBottom;

  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let mVol = 0;

    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.ema20 !== null) {
        min = Math.min(min, c.ema20);
        max = Math.max(max, c.ema20);
      }
      if (c.ema50 !== null) {
        min = Math.min(min, c.ema50);
        max = Math.max(max, c.ema50);
      }
      if (c.volume > mVol) mVol = c.volume;
    }

    if (showLevels && levels.direction !== 'NEUTRAL') {
      min = Math.min(min, levels.stopLoss, levels.takeProfit1);
      max = Math.max(max, levels.stopLoss, levels.takeProfit1);
    }

    const span = max - min || 1;
    return {
      minPrice: min - span * 0.06,
      maxPrice: max + span * 0.06,
      maxVol: mVol || 1,
    };
  }, [visibleCandles, showLevels, levels]);

  const yForPrice = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
    return padTop + (1 - ratio) * plotPriceHeight;
  };

  const xStep = visibleCandles.length > 0 ? plotWidth / visibleCandles.length : 1;
  const candleWidth = Math.max(2.5, Math.min(8, xStep * 0.62));

  const buildLinePath = (accessor: (c: EnrichedCandle) => number | null) => {
    let d = '';
    visibleCandles.forEach((c, i) => {
      const val = accessor(c);
      if (val === null) return;
      const x = padLeft + i * xStep + xStep / 2;
      const y = yForPrice(val);
      d += d === '' ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  };

  const ema20Path = buildLinePath((c) => c.ema20);
  const ema50Path = buildLinePath((c) => c.ema50);

  // Z-Score bounds fixed around [-3, +3] for clean structural readability
  const zTopPad = 14;
  const zBotPad = 18;
  const zPlotH = zHeight - zTopPad - zBotPad;
  const yForZ = (z: number) => {
    const clamped = Math.max(-3.2, Math.min(3.2, z));
    const ratio = (clamped + 3.2) / 6.4;
    return zTopPad + (1 - ratio) * zPlotH;
  };

  const zPath = useMemo(() => {
    let d = '';
    visibleCandles.forEach((c, i) => {
      if (c.zScore === null) return;
      const x = padLeft + i * xStep + xStep / 2;
      const y = yForZ(c.zScore);
      d += d === '' ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return d;
  }, [visibleCandles, xStep]);

  const activeCandle =
    hoverIdx !== null && visibleCandles[hoverIdx]
      ? visibleCandles[hoverIdx]
      : visibleCandles[visibleCandles.length - 1];

  const priceTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const p = minPrice + (maxPrice - minPrice) * t;
    return { price: p, y: yForPrice(p) };
  });

  const formatCandleDate = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Chart Header Controls */}
      <div className="space-y-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{pair}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-blue-600 inline-block" aria-hidden="true" />
              EMA 20
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-amber-600 inline-block" aria-hidden="true" />
              EMA 50
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLevels((v) => !v)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                showLevels
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
              }`}
            >
              Níveis ATR
            </button>

            <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
              {([60, 90, 120] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setWindowSize(sz)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium font-mono tabular-nums transition-colors ${
                    windowSize === sz
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {sz}c
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeCandle && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
            <span>
              A: {formatPrice(activeCandle.open)} · M: {formatPrice(activeCandle.high)} · m:{' '}
              {formatPrice(activeCandle.low)} · F: {formatPrice(activeCandle.close)}
            </span>
            <span>Candle: {formatCandleDate(activeCandle.time)}</span>
          </div>
        )}
      </div>

      {/* Main Price + EMA + Volume SVG */}
      <div className="mt-3" data-testid="candlestick-chart">
        <svg
          viewBox={`0 0 ${width} ${priceHeight}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label={`Gráfico de candlesticks e médias móveis para ${pair}`}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal gridlines & right-axis prices */}
          {priceTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={tick.y}
                y2={tick.y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={width - padRight + 8}
                y={tick.y + 4}
                fontSize="10"
                className="fill-slate-400 font-mono tabular-nums"
              >
                {formatPrice(tick.price)}
              </text>
            </g>
          ))}

          {/* ATR Stop Loss & Take Profit reference lines */}
          {showLevels && levels.direction !== 'NEUTRAL' && (
            <g>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={yForPrice(levels.stopLoss)}
                y2={yForPrice(levels.stopLoss)}
                stroke="#dc2626"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text
                x={padLeft + 4}
                y={yForPrice(levels.stopLoss) - 4}
                fontSize="10"
                className="fill-red-600 font-mono font-semibold"
              >
                Stop ATR ({formatPrice(levels.stopLoss)})
              </text>

              <line
                x1={padLeft}
                x2={width - padRight}
                y1={yForPrice(levels.takeProfit1)}
                y2={yForPrice(levels.takeProfit1)}
                stroke="#16a34a"
                strokeDasharray="4 4"
                strokeWidth="1.2"
              />
              <text
                x={padLeft + 4}
                y={yForPrice(levels.takeProfit1) - 4}
                fontSize="10"
                className="fill-green-700 font-mono font-semibold"
              >
                Alvo 1 ({formatPrice(levels.takeProfit1)})
              </text>
            </g>
          )}

          {/* Subtle Volume histogram at bottom 20% of price panel */}
          {visibleCandles.map((c, i) => {
            const x = padLeft + i * xStep + (xStep - candleWidth) / 2;
            const barH = (c.volume / maxVol) * 42;
            const isUp = c.close >= c.open;
            return (
              <rect
                key={`v-${c.time}`}
                x={x}
                y={priceHeight - padBottom - barH}
                width={candleWidth}
                height={barH}
                fill={isUp ? 'rgba(22, 163, 74, 0.16)' : 'rgba(220, 38, 38, 0.16)'}
              />
            );
          })}

          {/* Candlesticks */}
          {visibleCandles.map((c, i) => {
            const centerX = padLeft + i * xStep + xStep / 2;
            const x = centerX - candleWidth / 2;
            const isUp = c.close >= c.open;
            const color = isUp ? '#16a34a' : '#dc2626';
            const yHigh = yForPrice(c.high);
            const yLow = yForPrice(c.low);
            const yOpen = yForPrice(c.open);
            const yClose = yForPrice(c.close);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyH = Math.max(1.5, Math.abs(yClose - yOpen));

            return (
              <g key={c.time}>
                <line
                  x1={centerX}
                  x2={centerX}
                  y1={yHigh}
                  y2={yLow}
                  stroke={color}
                  strokeWidth="1.2"
                />
                <rect
                  x={x}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyH}
                  fill={color}
                  rx="0.8"
                />
              </g>
            );
          })}

          {/* EMA 50 & EMA 20 */}
          {ema50Path && (
            <path d={ema50Path} fill="none" stroke="#d97706" strokeWidth="1.5" />
          )}
          {ema20Path && (
            <path d={ema20Path} fill="none" stroke="#2563eb" strokeWidth="1.75" />
          )}

          {/* Crosshair guide */}
          {hoverIdx !== null && visibleCandles[hoverIdx] && (
            <line
              x1={padLeft + hoverIdx * xStep + xStep / 2}
              x2={padLeft + hoverIdx * xStep + xStep / 2}
              y1={padTop}
              y2={priceHeight - padBottom}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}

          {/* Invisible hit columns for crisp hover */}
          {visibleCandles.map((c, i) => (
            <rect
              key={`hit-${c.time}`}
              x={padLeft + i * xStep}
              y={0}
              width={xStep}
              height={priceHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </svg>

        {/* Sub-chart: Z-Score (Simons Mean Reversion Oscillator) */}
        <div className="mt-2 border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Oscilador Z-Score (Desvio Padrão 20p · Reversão à Média)</span>
            <span className="font-mono tabular-nums text-slate-700">
              {activeCandle?.zScore !== null && activeCandle?.zScore !== undefined
                ? `Z = ${activeCandle.zScore >= 0 ? '+' : ''}${activeCandle.zScore.toFixed(2)}σ`
                : '—'}
              {activeCandle?.rsi14 !== null && activeCandle?.rsi14 !== undefined
                ? ` · RSI = ${activeCandle.rsi14.toFixed(1)}`
                : ''}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${width} ${zHeight}`}
            className="w-full h-auto overflow-visible select-none"
            role="img"
            aria-label="Subgráfico Z-Score de 20 períodos"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Reference bands: +2σ, 0, -2σ */}
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yForZ(2)}
              y2={yForZ(2)}
              stroke="#fca5a5"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={width - padRight + 8}
              y={yForZ(2) + 3}
              fontSize="10"
              className="fill-red-500 font-mono"
            >
              +2.0σ
            </text>

            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yForZ(0)}
              y2={yForZ(0)}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
            <text
              x={width - padRight + 8}
              y={yForZ(0) + 3}
              fontSize="10"
              className="fill-slate-400 font-mono"
            >
              0.0σ
            </text>

            <line
              x1={padLeft}
              x2={width - padRight}
              y1={yForZ(-2)}
              y2={yForZ(-2)}
              stroke="#86efac"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={width - padRight + 8}
              y={yForZ(-2) + 3}
              fontSize="10"
              className="fill-green-600 font-mono"
            >
              -2.0σ
            </text>

            {zPath && (
              <path d={zPath} fill="none" stroke="#0f172a" strokeWidth="1.6" />
            )}

            {hoverIdx !== null && visibleCandles[hoverIdx]?.zScore !== null && (
              <circle
                cx={padLeft + hoverIdx * xStep + xStep / 2}
                cy={yForZ(visibleCandles[hoverIdx].zScore as number)}
                r="3.5"
                fill="#2563eb"
              />
            )}

            {visibleCandles.map((c, i) => (
              <rect
                key={`zhit-${c.time}`}
                x={padLeft + i * xStep}
                y={0}
                width={xStep}
                height={zHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
