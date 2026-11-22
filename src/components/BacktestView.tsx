import type { QuantAnalysisResult } from '../types/quant';
import { formatPrice } from '../utils/quantEngine';
import { EquityCurveChart } from './EquityCurveChart';

interface BacktestViewProps {
  analysis: QuantAnalysisResult | null;
}

export function BacktestView({ analysis }: BacktestViewProps) {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Carregando histórico de backtest...
      </div>
    );
  }

  const { backtest, asset, timeframe } = analysis;

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Header & KPI Strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Validação Histórica: {asset.pair} ({timeframe.toUpperCase()})
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              “Testamos todas as ideias contra décadas de dados antes de arriscar um dólar.” —
              Simulação com taxas de 0,10% por lado e stop dinâmico de 1,8x ATR.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {analysis.candles.length} candles analisados
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-xs text-slate-500">Retorno Líquido</dt>
            <dd
              className={`mt-1 text-xl font-bold font-mono tabular-nums ${
                backtest.totalReturnPct >= 0 ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {backtest.totalReturnPct >= 0 ? '+' : ''}
              {backtest.totalReturnPct.toFixed(2)}%
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">Taxa de Acerto</dt>
            <dd className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
              {backtest.winRatePct.toFixed(1)}%
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">Fator de Lucro</dt>
            <dd className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
              {backtest.profitFactor.toFixed(2)}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">Sharpe Anualizado</dt>
            <dd className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
              {backtest.sharpeRatio.toFixed(2)}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">Drawdown Máximo</dt>
            <dd className="mt-1 text-xl font-bold font-mono tabular-nums text-red-600">
              -{backtest.maxDrawdownPct.toFixed(2)}%
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">Operações Executadas</dt>
            <dd className="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">
              {backtest.totalTrades}
            </dd>
          </div>
        </dl>
      </div>

      {/* Equity Curve */}
      <EquityCurveChart points={backtest.equityCurve} />

      {/* Trade Ledger */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Registro de Sinais Históricos
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Média de ganho: +{backtest.avgWinPct.toFixed(2)}% · Média de perda: -
          {backtest.avgLossPct.toFixed(2)}%
        </p>

        {backtest.trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Nenhum sinal atingiu os limiares estatísticos de entrada nesta janela de tempo.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Entrada</th>
                  <th className="py-2 px-3 font-medium">Saída</th>
                  <th className="py-2 px-3 font-medium">Lado</th>
                  <th className="py-2 px-3 text-right font-medium">Preço Entrada</th>
                  <th className="py-2 px-3 text-right font-medium">Preço Saída</th>
                  <th className="py-2 px-3 text-right font-medium">Retorno Líq.</th>
                  <th className="py-2 pl-3 font-medium">Critério de Saída</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backtest.trades.map((trade, i) => (
                  <tr key={`${trade.entryTime}-${i}`} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDate(trade.entryTime)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatDate(trade.exitTime)}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-semibold ${
                        trade.side === 'LONG' ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {trade.side === 'LONG' ? 'Compra (Long)' : 'Venda (Short)'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                      ${formatPrice(trade.entryPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                      ${formatPrice(trade.exitPrice)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                        trade.returnPct >= 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {trade.returnPct >= 0 ? '+' : ''}
                      {trade.returnPct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 pl-3 text-slate-600 whitespace-nowrap">
                      {trade.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
