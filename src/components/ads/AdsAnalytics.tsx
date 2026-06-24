import React, { useState, useEffect, useCallback } from "react";
import { LineChart, AlertCircle, DollarSign, Wallet, TrendingUp, ShoppingBag, Megaphone, BarChart3 } from "lucide-react";
import { useOperator } from "../../contexts/OperatorContext";

interface PeriodTotals {
  revenue: number;
  spend: number;
  roas: number | null;
  aov: number | null;
  salesCount: number;
}

interface CampaignBreakdown {
  campaign: string;
  revenue: number;
  salesCount: number;
}

interface FunnelCount {
  eventName: string;
  count: number;
}

const EMPTY_TOTALS: PeriodTotals = { revenue: 0, spend: 0, roas: null, aov: null, salesCount: 0 };

const FUNNEL_LABELS: Record<string, string> = {
  PageView: "PageView",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "Purchase"
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

function formatRoas(roas: number | null | undefined): string {
  if (roas === null || roas === undefined || !Number.isFinite(roas)) return "—";
  return `${roas.toFixed(2)}x`;
}

// Variação % de A para B. Trata A=0 (divisão por zero) e ausência de dados em A renderizando
// "—"/"Novo" em vez de Infinity/NaN, mesma convenção de null-handling da Task 20 (ROAS/AOV).
function formatVariationPct(a: number, b: number): string {
  if (a === 0) {
    return b === 0 ? "—" : "Novo";
  }
  const pct = ((b - a) / a) * 100;
  if (!Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function variationTone(a: number, b: number): string {
  if (a === 0) return b === 0 ? "text-ink-tertiary" : "text-systemGreen";
  if (b > a) return "text-systemGreen";
  if (b < a) return "text-systemRed";
  return "text-ink-tertiary";
}

// --- Seletor de dois períodos ----------------------------------------------

interface PeriodRangeProps {
  label: string;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

function PeriodRangeInput({ label, from, to, onFromChange, onToChange }: PeriodRangeProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="mac-input px-2 py-2 rounded-mac-sm text-[11px] font-sans outline-none w-full"
        />
        <span className="text-ink-tertiary text-[11px]">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="mac-input px-2 py-2 rounded-mac-sm text-[11px] font-sans outline-none w-full"
        />
      </div>
    </div>
  );
}

// --- Cards de comparação -----------------------------------------------------

interface ComparisonCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  valueA: string;
  valueB: string;
  variation: string;
  variationToneClassName: string;
  accentClassName: string;
}

function ComparisonCard({
  icon: Icon,
  label,
  valueA,
  valueB,
  variation,
  variationToneClassName,
  accentClassName
}: ComparisonCardProps) {
  return (
    <div className="mac-card rounded-mac-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-ink-tertiary">
        <Icon className={`w-3.5 h-3.5 ${accentClassName}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[9px] font-mono text-ink-tertiary uppercase tracking-wider">A → B</p>
          <p className="text-sm font-bold text-white font-mono truncate">
            {valueA} <span className="text-ink-tertiary">→</span> {valueB}
          </p>
        </div>
        <span className={`text-xs font-bold font-mono shrink-0 ${variationToneClassName}`}>{variation}</span>
      </div>
    </div>
  );
}

function ComparisonCards({ periodA, periodB }: { periodA: PeriodTotals; periodB: PeriodTotals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <ComparisonCard
        icon={DollarSign}
        label="Receita"
        valueA={formatAmount(periodA.revenue)}
        valueB={formatAmount(periodB.revenue)}
        variation={formatVariationPct(periodA.revenue, periodB.revenue)}
        variationToneClassName={variationTone(periodA.revenue, periodB.revenue)}
        accentClassName="text-systemGreen"
      />
      <ComparisonCard
        icon={Wallet}
        label="Gasto"
        valueA={formatAmount(periodA.spend)}
        valueB={formatAmount(periodB.spend)}
        variation={formatVariationPct(periodA.spend, periodB.spend)}
        variationToneClassName={variationTone(periodA.spend, periodB.spend)}
        accentClassName="text-primary"
      />
      <ComparisonCard
        icon={TrendingUp}
        label="ROAS"
        valueA={formatRoas(periodA.roas)}
        valueB={formatRoas(periodB.roas)}
        variation={formatVariationPct(periodA.roas || 0, periodB.roas || 0)}
        variationToneClassName={variationTone(periodA.roas || 0, periodB.roas || 0)}
        accentClassName="text-systemBlue"
      />
      <ComparisonCard
        icon={ShoppingBag}
        label="Nº de vendas"
        valueA={String(periodA.salesCount)}
        valueB={String(periodB.salesCount)}
        variation={formatVariationPct(periodA.salesCount, periodB.salesCount)}
        variationToneClassName={variationTone(periodA.salesCount, periodB.salesCount)}
        accentClassName="text-ink-secondary"
      />
    </div>
  );
}

// --- Breakdown por UTM campaign ----------------------------------------------

function CampaignBreakdownTable({ byCampaign }: { byCampaign: CampaignBreakdown[] }) {
  if (byCampaign.length === 0) {
    return (
      <div className="mac-card rounded-mac-lg p-8 flex flex-col items-center justify-center text-center gap-2 select-none">
        <Megaphone className="w-5 h-5 text-ink-tertiary" />
        <span className="text-xs text-ink-secondary font-sans font-semibold">
          Nenhuma venda no período B para detalhar por campanha (UTM).
        </span>
      </div>
    );
  }

  return (
    <div className="mac-card rounded-mac-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-hairline">
        <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
          Receita por UTM Campaign (período B)
        </span>
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left border-collapse font-sans text-xs">
          <thead>
            <tr className="bg-surface-raised border-b border-hairline text-[10px] text-ink-tertiary font-bold uppercase tracking-widest font-mono">
              <th className="px-4 py-3">Campanha (UTM)</th>
              <th className="px-4 py-3 text-right">Receita</th>
              <th className="px-4 py-3 text-right">Vendas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-ink-secondary">
            {byCampaign.map((row) => (
              <tr key={row.campaign} className="hover:bg-surface-raised/50 transition-all">
                <td className="px-4 py-3 font-bold text-white truncate max-w-xs">{row.campaign}</td>
                <td className="px-4 py-3 text-right font-mono">{formatAmount(row.revenue)}</td>
                <td className="px-4 py-3 text-right font-mono">{row.salesCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="block md:hidden divide-y divide-hairline">
        {byCampaign.map((row) => (
          <div key={row.campaign} className="p-4 space-y-1.5">
            <p className="text-xs font-bold text-white truncate">{row.campaign}</p>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary">
              <span>{formatAmount(row.revenue)}</span>
              <span>{row.salesCount} venda{row.salesCount === 1 ? "" : "s"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Funil PageView -> InitiateCheckout -> Purchase --------------------------

function ConversionFunnel({ funnel }: { funnel: FunnelCount[] }) {
  const hasAnyData = funnel.some((step) => step.count > 0);
  const firstCount = funnel[0]?.count || 0;
  const maxCount = Math.max(...funnel.map((s) => s.count), 1);

  return (
    <div className="mac-card rounded-mac-lg p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
          Funil PageView → InitiateCheckout → Purchase (período B)
        </span>
      </div>

      {!hasAnyData ? (
        <div className="py-6 flex flex-col items-center justify-center text-center gap-2 select-none">
          <span className="text-xs text-ink-secondary font-sans font-semibold">
            Nenhum evento registrado ainda no período B para este funil.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {funnel.map((step, idx) => {
            const pctOfFirst = firstCount > 0 ? (step.count / firstCount) * 100 : 0;
            const prevCount = idx > 0 ? funnel[idx - 1].count : null;
            const pctOfPrev = prevCount && prevCount > 0 ? (step.count / prevCount) * 100 : null;
            const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0;

            return (
              <div key={step.eventName} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-white truncate">
                    {idx + 1}. {FUNNEL_LABELS[step.eventName] || step.eventName}
                  </span>
                  <span className="font-mono text-ink-tertiary shrink-0">
                    {step.count.toLocaleString("pt-BR")}
                    {idx > 0 && (
                      <span className="ml-2 text-ink-secondary">
                        {pctOfPrev !== null ? `${pctOfPrev.toFixed(1)}% da etapa anterior` : "—"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500 transition-all"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono text-ink-tertiary">
                  {pctOfFirst.toFixed(1)}% da primeira etapa
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Componente principal ----------------------------------------------------

const DEFAULT_FUNNEL: FunnelCount[] = [
  { eventName: "PageView", count: 0 },
  { eventName: "InitiateCheckout", count: 0 },
  { eventName: "Purchase", count: 0 }
];

export function AdsAnalytics() {
  const operator = useOperator();

  // Período B (atual): últimos 14 dias por padrão. Período A (anterior): os 14 dias
  // imediatamente antes de B — ponto de partida razoável para uma comparação "esta
  // quinzena vs a anterior", ajustável pelo usuário nos dois seletores de data.
  const [periodBTo, setPeriodBTo] = useState(() => toDateInputValue(new Date()));
  const [periodBFrom, setPeriodBFrom] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 13);
    return toDateInputValue(d);
  });
  const [periodATo, setPeriodATo] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 14);
    return toDateInputValue(d);
  });
  const [periodAFrom, setPeriodAFrom] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 27);
    return toDateInputValue(d);
  });

  const [periodA, setPeriodA] = useState<PeriodTotals>(EMPTY_TOTALS);
  const [periodB, setPeriodB] = useState<PeriodTotals>(EMPTY_TOTALS);
  const [byCampaign, setByCampaign] = useState<CampaignBreakdown[]>([]);
  const [funnel, setFunnel] = useState<FunnelCount[]>(DEFAULT_FUNNEL);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        operator,
        periodA_from: periodAFrom,
        periodA_to: periodATo,
        periodB_from: periodBFrom,
        periodB_to: periodBTo
      });
      const res = await fetch(`/api/ads/analytics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao buscar dados de analytics.");
      }
      setPeriodA(data.periodA || EMPTY_TOTALS);
      setPeriodB(data.periodB || EMPTY_TOTALS);
      setByCampaign(data.byCampaign || []);
      setFunnel(data.funnel && data.funnel.length > 0 ? data.funnel : DEFAULT_FUNNEL);
    } catch (err: any) {
      setError(err.message || "Erro de rede ao buscar dados de analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [operator, periodAFrom, periodATo, periodBFrom, periodBTo]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const hasData =
    periodA.salesCount > 0 || periodB.salesCount > 0 || periodA.spend > 0 || periodB.spend > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PeriodRangeInput
          label="Período A (anterior)"
          from={periodAFrom}
          to={periodATo}
          onFromChange={setPeriodAFrom}
          onToChange={setPeriodATo}
        />
        <PeriodRangeInput
          label="Período B (atual)"
          from={periodBFrom}
          to={periodBTo}
          onFromChange={setPeriodBFrom}
          onToChange={setPeriodBTo}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-systemRed text-xs bg-systemRed/10 border border-systemRed/25 rounded-mac-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="mac-card rounded-mac-lg p-12 flex items-center justify-center text-ink-tertiary text-xs font-sans">
          Carregando analytics...
        </div>
      ) : !hasData ? (
        <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
          <LineChart className="w-6 h-6 text-ink-tertiary" />
          <span className="text-xs text-ink-secondary font-sans font-semibold">
            Sem dados ainda nos períodos selecionados. Sincronize insights e registre vendas para ver a comparação.
          </span>
        </div>
      ) : (
        <>
          <ComparisonCards periodA={periodA} periodB={periodB} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CampaignBreakdownTable byCampaign={byCampaign} />
            <ConversionFunnel funnel={funnel} />
          </div>
        </>
      )}
    </div>
  );
}
