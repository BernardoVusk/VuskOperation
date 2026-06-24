import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  LineChart,
  Megaphone,
  Layers,
  Image,
  Target,
  Wallet,
  Webhook,
  ShoppingCart,
  Package,
  GitBranch,
  Workflow,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { AdsAccounts } from "./AdsAccounts";
import { AdsCampaigns } from "./AdsCampaigns";
import { AdsAdSets } from "./AdsAdSets";
import { AdsAds } from "./AdsAds";
import { AdsProducts } from "./AdsProducts";
import { useFacebookAuth } from "../../hooks/useFacebookAuth";
import { useAdsData } from "../../hooks/useAdsData";
import { useOperator } from "../../contexts/OperatorContext";

type AdsSubTab =
  | "dashboard"
  | "analytics"
  | "campanhas"
  | "conjuntos"
  | "anuncios"
  | "pixels"
  | "contas"
  | "capi"
  | "vendas"
  | "produtos"
  | "funis"
  | "atribuicao"
  | "eventos";

interface AdsSubTabDef {
  id: AdsSubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  render: () => React.ReactNode;
}

interface AdsSubTabGroup {
  title: string;
  tabs: AdsSubTabDef[];
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
      <span className="text-[10px] text-ink-tertiary font-mono tracking-wider font-semibold uppercase">
        {label}
      </span>
      <div>Em construção</div>
    </div>
  );
}

// Mapa de sub-abas: cada entrada é fácil de completar nas próximas tasks
// (basta substituir o `render` pelo componente real, ex: render: () => <AdsDashboardPanel />).
const SUB_TAB_GROUPS: AdsSubTabGroup[] = [
  {
    title: "Visão",
    tabs: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, render: () => <Placeholder label="Dashboard" /> },
      { id: "analytics", label: "Analytics", icon: LineChart, render: () => <Placeholder label="Analytics" /> }
    ]
  },
  {
    title: "Meta",
    tabs: [
      { id: "campanhas", label: "Campanhas", icon: Megaphone, render: () => <AdsCampaigns /> },
      { id: "conjuntos", label: "Conjuntos", icon: Layers, render: () => <AdsAdSets /> },
      { id: "anuncios", label: "Anúncios", icon: Image, render: () => <AdsAds /> },
      { id: "pixels", label: "Pixels", icon: Target, render: () => <Placeholder label="Pixels" /> },
      { id: "contas", label: "Contas de Ads", icon: Wallet, render: () => <AdsAccounts /> },
      { id: "capi", label: "Meta CAPI", icon: Webhook, render: () => <Placeholder label="Meta CAPI" /> }
    ]
  },
  {
    title: "Vendas",
    tabs: [
      { id: "vendas", label: "Vendas", icon: ShoppingCart, render: () => <Placeholder label="Vendas" /> },
      { id: "produtos", label: "Produtos", icon: Package, render: () => <AdsProducts /> },
      { id: "funis", label: "Funis", icon: GitBranch, render: () => <Placeholder label="Funis" /> },
      { id: "atribuicao", label: "Atribuição", icon: Workflow, render: () => <Placeholder label="Atribuição" /> },
      { id: "eventos", label: "Eventos", icon: Activity, render: () => <Placeholder label="Eventos" /> }
    ]
  }
];

interface DefaultAdAccount {
  fb_account_id: string;
}

