import { ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { MarketRegime, ScannerRow, Timeframe } from '../types/quant';
import { formatPrice } from '../utils/quantEngine';

interface MarketScannerProps {
  rows: ScannerRow[];
  timeframe: Timeframe;
  isLoading: boolean;
  onSelectTimeframe: (tf: Timeframe) => void;
  onInspectAsset: (symbol: string) => void;
}

const REGIMES: ('Todos' | MarketRegime)[] = [
  'Todos',
  'Tendência de Alta',
  'Reversão à Média',
  'Tendência de Baixa',
  'Alta Volatilidade',
];

export function MarketScanner({
  rows,
  timeframe,
  isLoading,
  onSelectTimeframe,
  onInspectAsset,
}: MarketScannerProps) {
  const [query, setQuery] = useState('');
  const [regimeFilter, setRegimeFilter] = useState<'Todos' | MarketRegime>('Todos');
  const [sortBy, setSortBy] = useState<'confluence' | 'zscore' | 'change'>('confluence');

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (regimeFilter !== 'Todos' && r.regime !== regimeFilter) return false;
        if (!q) return true;
        return (
          r.asset.pair.toLowerCase().includes(q) ||
          r.asset.name.toLowerCase().includes(q) ||
          r.asset.base.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'confluence') {
          return Math.abs(b.confluenceScore) - Math.abs(a.confluenceScore);
        }
        if (sortBy === 'zscore') {
          return Math.abs(b.zScore) - Math.abs(a.zScore);
        }
        return b.change24hPct - a.change24hPct;
      });
  }, [rows, query, regimeFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Scanner Quantitativo Multi-Ativos
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Classificação automática de regime, desvios Z-Score e confluência estatística nos
              principais pares líquidos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <label htmlFor="scanner-search" className="sr-only">
                Buscar ativo
              </label>
              <input
                id="scanner-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar BTC, SOL, ETH..."
                className="w-52 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex items-center rounded-lg bg-slate-100 p-1">
              {(['1h', '4h', '1d'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onSelectTimeframe(tf)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold font-mono transition-colors ${
                    timeframe === tf
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Regime filter + sort controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {REGIMES.map((regime) => (
              <button
                key={regime}
                type="button"
                onClick={() => setRegimeFilter(regime)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  regimeFilter === regime
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {regime}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="scanner-sort" className="text-slate-500">
              Ordenar por:
            </label>
            <select
              id="scanner-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="confluence">Maior Confluência Absoluta</option>
              <option value="zscore">Maior Desvio Z-Score</option>
              <option value="change">Variação 24h</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-4 overflow-x-auto">
          {isLoading && rows.length === 0 ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-11 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-medium text-slate-700">
                Nenhum ativo corresponde ao filtro selecionado.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setRegimeFilter('Todos');
                }}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-medium">Ativo</th>
                  <th className="py-2.5 px-3 text-right font-medium">Preço</th>
                  <th className="py-2.5 px-3 text-right font-medium">Var. 24h</th>
                  <th className="py-2.5 px-3 font-medium">Regime</th>
                  <th className="py-2.5 px-3 text-right font-medium">Z-Score</th>
                  <th className="py-2.5 px-3 text-right font-medium">RSI (14)</th>
                  <th className="py-2.5 px-3 text-right font-medium">RVOL</th>
                  <th className="py-2.5 px-3 text-right font-medium">Confluência</th>
                  <th className="py-2.5 px-3 font-medium">Viés</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.asset.symbol}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{row.asset.pair}</div>
                      <div className="text-[11px] text-slate-500">{row.asset.name}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-slate-900">
                      ${formatPrice(row.currentPrice)}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums font-medium ${
                        row.change24hPct >= 0 ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      {row.change24hPct >= 0 ? '+' : ''}
                      {row.change24hPct.toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {row.regime}
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                        row.zScore <= -1.5
                          ? 'text-green-700'
                          : row.zScore >= 1.5
                          ? 'text-red-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {row.zScore >= 0 ? '+' : ''}
                      {row.zScore.toFixed(2)}σ
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {row.rsi14.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                      {row.rvol.toFixed(2)}x
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono tabular-nums font-bold ${
                        row.confluenceScore >= 22
                          ? 'text-green-700'
                          : row.confluenceScore <= -22
                          ? 'text-red-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {row.confluenceScore >= 0 ? '+' : ''}
                      {row.confluenceScore}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          row.bias === 'Compra Estatística'
                            ? 'text-green-700'
                            : row.bias === 'Venda Estatística'
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {row.bias === 'Compra Estatística' && (
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {row.bias === 'Venda Estatística' && (
                          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{row.bias}</span>
                      </span>
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onInspectAsset(row.asset.symbol)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-900 hover:text-white whitespace-nowrap"
                      >
                        Analisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
