export type Timeframe = '1h' | '4h' | '1d';

export type MarketRegime =
  | 'Tendência de Alta'
  | 'Tendência de Baixa'
  | 'Reversão à Média'
  | 'Alta Volatilidade';

export type SignalBias = 'Compra Estatística' | 'Venda Estatística' | 'Neutro / Aguardar';

export interface Candle {
  time: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoAssetMeta {
  symbol: string; // e.g. 'BTCUSDT'
  pair: string;   // e.g. 'BTC/USDT'
  name: string;
  base: string;
}

export interface FactorScore {
  id: string;
  label: string;
  valueDisplay: string;
  score: number; // -25 to +25 or -20 to +20
  maxAbs: number;
  interpretation: string;
}

export interface TradeLevels {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  atr: number;
  atrPercent: number;
  riskRewardRatio: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  reason: string;
}

export interface EquityPoint {
  time: number;
  equity: number; // starting at 100
  drawdownPct: number;
}

export interface BacktestSummary {
  totalTrades: number;
  winRatePct: number;
  profitFactor: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  avgWinPct: number;
  avgLossPct: number;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
}

export interface EnrichedCandle extends Candle {
  ema20: number | null;
  ema50: number | null;
  zScore: number | null;
  rsi14: number | null;
}

export interface QuantAnalysisResult {
  asset: CryptoAssetMeta;
  timeframe: Timeframe;
  source: 'live' | 'calibrated';
  sourceLabel: string;
  updatedAt: number;
  currentPrice: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24hUsd: number;
  regime: MarketRegime;
  bias: SignalBias;
  confluenceScore: number; // -100 to +100
  zScore: number;
  rsi14: number;
  macdHistogram: number;
  rvol: number;
  ema20: number;
  ema50: number;
  ema200: number | null;
  factors: FactorScore[];
  levels: TradeLevels;
  backtest: BacktestSummary;
  candles: EnrichedCandle[];
}

export interface ScannerRow {
  asset: CryptoAssetMeta;
  currentPrice: number;
  change24hPct: number;
  regime: MarketRegime;
  bias: SignalBias;
  confluenceScore: number;
  zScore: number;
  rsi14: number;
  rvol: number;
  atrPercent: number;
  winRatePct: number;
  source: 'live' | 'calibrated';
}

export interface KellySizingInput {
  capitalUsd: number;
  riskPerTradePct: number;
  winRatePct: number;
  rewardToRisk: number;
  entryPrice: number;
  stopPrice: number;
}

export interface KellySizingOutput {
  fullKellyPct: number;
  halfKellyPct: number;
  recommendedRiskPct: number;
  positionValueUsd: number;
  positionUnits: number;
  maxLossUsd: number;
  stopDistancePct: number;
  expectancyPerDollar: number;
}
