import { useCallback, useEffect, useState } from 'react';
import { BacktestView } from './components/BacktestView';
import { MarketScanner } from './components/MarketScanner';
import { QuantPanel } from './components/QuantPanel';
import { SimonsMethodView } from './components/SimonsMethodView';
import { TopNav, type WorkspaceTab } from './components/TopNav';
import type { QuantAnalysisResult, ScannerRow, Timeframe } from './types/quant';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('panel');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('4h');

  const [analysis, setAnalysis] = useState<QuantAnalysisResult | null>(null);
  const [scannerRows, setScannerRows] = useState<ScannerRow[]>([]);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(true);
  const [isLoadingScanner, setIsLoadingScanner] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async (symbol: string, timeframe: Timeframe) => {
    setIsLoadingAnalysis(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/market/analysis?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(
          timeframe
        )}`
      );
      if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status} ao obter análise.`);
      }
      const data = (await res.json()) as QuantAnalysisResult;
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, []);

  const fetchScanner = useCallback(async (timeframe: Timeframe) => {
    setIsLoadingScanner(true);
    try {
      const res = await fetch(
        `/api/market/scanner?timeframe=${encodeURIComponent(timeframe)}`
      );
      if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status} ao carregar scanner.`);
      }
      const data = (await res.json()) as { rows: ScannerRow[] };
      setScannerRows(data.rows);
    } catch (err) {
      console.error('Scanner fetch error:', err);
    } finally {
      setIsLoadingScanner(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalysis(selectedSymbol, selectedTimeframe);
  }, [selectedSymbol, selectedTimeframe, fetchAnalysis]);

  useEffect(() => {
    if (activeTab === 'scanner') {
      void fetchScanner(selectedTimeframe);
    }
  }, [activeTab, selectedTimeframe, fetchScanner]);

  const handleRefresh = () => {
    void fetchAnalysis(selectedSymbol, selectedTimeframe);
    if (activeTab === 'scanner') {
      void fetchScanner(selectedTimeframe);
    }
  };

  const handleInspectFromScanner = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('panel');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isLoadingAnalysis || isLoadingScanner}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'panel' && (
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
                Análise Quantitativa de Cripto · Método Jim Simons
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Baseado no maior trader da história (Fundo Medallion, ~66% bruto/ano): detecção de
                regime, reversão à média por Z-Score e gestão de risco Half-Kelly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('method')}
              className="self-start text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0 sm:self-auto"
            >
              Entender por que Jim Simons é o nº 1 →
            </button>
          </div>
        )}

        {activeTab === 'panel' && (
          <QuantPanel
            analysis={analysis}
            selectedSymbol={selectedSymbol}
            selectedTimeframe={selectedTimeframe}
            isLoading={isLoadingAnalysis}
            error={error}
            onSelectSymbol={setSelectedSymbol}
            onSelectTimeframe={setSelectedTimeframe}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'scanner' && (
          <MarketScanner
            rows={scannerRows}
            timeframe={selectedTimeframe}
            isLoading={isLoadingScanner}
            onSelectTimeframe={setSelectedTimeframe}
            onInspectAsset={handleInspectFromScanner}
          />
        )}

        {activeTab === 'backtest' && <BacktestView analysis={analysis} />}

        {activeTab === 'method' && (
          <SimonsMethodView onBackToPanel={() => setActiveTab('panel')} />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            Simons Quant · Ferramenta educacional de análise quantitativa inspirada na Renaissance
            Technologies.
          </span>
          <span>
            Análise estatística não constitui recomendação financeira individualizada.
          </span>
        </div>
      </footer>
    </div>
  );
}
