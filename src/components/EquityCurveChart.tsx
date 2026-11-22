import { useState } from 'react';
import type { EquityPoint } from '../types/quant';

interface EquityCurveChartProps {
  points: EquityPoint[];
}

export function EquityCurveChart({ points }: EquityCurveChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div className="flex h-60 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
        Histórico insuficiente para construir curva de capital.
      </div>
    );
  }

  const width = 920;
  const height = 240;
  const padLeft = 16;
  const padRight = 64;
  const padTop = 20;
  const padBottom = 24;

  const equities = points.map((p) => p.equity);
  const minEq = Math.min(...equities, 100) * 0.985;
  const maxEq = Math.max(...equities, 100) * 1.015;
  const span = maxEq - minEq || 1;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const xForIdx = (i: number) => padLeft + (i / (points.length - 1)) * plotW;
  const yForEq = (eq: number) => padTop + (1 - (eq - minEq) / span) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForIdx(i).toFixed(1)} ${yForEq(p.equity).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${xForIdx(points.length - 1).toFixed(1)} ${(
    height - padBottom
  ).toFixed(1)} L ${padLeft} ${(height - padBottom).toFixed(1)} Z`;

  const lastEquity = points[points.length - 1].equity;
  const isPositive = lastEquity >= 100;
  const strokeColor = isPositive ? '#16a34a' : '#dc2626';
  const fillColor = isPositive ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)';

  const activePoint =
    hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Curva de Capital Simulada (Base 100 · Taxas 0,10%/ordem)
          </h3>
          <p className="text-xs text-slate-500">
            Execução sistemática com sinais de Z-Score + tendência + stop ATR.
          </p>
        </div>
        <div className="text-right font-mono tabular-nums text-xs">
          <span className="text-slate-900 font-semibold">
            Índice: {activePoint.equity.toFixed(2)}
          </span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-slate-500">
            Drawdown: -{activePoint.drawdownPct.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="mt-3" data-testid="equity-curve-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          role="img"
          aria-label="Curva de capital simulada do backtest"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Baseline 100 */}
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={yForEq(100)}
            y2={yForEq(100)}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={width - padRight + 8}
            y={yForEq(100) + 4}
            fontSize="10"
            className="fill-slate-400 font-mono"
          >
            100.0
          </text>

          <path d={areaPath} fill={fillColor} />
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" />

          {hoverIdx !== null && points[hoverIdx] && (
            <g>
              <line
                x1={xForIdx(hoverIdx)}
                x2={xForIdx(hoverIdx)}
                y1={padTop}
                y2={height - padBottom}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={xForIdx(hoverIdx)}
                cy={yForEq(points[hoverIdx].equity)}
                r="4"
                fill={strokeColor}
              />
            </g>
          )}

          {points.map((p, i) => (
            <rect
              key={p.time}
              x={xForIdx(i) - plotW / points.length / 2}
              y={0}
              width={Math.max(4, plotW / points.length)}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
