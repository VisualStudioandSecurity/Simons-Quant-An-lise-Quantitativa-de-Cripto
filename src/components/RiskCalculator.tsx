import { useMemo, useState } from 'react';
import type { QuantAnalysisResult } from '../types/quant';
import { calculateKellySizing, formatPrice } from '../utils/quantEngine';

interface RiskCalculatorProps {
  analysis: QuantAnalysisResult;
}

export function RiskCalculator({ analysis }: RiskCalculatorProps) {
  const [capitalInput, setCapitalInput] = useState<string>('10000');
  const [riskPctInput, setRiskPctInput] = useState<string>('1.5');

  const defaultWinRate =
    analysis.backtest.totalTrades >= 3 ? analysis.backtest.winRatePct : 54;

  const sizing = useMemo(() => {
    const capitalUsd = Number.parseFloat(capitalInput) || 0;
    const riskPerTradePct = Number.parseFloat(riskPctInput) || 1;
    return calculateKellySizing({
      capitalUsd,
      riskPerTradePct,
      winRatePct: defaultWinRate,
      rewardToRisk: analysis.levels.riskRewardRatio,
      entryPrice: analysis.levels.entry,
      stopPrice: analysis.levels.stopLoss,
    });
  }, [
    capitalInput,
    riskPctInput,
    defaultWinRate,
    analysis.levels.riskRewardRatio,
    analysis.levels.entry,
    analysis.levels.stopLoss,
  ]);

  return (
    <section
      aria-labelledby="kelly-calc-heading"
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="border-b border-slate-100 pb-3.5">
        <h2 id="kelly-calc-heading" className="text-base font-semibold text-slate-900">
          Dimensionamento Half-Kelly & Controle ATR
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Baseado no princípio de Jim Simons: limite a alavancagem pela volatilidade real (ATR) e
          nunca arrisque acima da fração ótima estatística.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="capital-usd-input"
            className="block text-xs font-medium text-slate-700"
          >
            Capital Alocado (USDT)
          </label>
          <input
            id="capital-usd-input"
            type="number"
            min="100"
            step="500"
            value={capitalInput}
            onChange={(e) => setCapitalInput(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="risk-pct-input"
            className="block text-xs font-medium text-slate-700"
          >
            Teto de Risco por Operação (%)
          </label>
          <input
            id="risk-pct-input"
            type="number"
            min="0.25"
            max="5"
            step="0.25"
            value={riskPctInput}
            onChange={(e) => setRiskPctInput(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <div>
          <div className="text-xs text-slate-500">Tamanho Recomendado</div>
          <div
            data-testid="kelly-position-usd"
            className="mt-0.5 text-lg font-bold font-mono tabular-nums text-slate-900"
          >
            ${sizing.positionValueUsd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            {sizing.positionUnits.toFixed(4)} {analysis.asset.base}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Perda Máxima (Stop)</div>
          <div
            data-testid="kelly-max-loss"
            className="mt-0.5 text-lg font-bold font-mono tabular-nums text-red-600"
          >
            -${sizing.maxLossUsd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            Distância {sizing.stopDistancePct.toFixed(2)}% ({analysis.levels.atrPercent.toFixed(2)}% ATR)
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Kelly Fracionado (1/2)</div>
          <div className="mt-0.5 text-lg font-bold font-mono tabular-nums text-slate-900">
            {sizing.halfKellyPct.toFixed(1)}%
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            Kelly Cheio: {sizing.fullKellyPct.toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500">Expectativa Matemática</div>
          <div
            className={`mt-0.5 text-lg font-bold font-mono tabular-nums ${
              sizing.expectancyPerDollar >= 0 ? 'text-green-700' : 'text-red-600'
            }`}
          >
            {sizing.expectancyPerDollar >= 0 ? '+' : ''}
            {sizing.expectancyPerDollar.toFixed(3)}R
          </div>
          <div className="text-[11px] font-mono tabular-nums text-slate-500">
            Acerto base: {defaultWinRate.toFixed(1)}% · R/R {analysis.levels.riskRewardRatio}:1
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          Níveis calculados no preço atual ({formatPrice(analysis.levels.entry)}):
        </span>
        <span className="font-mono tabular-nums text-slate-700">
          Stop {formatPrice(analysis.levels.stopLoss)} · Alvo 1{' '}
          {formatPrice(analysis.levels.takeProfit1)} · Alvo 2{' '}
          {formatPrice(analysis.levels.takeProfit2)}
        </span>
      </div>
    </section>
  );
}
