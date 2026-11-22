import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { CRYPTO_ASSETS } from '../data/assets';
import type { QuantAnalysisResult, Timeframe } from '../types/quant';
import { formatCompactUsd, formatPrice } from '../utils/quantEngine';
import { CandlestickChart } from './CandlestickChart';
import { RiskCalculator } from './RiskCalculator';
import type { WorkspaceTab } from './TopNav';

interface QuantPanelProps {
  analysis: QuantAnalysisResult | null;
  selectedSymbol: string;
  selectedTimeframe: Timeframe;
  isLoading: boolean;
  error: string | null;
  onSelectSymbol: (symbol: string) => void;
  onSelectTimeframe: (tf: Timeframe) => void;
  onNavigateTab: (tab: WorkspaceTab) => void;
}

export function QuantPanel({
  analysis,
  selectedSymbol,
  selectedTimeframe,
  isLoading,
  error,
  onSelectSymbol,
  onSelectTimeframe,
  onNavigateTab,
}: QuantPanelProps) {
  if (error && !analysis) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
        <h2 className="text-base font-semibold text-slate-900">
          Falha ao carregar análise quantitativa
        </h2>
        <p className="mt-1 text-sm text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Toolbar: Asset & Timeframe Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Selecionar par de criptomoedas"
        >
          {CRYPTO_ASSETS.map((asset) => {
            const active = asset.symbol === selectedSymbol;
            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => onSelectSymbol(asset.symbol)}
                aria-pressed={active}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {asset.base}/USDT
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <span className="text-xs text-slate-500">
            {analysis ? analysis.sourceLabel : 'Carregando fonte...'}
          </span>

          <div
            className="flex items-center rounded-lg bg-slate-100 p-1 shrink-0"
            role="group"
            aria-label="Selecionar tempo gráfico"
          >
            {(['1h', '4h', '1d'] as Timeframe[]).map((tf) => {
              const active = tf === selectedTimeframe;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onSelectTimeframe(tf)}
                  aria-pressed={active}
                  className={`rounded-md px-3 py-1 text-xs font-semibold font-mono transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading Skeleton when switching without data */}
      {isLoading && !analysis ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-[460px] animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-8" />
          <div className="h-[460px] animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-4" />
        </div>
      ) : analysis ? (
        <>
          {/* Primary Metric Strip */}
          <section
            aria-label="Resumo quantitativo do ativo"
            className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3 lg:grid-cols-6"
          >
            <div>
              <div className="text-xs text-slate-500">
                {analysis.asset.name} · {analysis.asset.pair}
              </div>
              <div
                data-testid="current-price"
                className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900"
              >
                ${formatPrice(analysis.currentPrice)}
              </div>
              <div
                className={`mt-0.5 inline-flex items-center gap-1 text-xs font-mono tabular-nums font-medium ${
                  analysis.change24hPct >= 0 ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {analysis.change24hPct >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>
                  {analysis.change24hPct >= 0 ? '+' : ''}
                  {analysis.change24hPct.toFixed(2)}% (24h)
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Regime de Mercado</div>
              <div
                data-testid="market-regime"
                className="mt-1 text-sm font-semibold text-slate-900"
              >
                {analysis.regime}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                Vol. 24h {formatCompactUsd(analysis.volume24hUsd)}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Viés Quantitativo</div>
              <div
                data-testid="signal-bias"
                className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${
                  analysis.bias === 'Compra Estatística'
                    ? 'text-green-700'
                    : analysis.bias === 'Venda Estatística'
                    ? 'text-red-600'
                    : 'text-amber-700'
                }`}
              >
                {analysis.bias === 'Compra Estatística' && (
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                )}
                {analysis.bias === 'Venda Estatística' && (
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                )}
                {analysis.bias === 'Neutro / Aguardar' && (
                  <Minus className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{analysis.bias}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                Confluência: {analysis.confluenceScore >= 0 ? '+' : ''}
                {analysis.confluenceScore}/100
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Z-Score (20p)</div>
              <div
                data-testid="zscore-value"
                className={`mt-1 text-xl font-bold font-mono tabular-nums ${
                  analysis.zScore <= -1.5
                    ? 'text-green-700'
                    : analysis.zScore >= 1.5
                    ? 'text-red-600'
                    : 'text-slate-900'
                }`}
              >
                {analysis.zScore >= 0 ? '+' : ''}
                {analysis.zScore.toFixed(2)}σ
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {Math.abs(analysis.zScore) >= 1.5
                  ? 'Desvio estatístico elevado'
                  : 'Equilíbrio na banda normal'}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">RSI (14) · RVOL</div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
                {analysis.rsi14.toFixed(1)}
              </div>
              <div className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                Volume Relativo: {analysis.rvol.toFixed(2)}x
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">Backtest da Janela</div>
              <div className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
                {analysis.backtest.winRatePct.toFixed(1)}% acerto
              </div>
              <div className="mt-0.5 text-xs font-mono tabular-nums text-slate-500">
                Sharpe {analysis.backtest.sharpeRatio.toFixed(2)} · PF{' '}
                {analysis.backtest.profitFactor.toFixed(2)}
              </div>
            </div>
          </section>

          {/* Main 2-Column Analytical Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Chart + Kelly Risk Calculator */}
            <div className="space-y-6 lg:col-span-8">
              <CandlestickChart
                candles={analysis.candles}
                levels={analysis.levels}
                pair={analysis.asset.pair}
              />

              <RiskCalculator analysis={analysis} />
            </div>

            {/* Right Column: Auditable 5-Factor Decomposition & Backtest Summary */}
            <aside className="space-y-6 lg:col-span-4">
              <section
                aria-labelledby="factors-heading"
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 id="factors-heading" className="text-base font-semibold text-slate-900">
                      Decomposição Quantitativa
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Soma auditável dos 5 sinais matemáticos (-100 a +100).
                    </p>
                  </div>
                  <span
                    className={`text-lg font-bold font-mono tabular-nums ${
                      analysis.confluenceScore >= 22
                        ? 'text-green-700'
                        : analysis.confluenceScore <= -22
                        ? 'text-red-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {analysis.confluenceScore >= 0 ? '+' : ''}
                    {analysis.confluenceScore}
                  </span>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {analysis.factors.map((factor) => {
                    const pct = Math.min(100, (Math.abs(factor.score) / factor.maxAbs) * 100);
                    return (
                      <div key={factor.id} className="py-3 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-900">{factor.label}</span>
                          <span className="font-mono tabular-nums text-slate-700">
                            {factor.valueDisplay} ·{' '}
                            <strong
                              className={
                                factor.score > 0
                                  ? 'text-green-700'
                                  : factor.score < 0
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                              }
                            >
                              {factor.score > 0 ? '+' : ''}
                              {factor.score}
                            </strong>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full transition-all duration-200 ${
                              factor.score > 0
                                ? 'bg-green-600'
                                : factor.score < 0
                                ? 'bg-red-600'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.max(4, pct)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                          {factor.interpretation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Backtest & Wisdom Summary */}
              <section
                aria-labelledby="simons-summary-heading"
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <h2
                  id="simons-summary-heading"
                  className="text-base font-semibold text-slate-900"
                >
                  Disciplina Estatística (Jim Simons)
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  O fundo Medallion gerou 66% ao ano bruto ignorando palpites e operando apenas
                  vantagens estatísticas repetíveis com controle rigoroso de drawdown.
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                  <div>
                    <dt className="text-slate-500">Retorno Backtest</dt>
                    <dd
                      className={`mt-0.5 text-sm font-bold font-mono tabular-nums ${
                        analysis.backtest.totalReturnPct >= 0
                          ? 'text-green-700'
                          : 'text-red-600'
                      }`}
                    >
                      {analysis.backtest.totalReturnPct >= 0 ? '+' : ''}
                      {analysis.backtest.totalReturnPct.toFixed(2)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Drawdown Máximo</dt>
                    <dd className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900">
                      -{analysis.backtest.maxDrawdownPct.toFixed(2)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Sinais Testados</dt>
                    <dd className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900">
                      {analysis.backtest.totalTrades} operações
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Fator de Lucro</dt>
                    <dd className="mt-0.5 text-sm font-bold font-mono tabular-nums text-slate-900">
                      {analysis.backtest.profitFactor.toFixed(2)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('backtest')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    Ver Backtest Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('method')}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
                  >
                    Por que Jim Simons?
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
