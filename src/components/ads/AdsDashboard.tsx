import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  AlertCircle,
  DollarSign,
  Wallet,
  TrendingUp,
  ShoppingBag,
  Percent,
  Package
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { useOperator } from "../../contexts/OperatorContext";

interface SeriesPoint {
  date: string;
  spend: number;
  revenue: number;
}

interface DashboardTotals {
  revenue: number;
  spend: number;
  roas: number | null;
  aov: number | null;
  profit: number;
  salesCount: number;
}

interface ProductRevenue {
  product: string;
  revenue: number;
}

const PERIOD_PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "14 dias", days: 14 },
  { label: "30 dias", days: 30 }
];

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

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

// --- Seletor de período ----------------------------------------------------

interface PeriodSelectorProps {
  from: string;
  to: string;
  onPresetClick: (days: number) => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

function PeriodSelector({ from, to, onPresetClick, onFromChange, onToChange }: PeriodSelectorProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="flex items-center gap-1.5">
        {PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => onPresetClick(preset.days)}
            className="px-3 py-1.5 rounded-mac-sm text-[10.5px] font-sans font-bold tracking-wide transition-all duration-200 cursor-pointer select-none border whitespace-nowrap text-ink-secondary border-transparent hover:text-white hover:bg-white/[0.05] hover:border-white/5"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="mac-input px-2 py-2 rounded-mac-sm text-[11px] font-sans outline-none"
        />
        <span className="text-ink-tertiary text-[11px]">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="mac-input px-2 py-2 rounded-mac-sm text-[11px] font-sans outline-none"
        />
      </div>
    </div>
  );
}

// --- Cards de KPI ------------------------------------------------------------

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accentClassName: string;
}

function KpiCard({ icon: Icon, label, value, accentClassName }: KpiCardProps) {
  return (
    <div className="mac-card rounded-mac-lg p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-ink-tertiary">
        <Icon className={`w-3.5 h-3.5 ${accentClassName}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">{label}</span>
      </div>
      <p className="text-lg font-bold text-white font-mono truncate">{value}</p>
    </div>
  );
}

function KpiCards({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard icon={DollarSign} label="Receita" value={formatAmount(totals.revenue)} accentClassName="text-systemGreen" />
      <KpiCard icon={Wallet} label="Gasto" value={formatAmount(totals.spend)} accentClassName="text-primary" />
      <KpiCard icon={TrendingUp} label="ROAS" value={formatRoas(totals.roas)} accentClassName="text-systemBlue" />
      <KpiCard icon={Percent} label="AOV" value={formatAmount(totals.aov)} accentClassName="text-systemPurple" />
      <KpiCard icon={ShoppingBag} label="Lucro" value={formatAmount(totals.profit)} accentClassName="text-systemGreen" />
      <KpiCard icon={Package} label="Nº de vendas" value={String(totals.salesCount)} accentClassName="text-ink-secondary" />
    </div>
  );
}

// --- Gráficos ----------------------------------------------------------------

function RevenueSpendChart({ series }: { series: SeriesPoint[] }) {
  return (
    <div className="mac-card rounded-mac-lg p-4 space-y-3">
      <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
        Receita × Gasto
      </span>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: "rgba(245,245,247,0.32)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(245,245,247,0.32)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: "#1c1c20", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
            labelStyle={{ color: "#F5F5F7" }}
            labelFormatter={formatDateLabel}
            formatter={(value: number, name: string) => [formatAmount(value), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="revenue" name="Receita" stroke="#30D158" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="spend" name="Gasto" stroke="#FF453A" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function RoasChart({ series }: { series: SeriesPoint[] }) {
  const roasSeries = useMemo(
    () => series.map((point) => ({ date: point.date, roas: point.spend > 0 ? point.revenue / point.spend : null })),
    [series]
  );

  return (
    <div className="mac-card rounded-mac-lg p-4 space-y-3">
      <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
        ROAS no período
      </span>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={roasSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="roasGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fill: "rgba(245,245,247,0.32)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(245,245,247,0.32)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{ background: "#1c1c20", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
            labelStyle={{ color: "#F5F5F7" }}
            labelFormatter={formatDateLabel}
            formatter={(value: number) => [formatRoas(value), "ROAS"]}
          />
          <Area
            type="monotone"
            dataKey="roas"
            name="ROAS"
            stroke="#0A84FF"
            strokeWidth={2}
            fill="url(#roasGradient)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProductRevenueChart({ byProduct }: { byProduct: ProductRevenue[] }) {
  return (
    <div className="mac-card rounded-mac-lg p-4 space-y-3">
      <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
        Receita por produto
      </span>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={byProduct} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="product"
            tick={{ fill: "rgba(245,245,247,0.32)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(245,245,247,0.32)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
            width={70}
          />
          <Tooltip
            contentStyle={{ background: "#1c1c20", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
            labelStyle={{ color: "#F5F5F7" }}
            formatter={(value: number) => [formatAmount(value), "Receita"]}
          />
          <Bar dataKey="revenue" name="Receita" fill="#FF453A" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Componente principal ----------------------------------------------------

export function AdsDashboard() {
  const operator = useOperator();

  const [to, setTo] = useState(() => toDateInputValue(new Date()));
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 13);
    return toDateInputValue(d);
  });

  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [totals, setTotals] = useState<DashboardTotals>({
    revenue: 0,
    spend: 0,
    roas: null,
    aov: null,
    profit: 0,
    salesCount: 0
  });
  const [byProduct, setByProduct] = useState<ProductRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ operator, from, to });
      const res = await fetch(`/api/ads/dashboard?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao buscar dados do dashboard.");
      }
      setSeries(data.series || []);
      setTotals(
        data.totals || { revenue: 0, spend: 0, roas: null, aov: null, profit: 0, salesCount: 0 }
      );
      setByProduct(data.byProduct || []);
    } catch (err: any) {
      setError(err.message || "Erro de rede ao buscar dados do dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [operator, from, to]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handlePresetClick = useCallback((days: number) => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
    setTo(toDateInputValue(toDate));
    setFrom(toDateInputValue(fromDate));
  }, []);

  const hasData = totals.salesCount > 0 || series.some((point) => point.spend > 0 || point.revenue > 0);

  return (
    <div className="space-y-4">
      <PeriodSelector
        from={from}
        to={to}
        onPresetClick={handlePresetClick}
        onFromChange={setFrom}
        onToChange={setTo}
      />

      {error && (
        <div className="flex items-center gap-2.5 text-systemRed text-xs bg-systemRed/10 border border-systemRed/25 rounded-mac-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="mac-card rounded-mac-lg p-12 flex items-center justify-center text-ink-tertiary text-xs font-sans">
          Carregando dashboard...
        </div>
      ) : !hasData ? (
        <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
          <LayoutDashboard className="w-6 h-6 text-ink-tertiary" />
          <span className="text-xs text-ink-secondary font-sans font-semibold">
            Sem dados ainda para este período. Sincronize insights e registre vendas para ver o dashboard.
          </span>
        </div>
      ) : (
        <>
          <KpiCards totals={totals} />
          <RevenueSpendChart series={series} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RoasChart series={series} />
            <ProductRevenueChart byProduct={byProduct} />
          </div>
        </>
      )}
    </div>
  );
}