export function AdsModule() {
  const [adsSubTab, setAdsSubTab] = useState<AdsSubTab>("dashboard");

  const activeDef = SUB_TAB_GROUPS.flatMap((g) => g.tabs).find((t) => t.id === adsSubTab);

  const operator = useOperator();
  const { authState } = useFacebookAuth();
  const { useAdsTable } = useAdsData();
  const accountsTable = useAdsTable<DefaultAdAccount>("ad_accounts");

  const [defaultAccountId, setDefaultAccountId] = useState<string | null>(null);
  const [isCheckingDefault, setIsCheckingDefault] = useState(true);
  const [isSyncingInsights, setIsSyncingInsights] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Resolve a conta de anúncios padrão do operador (Task 5) para saber qual conta sincronizar.
  useEffect(() => {
    let active = true;
    setIsCheckingDefault(true);
    accountsTable
      .list("fb_account_id", (q) => q.eq("is_default", true).limit(1))
      .then((res) => {
        if (!active) return;
        if (res.success && res.data.length > 0) {
          setDefaultAccountId(res.data[0].fb_account_id);
        } else {
          setDefaultAccountId(null);
        }
      })
      .finally(() => {
        if (active) setIsCheckingDefault(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSyncInsights = useCallback(async () => {
    if (!authState.accessToken || !defaultAccountId) return;
    setIsSyncingInsights(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await fetch("/api/ads/sync-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: authState.accessToken,
          fbAccountId: defaultAccountId,
          operator
        })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao sincronizar insights.");
      }
      setSyncResult(`${data.upserted} linha${data.upserted === 1 ? "" : "s"} sincronizada${data.upserted === 1 ? "" : "s"}.`);
    } catch (err: any) {
      setSyncError(err.message || "Erro de rede ao sincronizar insights.");
    } finally {
      setIsSyncingInsights(false);
    }
  }, [authState.accessToken, defaultAccountId, operator]);

  const syncDisabledReason = !authState.accessToken
    ? "Conecte o Facebook primeiro."
    : isCheckingDefault
    ? "Verificando conta padrão..."
    : !defaultAccountId
    ? 'Defina uma conta de anúncios padrão na aba "Contas de Ads" primeiro.'
    : null;

  return (
    <div className="space-y-6 animate-fade-in mac-fade-in">
      {/* Header da Seção */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none pb-4 border-b border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              TRACKING & ROAS
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
            Anúncios
          </h2>
          <p className="text-xs text-ink-secondary max-w-xl font-semibold mt-0.5">
            Campanhas, vendas e atribuição em um só lugar.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={handleSyncInsights}
            disabled={!!syncDisabledReason || isSyncingInsights}
            title={syncDisabledReason || undefined}
            className="px-3.5 py-2 bg-primary hover:bg-red-650 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingInsights ? "animate-spin" : ""}`} />
            Sincronizar agora
          </button>
          {syncDisabledReason && !isSyncingInsights && (
            <span className="text-[10px] text-ink-tertiary font-semibold max-w-[220px] text-right">
              {syncDisabledReason}
            </span>
          )}
          {syncResult && (
            <span className="text-[10px] text-systemGreen font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {syncResult}
            </span>
          )}
          {syncError && (
            <span className="text-[10px] text-systemRed font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {syncError}
            </span>
          )}
        </div>
      </div>

      {/* Sub-tabs agrupadas, scroll horizontal no mobile */}
      <div className="flex flex-col gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
        <div className="flex items-center gap-4 min-w-max">
          {SUB_TAB_GROUPS.map((group, gIdx) => (
            <div key={group.title} className="flex items-center gap-1.5 shrink-0">
              {gIdx > 0 && <div className="w-px h-5 bg-white/[0.08] mx-1.5" />}
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-tertiary font-mono mr-1 select-none">
                {group.title}
              </span>
              {group.tabs.map((tab) => {
                const TabIcon = tab.icon;
                const isSelected = adsSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAdsSubTab(tab.id)}
                    className={`px-3 py-1.5 rounded-mac-sm text-[10.5px] font-sans font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none border whitespace-nowrap shrink-0 ${
                      isSelected
                        ? "bg-primary/15 border-primary/25 text-white shadow-[0_0_20px_rgba(255,69,58,0.15)]"
                        : "text-ink-secondary border-transparent hover:text-white hover:bg-white/[0.05] hover:border-white/5"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo da sub-aba ativa */}
      <div>{activeDef?.render()}</div>
    </div>
  );
}
