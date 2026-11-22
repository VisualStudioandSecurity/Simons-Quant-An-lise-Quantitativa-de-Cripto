interface SimonsMethodViewProps {
  onBackToPanel: () => void;
}

const TRADER_COMPARISON = [
  {
    name: 'Jim Simons (Fundo Medallion)',
    style: 'Trading Quantitativo & Arbitragem Estatística',
    cagr: '~66% bruto / ~39% líquido ao ano',
    horizon: '1988 – 2018 (30 anos)',
    verdict: 'Maior retorno anualizado composto da história financeira',
  },
  {
    name: 'Stanley Druckenmiller',
    style: 'Macro Discricionário & Assimetria de Liquidez',
    cagr: '~30% ao ano (sem nenhum ano negativo)',
    horizon: '1981 – 2010',
    verdict: 'Referência máxima em macro discricionário',
  },
  {
    name: 'George Soros (Quantum Fund)',
    style: 'Macro Global & Teoria da Reflexividade',
    cagr: '~30% ao ano',
    horizon: '1969 – 2000',
    verdict: 'Pioneiro em reflexividade de mercados',
  },
  {
    name: 'Paul Tudor Jones',
    style: 'Tendência & Gestão de Risco Assimétrica (5:1)',
    cagr: '~19% a ~26% ao ano',
    horizon: '1980 – presente',
    verdict: 'Mestre em proteção de capital e reversões',
  },
  {
    name: 'Warren Buffett (Berkshire)',
    style: 'Investimento em Valor de Longo Prazo (Buy & Hold)',
    cagr: '~19,8% ao ano',
    horizon: '1965 – 2023',
    verdict: 'Maior investidor de valor (não é trader de curto prazo)',
  },
];

const PRINCIPLES = [
  {
    title: '01. Não Preveja Narrativas — Meça Regimes e Probabilidades',
    wisdom:
      'Simons proibiu opiniões subjetivas e previsões macro na Renaissance. Modelos identificam matematicamente se o mercado está em tendência direcional, reversão à média ou alta volatilidade antes de operar.',
    implementation:
      'No Painel Quant, cruzamos EMA 20/50/200 e mediana do ATR% para classificar o regime atual automaticamente.',
  },
  {
    title: '02. Explore Ineficiências de Reversão à Média (Z-Score)',
    wisdom:
      'Criptomoedas sofrem exageros emocionais constantes de varejo e liquidações em cascata. Quando o preço se afasta mais de 2 desvios padrão da média recente, a probabilidade estatística de retorno elástico cresce.',
    implementation:
      'Calculamos o Z-Score de 20 períodos em tempo real no subgráfico inferior e na pontuação de confluência.',
  },
  {
    title: '03. Pequenas Vantagens Repetidas Superam Grandes Apostas',
    wisdom:
      'O Fundo Medallion acertava cerca de 50,75% das operações, mas executava com disciplina matemática e expectativa positiva constante. A soma de múltiplos sinais não correlacionados gera consistência.',
    implementation:
      'Combinamos 5 fatores auditáveis (Estrutura EMA, Z-Score, RSI-14, Aceleração MACD e Volume Relativo) numa escala transparente de -100 a +100.',
  },
  {
    title: '04. Dimensionamento pelo Critério de Kelly Fracionado & Volatilidade',
    wisdom:
      'Mesmo um sistema vencedor quebra se a alavancagem for excessiva. Simons calibrava o tamanho da posição pela volatilidade do ativo e por frações conservadoras do Critério de Kelly.',
    implementation:
      'A Calculadora Half-Kelly ajusta o tamanho exato da sua posição em USDT com base no Stop Loss de 1,5x ATR e no seu teto de risco.',
  },
  {
    title: '05. Validação Histórica Rigorosa Antes de Arriscar Capital',
    wisdom:
      'Na Renaissance Technologies, nenhuma regra entrava em produção sem passar por backtest com custos de transação e análise de drawdown máximo.',
    implementation:
      'A aba Backtest executa a estratégia sobre os últimos 220 candles descontando 0,10% de taxa por ordem e exibindo Sharpe Ratio e Drawdown.',
  },
];

export function SimonsMethodView({ onBackToPanel }: SimonsMethodViewProps) {
  return (
    <div className="space-y-6">
      {/* Hero Answer */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-wide text-blue-700">
            Fundamento Histórico & Matemático
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance">
            Jim Simons: O Maior Trader da História Financeira
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Ao analisar o histórico auditado de todos os grandes operadores de mercado,{' '}
            <strong className="font-semibold text-slate-900">Jim Simons</strong> (matemático,
            ex-decifrador de códigos da NSA e fundador da Renaissance Technologies) ocupa o
            primeiro lugar com folga. Entre 1988 e 2018, seu Fundo Medallion entregou{' '}
            <strong className="font-semibold text-slate-900">
              ~66% de retorno bruto anualizado (~39% líquido após taxas)
            </strong>
            , superando em mais do dobro lendas como George Soros, Stanley Druckenmiller e Warren
            Buffett, com apenas um ano negativo em três décadas.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={onBackToPanel}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Aplicar Método no Painel Quant
            </button>
          </div>
        </div>
      </section>

      {/* Historical Benchmark Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Comparativo Histórico dos Maiores Operadores do Mundo
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Retorno anual composto (CAGR) e metodologia de geração de alfa.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Trader / Gestor</th>
                <th className="py-2.5 px-3 font-medium">Abordagem</th>
                <th className="py-2.5 px-3 font-medium">Retorno Anual (CAGR)</th>
                <th className="py-2.5 px-3 font-medium">Período</th>
                <th className="py-2.5 pl-3 pr-3 font-medium">Destaque Histórico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TRADER_COMPARISON.map((row, idx) => (
                <tr
                  key={row.name}
                  className={idx === 0 ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-700'}
                >
                  <td className="py-3 pr-4 font-semibold text-slate-900 whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="py-3 px-3">{row.style}</td>
                  <td className="py-3 px-3 font-mono tabular-nums font-semibold text-green-700 whitespace-nowrap">
                    {row.cagr}
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums whitespace-nowrap">
                    {row.horizon}
                  </td>
                  <td className="py-3 pl-3 pr-3 text-slate-600">{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5 Principles Mapped to Live Features */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Os 5 Pilares da Sabedoria de Jim Simons Aplicados a Criptomoedas
        </h2>
        <div className="mt-4 divide-y divide-slate-100">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="py-5 first:pt-2 last:pb-1">
              <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
              <div className="mt-2 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <p className="text-xs leading-relaxed text-slate-600">
                  <strong className="font-medium text-slate-800">Sabedoria Original: </strong>
                  {p.wisdom}
                </p>
                <p className="text-xs leading-relaxed text-slate-600">
                  <strong className="font-medium text-slate-800">Aplicação no App: </strong>
                  {p.implementation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
