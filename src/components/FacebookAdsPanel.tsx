import React, { useState, useEffect } from "react";
import { 
  DollarSign, Eye, EyeOff, Radio, RefreshCw, AlertCircle, TrendingUp, Users, MousePointer, 
  BarChart2, ShieldCheck, HelpCircle, ChevronRight, ChevronDown, Flame, Search, SlidersHorizontal, Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFacebookAuth } from "../hooks/useFacebookAuth";
import { useOperator } from "../contexts/OperatorContext";

interface AccountInsights {
  spend: string;
  reach: string;
  impressions: string;
  inline_link_clicks: string;
  inline_link_click_ctr: string;
  cpm: string;
  cpc: string;
  actions?: Array<{ action_type: string; value: string }>;
  purchase_roas?: Array<{ action_type: string; value: string }>;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  insights?: {
    data: AccountInsights[];
  };
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  insights?: {
    data: Array<{
      spend: string;
      reach: string;
      ctr: string;
      cpc: string;
    }>;
  };
}

export function FacebookAdsPanel() {
  const operator = useOperator();
  const CREDENTIALS_KEY = `vusk_fb_credentials_${operator.toLowerCase()}`;
  const { authState, isConnecting, error: authError, login, logout } = useFacebookAuth();

  // Credentials & Filters states
  const [adAccountId, setAdAccountId] = useState("");
  const [datePreset, setDatePreset] = useState("last_7d");

  // Ad accounts list
  interface AdAccount {
    id: string;
    name: string;
    currency: string;
  }
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // API response states
  const [accountInsights, setAccountInsights] = useState<AccountInsights | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [adsets, setAdsets] = useState<Record<string, AdSet[]>>({});
  
  // Loading & Error states
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLoadingAdsets, setIsLoadingAdsets] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedAtLeastOnce, setHasLoadedAtLeastOnce] = useState(false);

  // Table manipulation states
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ACTIVE" | "PAUSED">("all");
  const [sortBy, setSortBy] = useState<"spend" | "ctr" | "results">("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const accessToken = authState.accessToken || "";

  // Set date preset from local credentials on mount
  useEffect(() => {
    const saved = localStorage.getItem(CREDENTIALS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.datePreset) {
          setDatePreset(parsed.datePreset);
        }
      } catch (e) {
        console.error("Erro ao carregar pré-configuração local", e);
      }
    }
  }, [CREDENTIALS_KEY]);

  // Fetch ad accounts automatically when connected
  useEffect(() => {
    if (authState.isConnected && authState.accessToken) {
      setIsLoadingAccounts(true);
      setError(null);
      fetch(`/.netlify/functions/facebook-ad-accounts?accessToken=${encodeURIComponent(authState.accessToken)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setAdAccounts(data.accounts || []);
            
            // If user already had an adAccountId stored, use it
            const saved = localStorage.getItem(CREDENTIALS_KEY);
            let preservedId = "";
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (parsed.adAccountId) {
                  preservedId = parsed.adAccountId;
                }
              } catch {}
            }
            
            if (preservedId && data.accounts?.some((acc: any) => acc.id === preservedId)) {
              setAdAccountId(preservedId);
            } else if (data.accounts && data.accounts.length > 0) {
              setAdAccountId(data.accounts[0].id);
            }
          } else {
            setError(data.error || "Erro ao carregar contas de anúncio.");
          }
        })
        .catch(err => {
          setError(err.message || "Erro de rede ao carregar contas de anúncio.");
        })
        .finally(() => {
          setIsLoadingAccounts(false);
        });
    } else {
      setAdAccounts([]);
      setAdAccountId("");
    }
  }, [authState.isConnected, authState.accessToken, CREDENTIALS_KEY]);

  // Formatters
  const formatCurrency = (value: string | number | undefined) => {
    if (value === undefined) return "R$ 0,00";
    const num = parseFloat(String(value));
    if (isNaN(num)) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatNumber = (value: string | number | undefined) => {
    if (value === undefined) return "0";
    const num = parseFloat(String(value));
    if (isNaN(num)) return "—";
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  const formatPercent = (value: string | number | undefined) => {
    if (value === undefined) return "0.00%";
    const num = parseFloat(String(value));
    if (isNaN(num)) return "—";
    return num.toFixed(2) + "%";
  };

  // Helper selectors
  const extractResults = (actions: any[] | undefined) => {
    if (!actions || !Array.isArray(actions)) return 0;
    const purchase = actions.find(a => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase");
    const lead = actions.find(a => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead" || a.action_type === "lead_grouped" || a.action_type === "onsite_conversion.lead_grouped");
    const purValue = purchase ? parseInt(purchase.value) : 0;
    const leadValue = lead ? parseInt(lead.value) : 0;
    return purValue + leadValue;
  };

  const extractRoas = (roasArray: any[] | undefined) => {
    if (!roasArray || !Array.isArray(roasArray)) return "—";
    const purchaseRoas = roasArray.find(
      r => r.action_type === "purchase" || r.action_type === "offsite_conversion.fb_pixel_purchase" || r.action_type === "omni_purchase"
    );
    const val = parseFloat(purchaseRoas?.value || "0");
    if (isNaN(val) || val === 0) return "—";
    return val.toFixed(2) + "x";
  };

  // Main fetch function
  const handleFetchData = async () => {
    if (!accessToken || !adAccountId) {
      setError("Por favor, selecione uma conta de anúncios antes de carregar.");
      return;
    }

    const cleanToken = accessToken.trim();
    const cleanId = adAccountId.trim();

    setError(null);
    setIsLoadingInsights(true);
    setIsLoadingCampaigns(true);
    setExpandedCampaignId(null);

    try {
      // 1. Fetch Account Insights
      const insightsRes = await fetch(
        `/.netlify/functions/facebook-account-insights?accessToken=${encodeURIComponent(cleanToken)}&adAccountId=${encodeURIComponent(cleanId)}&datePreset=${datePreset}`
      );
      const insightsData = await insightsRes.json();

      if (!insightsRes.ok || insightsData.success === false) {
        throw new Error(insightsData.error || "Erro ao carregar métricas da conta");
      }
      setAccountInsights(insightsData.data);

      // 2. Fetch Campaigns
      const campaignsRes = await fetch(
        `/.netlify/functions/facebook-campaigns?accessToken=${encodeURIComponent(cleanToken)}&adAccountId=${encodeURIComponent(cleanId)}&datePreset=${datePreset}`
      );
      const campaignsData = await campaignsRes.json();

      if (!campaignsRes.ok || campaignsData.success === false) {
        throw new Error(campaignsData.error || "Erro ao carregar campanhas da conta");
      }
      setCampaigns(campaignsData.campaigns || []);
      setHasLoadedAtLeastOnce(true);

      // Auto-save the selection
      localStorage.setItem(
        CREDENTIALS_KEY,
        JSON.stringify({ accessToken: cleanToken, adAccountId: cleanId, datePreset })
      );

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao comunicar com o servidor.");
    } finally {
      setIsLoadingInsights(false);
      setIsLoadingCampaigns(false);
    }
  };

  // Expand row & load Ad Sets
  const handleExpandCampaign = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      return;
    }

    setExpandedCampaignId(campaignId);

    // If cache already has the adsets, don't fetch again
    if (adsets[campaignId]) return;

    setIsLoadingAdsets(prev => ({ ...prev, [campaignId]: true }));

    try {
      const cleanToken = accessToken.trim();
      const adsetsRes = await fetch(
        `/.netlify/functions/facebook-adsets?accessToken=${encodeURIComponent(cleanToken)}&campaignId=${campaignId}&datePreset=${datePreset}`
      );
      const adsetsData = await adsetsRes.json();

      if (!adsetsRes.ok || adsetsData.success === false) {
        throw new Error(adsetsData.error || "Não foi possível resgatar conjuntos");
      }

      setAdsets(prev => ({ ...prev, [campaignId]: adsetsData.adsets || [] }));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingAdsets(prev => ({ ...prev, [campaignId]: false }));
    }
  };

  // Filter and Sort Campaigns
  const processedCampaigns = React.useMemo(() => {
    return campaigns
      .filter(c => {
        // Status filter
        if (filterStatus !== "all" && c.status !== filterStatus) return false;
        
        // Search term filter
        if (searchTerm.trim() !== "") {
          return c.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .sort((a, b) => {
        const insightsA = a.insights?.data?.[0];
        const insightsB = b.insights?.data?.[0];

        let valA = 0;
        let valB = 0;

        if (sortBy === "spend") {
          valA = parseFloat(insightsA?.spend || "0");
          valB = parseFloat(insightsB?.spend || "0");
        } else if (sortBy === "ctr") {
          valA = parseFloat(insightsA?.inline_link_click_ctr || "0");
          valB = parseFloat(insightsB?.inline_link_click_ctr || "0");
        } else if (sortBy === "results") {
          valA = extractResults(insightsA?.actions);
          valB = extractResults(insightsB?.actions);
        }

        if (sortOrder === "desc") {
          return valB - valA;
        } else {
          return valA - valB;
        }
      });
  }, [campaigns, filterStatus, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: "spend" | "ctr" | "results") => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getMaskedRepresentation = (token: string) => {
    if (!token) return "";
    if (token.length <= 11) return token;
    return `${token.substring(0, 6)}...${token.substring(token.length - 5)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in mac-fade-in">
      {/* Indicador de Perfil */}
      <div className="flex items-center gap-2 mb-4 bg-surface-raised border border-hairline rounded-mac-lg px-3 py-1.5 w-fit">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] text-ink-tertiary font-mono uppercase tracking-wider font-semibold">
          Integração de {operator}
        </span>
      </div>

      {!authState.isConnected ? (
        <div className="mac-card rounded-mac-lg p-5 space-y-5">
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            
            {/* Ícone Facebook */}
            <div className="w-20 h-20 rounded-full bg-[#1877F2] flex items-center justify-center shadow-[0_0_30px_rgba(24,119,242,0.3)] select-none">
              <span className="text-white font-bold text-3xl">f</span>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-white font-bold text-base tracking-wide font-sans">
                Conectar Facebook Ads
              </h3>
              <p className="text-ink-secondary text-xs max-w-sm text-center leading-relaxed font-semibold">
                Acesse seus dados de campanhas, conjuntos e anúncios diretamente no Vusk Operation. Conexão segura via OAuth oficial do Facebook.
              </p>
            </div>

            {/* Escopos solicitados */}
            <div className="bg-surface-base border border-hairline rounded-mac-md p-4 max-w-xs w-full space-y-2 select-none">
              <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                Permissões solicitadas
              </span>
              {[
                "Leitura de campanhas e anúncios (ads_read)",
                "Gerenciamento comercial (business_management)",
                "Leitura de dados de performance (ads_management)",
                "Perfil público básico (public_profile)"
              ].map((perm) => (
                <div key={perm} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />
                  <span className="text-[11px] text-ink-secondary font-sans font-semibold">{perm}</span>
                </div>
              ))}
            </div>

            <button
              onClick={login}
              disabled={isConnecting}
              className="flex items-center gap-3 px-8 py-3 bg-[#1877F2] text-white font-bold text-xs rounded-mac-sm shadow-[0_0_20px_rgba(24,119,242,0.35)] hover:bg-[#1464d8] hover:shadow-[0_0_30px_rgba(24,119,242,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <span className="font-bold text-sm leading-none">f</span>
                  Entrar com Facebook
                </>
              )}
            </button>

            {(authError || error) && (
              <div className="flex items-center gap-2.5 text-systemRed text-xs bg-systemRed/10 border border-systemRed/25 rounded-mac-md px-4 py-3 max-w-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Erro na Autenticação:</span>
                  <span className="opacity-95 text-[11px] leading-normal font-semibold">{authError || error}</span>
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        <>
          {/* SEÇÃO A - Configuração de Credenciais conectado */}
          <div id="credenciais-fb-panel" className="mac-card rounded-mac-lg p-5 space-y-5">
            <div className="flex items-center justify-between p-4 bg-[#1877F2]/10 border border-[#1877F2]/25 rounded-mac-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center select-none font-sans font-bold text-white text-sm">
                  f
                </div>
                <div>
                  <span className="text-xs font-bold text-white block font-sans">
                    {authState.userName || "Usuário Conectado"}
                  </span>
                  <span className="text-[10px] text-ink-tertiary font-mono block mt-0.5 font-semibold">
                    Token expira em {authState.daysUntilExpiry !== null ? authState.daysUntilExpiry : "—"} dias
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-[10px] text-ink-secondary hover:text-systemRed transition-colors font-mono uppercase tracking-wider cursor-pointer font-bold"
              >
                Desconectar
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-systemRed/10 border border-systemRed/25 rounded-mac-md flex items-start gap-2.5 text-xs text-systemRed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1 font-semibold">
                  <span className="font-bold">Falha na Autenticação ou Solicitação:</span>
                  <p className="opacity-90 leading-relaxed text-[11px]">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seletor de conta de anúncio (após conectar) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                  Conta de Anúncios
                </label>
                <select
                  value={adAccountId}
                  onChange={(e) => {
                    setAdAccountId(e.target.value);
                    localStorage.setItem(
                      CREDENTIALS_KEY,
                      JSON.stringify({ accessToken, adAccountId: e.target.value, datePreset })
                    );
                  }}
                  disabled={isLoadingAccounts}
                  className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer font-sans bg-surface-base"
                >
                  <option value="" className="bg-surface-base">{isLoadingAccounts ? "Carregando contas de anúncio..." : "Selecionar conta..."}</option>
                  {adAccounts.map((account) => (
                    <option key={account.id} value={account.id} className="bg-surface-base">
                      {account.name} ({account.id}) — {account.currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período */}
              <div className="space-y-2 select-none">
                <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                  Período de Análise
                </label>
                <select
                  value={datePreset}
                  onChange={(e) => {
                    setDatePreset(e.target.value);
                    localStorage.setItem(
                      CREDENTIALS_KEY,
                      JSON.stringify({ accessToken, adAccountId, datePreset: e.target.value })
                    );
                  }}
                  className="w-full mac-input rounded-mac-sm px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer font-sans bg-surface-base"
                >
                  <option value="today" className="bg-surface-base">Hoje</option>
                  <option value="yesterday" className="bg-surface-base">Ontem</option>
                  <option value="last_7d" className="bg-surface-base">Últimos 7 dias</option>
                  <option value="last_14d" className="bg-surface-base">Últimos 14 dias</option>
                  <option value="last_30d" className="bg-surface-base">Últimos 30 dias</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 select-none">
              <button
                onClick={handleFetchData}
                disabled={isLoadingInsights || isLoadingCampaigns || !adAccountId}
                className="px-5 py-2.5 bg-primary hover:bg-red-650 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
              >
                {isLoadingInsights || isLoadingCampaigns ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Carregar Dados
              </button>
            </div>
          </div>

          {/* SEÇÃO B - Dashboard de Dados */}
          {hasLoadedAtLeastOnce ? (
            <div id="fb-dashboard-results" className="space-y-6">
              {/* Row de Cards de métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Spend */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      Investimento Total
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatCurrency(accountInsights?.spend)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-primary/10 border border-primary/20 rounded-mac-md flex items-center justify-center text-primary">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 2: Resultados */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      Resultados (Vendas/Leads)
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatNumber(extractResults(accountInsights?.actions))}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-systemRed/10 border border-systemRed/20 rounded-mac-md flex items-center justify-center text-systemRed">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 3: CTR */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      CTR Médio
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatPercent(accountInsights?.inline_link_click_ctr)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-systemBlue/10 border border-systemBlue/20 rounded-mac-md flex items-center justify-center text-systemBlue">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 4: Cliques */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      Cliques no Link
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatNumber(accountInsights?.inline_link_clicks)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-indigo-500/10 border border-indigo-500/20 rounded-mac-md flex items-center justify-center text-indigo-400">
                    <MousePointer className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 5: Alcance */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      Alcance
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatNumber(accountInsights?.reach)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-systemGreen/10 border border-systemGreen/20 rounded-mac-md flex items-center justify-center text-systemGreen">
                    <Users className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 6: Impressões */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      Impressões
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatNumber(accountInsights?.impressions)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-systemPurple/10 border border-systemPurple/20 rounded-mac-md flex items-center justify-center text-systemPurple">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 7: CPC */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      CPC Médio
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatCurrency(accountInsights?.cpc)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-systemYellow/10 border border-systemYellow/20 rounded-mac-md flex items-center justify-center text-systemYellow">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>

                {/* Card 8: CPM */}
                <div className="mac-card rounded-mac-lg p-4 flex items-center justify-between select-none">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                      CPM Médio
                    </span>
                    <p className="text-base md:text-lg font-bold font-sans text-white tracking-tight leading-none">
                      {isLoadingInsights ? "..." : formatCurrency(accountInsights?.cpm)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-pink-500/10 border border-pink-500/20 rounded-mac-md flex items-center justify-center text-pink-400">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Tabela de Campanhas & Filtros */}
              <div className="mac-card rounded-mac-lg p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-ink-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filtrar por nome de campanha..."
                        className="w-full mac-input rounded-mac-sm pl-9 pr-4 py-2 text-xs text-white placeholder-ink-tertiary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Switcher */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-ink-tertiary font-mono">STATUS:</span>
                      <div className="flex bg-surface-base border border-hairline p-0.5 rounded-mac-sm select-none">
                        <button
                          onClick={() => setFilterStatus("all")}
                          className={`text-[9px] px-2.5 py-1 rounded-mac-sm font-bold font-mono transition-all cursor-pointer ${
                            filterStatus === "all" ? "bg-[#FF453A] text-white" : "text-ink-tertiary hover:text-white"
                          }`}
                        >
                          TODOS
                        </button>
                        <button
                          onClick={() => setFilterStatus("ACTIVE")}
                          className={`text-[9px] px-2.5 py-1 rounded-mac-sm font-bold font-mono transition-all cursor-pointer ${
                            filterStatus === "ACTIVE" ? "bg-[#FF453A] text-white" : "text-ink-tertiary hover:text-white"
                          }`}
                        >
                          ATIVAS
                        </button>
                        <button
                          onClick={() => setFilterStatus("PAUSED")}
                          className={`text-[9px] px-2.5 py-1 rounded-mac-sm font-bold font-mono transition-all cursor-pointer ${
                            filterStatus === "PAUSED" ? "bg-[#FF453A] text-white" : "text-ink-tertiary hover:text-white"
                          }`}
                        >
                          PAUSADAS
                        </button>
                      </div>
                    </div>

                    {/* Sort Option Buttons */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-ink-tertiary font-mono">ORDENAR:</span>
                      <div className="flex bg-surface-base border border-hairline p-0.5 rounded-mac-sm text-xs font-semibold">
                        <button
                          onClick={() => toggleSort("spend")}
                          className={`px-2 py-1 rounded-mac-sm font-mono text-[9px] transition-all cursor-pointer flex items-center gap-1 text-center font-bold ${
                            sortBy === "spend" ? "bg-primary text-white" : "text-ink-tertiary hover:text-white"
                          }`}
                        >
                          Investimento {sortBy === "spend" && (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                        <button
                          onClick={() => toggleSort("ctr")}
                          className={`px-2 py-1 rounded-mac-sm font-mono text-[9px] transition-all cursor-pointer flex items-center gap-1 text-center font-bold ${
                            sortBy === "ctr" ? "bg-primary text-white" : "text-ink-tertiary hover:text-white"
                          }`}
                        >
                          CTR {sortBy === "ctr" && (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                        <button
                          onClick={() => toggleSort("results")}
                          className={`px-2 py-1 rounded-mac-sm font-mono text-[9px] transition-all cursor-pointer flex items-center gap-1 text-center font-bold ${
                            sortBy === "results" ? "bg-primary text-white" : "text-ink-tertiary hover:text-white"
                          }`}
                        >
                          Resultados {sortBy === "results" && (sortOrder === "desc" ? "↓" : "↑")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Table container */}
                <div className="overflow-x-auto min-w-full rounded-mac-md border border-hairline bg-surface-base scrollbar-none">
                  <table className="w-full min-w-[900px] border-collapse text-left select-none text-xs">
                    <thead>
                      <tr className="bg-surface-raised/40 border-b border-hairline font-mono text-ink-tertiary font-bold text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center"></th>
                        <th className="py-3 px-3 w-16 text-center">Status</th>
                        <th className="py-3 px-4 min-w-[200px]">Campanha</th>
                        <th className="py-3 px-4 text-right">Investido</th>
                        <th className="py-3 px-4 text-right">Alcance</th>
                        <th className="py-3 px-4 text-right">Impressões</th>
                        <th className="py-3 px-4 text-right">Cliques</th>
                        <th className="py-3 px-4 text-right">CTR</th>
                        <th className="py-3 px-4 text-right">CPC</th>
                        <th className="py-3 px-4 text-right">CPM</th>
                        <th className="py-3 px-4 text-right">Resultados</th>
                        <th className="py-3 px-4 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-ink-secondary font-medium">
                      {isLoadingCampaigns ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={idx} className="animate-pulse bg-surface-base">
                            <td className="py-4 px-4"><div className="h-3 w-4 bg-surface-raised rounded"></div></td>
                            <td className="py-4 px-3"><div className="h-2 w-2 bg-surface-raised rounded-full mx-auto"></div></td>
                            <td className="py-4 px-4">
                              <div className="space-y-1.5">
                                <div className="h-3.5 w-44 bg-surface-raised rounded"></div>
                                <div className="h-2.5 w-16 bg-surface-raised rounded"></div>
                              </div>
                            </td>
                            <td className="py-4 px-4"><div className="h-3.5 w-16 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-14 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-14 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-10 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-10 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-10 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-10 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-10 bg-surface-raised rounded ml-auto"></div></td>
                            <td className="py-4 px-4"><div className="h-3.5 w-8 bg-surface-raised rounded ml-auto"></div></td>
                          </tr>
                        ))
                      ) : processedCampaigns.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="py-12 text-center text-ink-tertiary font-sans bg-surface-base">
                            <BarChart2 className="w-8 h-8 text-ink-tertiary mx-auto mb-2" />
                            <span className="block font-bold text-ink-secondary text-xs">Nenhuma campanha encontrada</span>
                            <span className="block text-[11px] text-ink-tertiary mt-1">Experimente alterar os filtros de status, termo de busca ou período de análise.</span>
                          </td>
                        </tr>
                      ) : (
                        processedCampaigns.map((camp) => {
                          const ins = camp.insights?.data?.[0];
                          const isExpanded = expandedCampaignId === camp.id;
                          const hasInsights = !!ins;

                          return (
                            <React.Fragment key={camp.id}>
                              {/* Row Principal */}
                              <tr 
                                onClick={() => handleExpandCampaign(camp.id)}
                                className="hover:bg-surface-raised/50 cursor-pointer transition-all duration-150 relative bg-surface-base"
                              >
                                <td className="py-3.5 px-4 text-center">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-ink-secondary inline-block" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-ink-secondary inline-block" />
                                  )}
                                </td>
                                <td className="py-3.5 px-3 text-center">
                                  <span 
                                    className={`inline-block h-2 w-2 rounded-full ${
                                      camp.status === "ACTIVE" 
                                        ? "bg-systemGreen shadow-[0_0_8px_rgba(48,209,88,0.5)]" 
                                        : camp.status === "PAUSED" 
                                          ? "bg-systemYellow" 
                                          : "bg-[#F5F5F7]/30"
                                    }`}
                                    title={camp.status}
                                  />
                                </td>
                                <td className="py-3.5 px-4 font-bold font-sans text-white text-[12.5px] max-w-[280px] truncate">
                                  <div>{camp.name}</div>
                                  <span className="text-[9.5px] font-mono text-ink-tertiary block font-normal">{camp.id}</span>
                                </td>
                                
                                {/* Heurística / Resposta das métricas */}
                                <td className="py-3.5 px-4 text-right font-mono text-zinc-100 font-bold">
                                  {hasInsights ? formatCurrency(ins.spend) : "R$ 0,00"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono">
                                  {hasInsights ? formatNumber(ins.reach) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-ink-secondary">
                                  {hasInsights ? formatNumber(ins.impressions) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-ink-secondary">
                                  {hasInsights ? formatNumber(ins.inline_link_clicks) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-systemBlue font-bold">
                                  {hasInsights ? formatPercent(ins.inline_link_click_ctr) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono">
                                  {hasInsights ? formatCurrency(ins.cpc) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-ink-tertiary">
                                  {hasInsights ? formatCurrency(ins.cpm) : "—"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-systemGreen font-bold">
                                  {hasInsights ? formatNumber(extractResults(ins.actions)) : "0"}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-primary">
                                  {hasInsights ? extractRoas(ins.purchase_roas) : "—"}
                                </td>
                              </tr>

                              {/* Row de Expansão (Conjuntos de Anúncios) */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={12} className="p-0 bg-surface-base/35 border-l-2 border-primary">
                                      <div className="py-3.5 px-12 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9.5px] font-bold text-ink-tertiary font-mono tracking-widest uppercase flex items-center gap-1.5 leading-none">
                                            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Conjuntos de Anúncios (Ad Sets)
                                          </span>
                                          <span className="text-[10px] text-ink-tertiary font-sans font-medium leading-none">
                                            Campanha ID: {camp.id}
                                          </span>
                                        </div>

                                        {isLoadingAdsets[camp.id] ? (
                                          <div className="space-y-1.5 py-4 select-none">
                                            <div className="h-4 w-full bg-surface-raised rounded animate-pulse"></div>
                                            <div className="h-4 w-full bg-surface-raised rounded animate-pulse"></div>
                                          </div>
                                        ) : !adsets[camp.id] || adsets[camp.id].length === 0 ? (
                                          <div className="py-5 text-center text-[11px] text-ink-tertiary font-sans">
                                            Nenhum conjunto encontrado para esta campanha ou erro na API.
                                          </div>
                                        ) : (
                                          <div className="overflow-x-auto rounded-mac-md border border-hairline bg-surface-raised/40 scrollbar-none">
                                            <table className="w-full text-left font-sans text-[11px]">
                                              <thead>
                                                <tr className="bg-surface-raised font-mono text-ink-tertiary font-bold uppercase text-[9px] tracking-wide border-b border-hairline">
                                                  <th className="py-2.5 px-3 w-12 text-center">Status</th>
                                                  <th className="py-2.5 px-3">Nome do Conjunto</th>
                                                  <th className="py-2.5 px-3 text-right">Orçamento Diário</th>
                                                  <th className="py-2.5 px-3 text-right">Investido</th>
                                                  <th className="py-2.5 px-3 text-right">Alcance</th>
                                                  <th className="py-2.5 px-3 text-right">CTR</th>
                                                  <th className="py-2.5 px-3 text-right">CPC</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-hairline text-ink-secondary">
                                                {adsets[camp.id].map(adset => {
                                                  const adsetInsight = adset.insights?.data?.[0];
                                                  const formatBudget = (raw: string | undefined) => {
                                                    if (!raw) return "—";
                                                    const cents = parseFloat(raw);
                                                    if (isNaN(cents)) return "—";
                                                    return formatCurrency(cents / (cents > 10000 ? 100 : 1));
                                                  };

                                                  return (
                                                    <tr key={adset.id} className="hover:bg-surface-raised/30 transition-all">
                                                      <td className="py-2.5 px-3 text-center">
                                                        <span 
                                                          className={`inline-block h-2 w-2 rounded-full ${
                                                            adset.status === "ACTIVE" 
                                                              ? "bg-systemGreen animate-pulse shadow-[0_0_6px_#30D158]" 
                                                              : "bg-[#F5F5F7]/25"
                                                          }`}
                                                          title={adset.status}
                                                        />
                                                      </td>
                                                      <td className="py-2.5 px-3 font-semibold text-white max-w-[280px] truncate">
                                                        {adset.name}
                                                        <span className="block text-[9px] text-ink-tertiary font-mono">{adset.id}</span>
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-mono text-zinc-100 font-bold">
                                                        {formatBudget(adset.daily_budget)}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-mono text-ink-secondary font-semibold">
                                                        {adsetInsight ? formatCurrency(adsetInsight.spend) : "R$ 0,00"}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-mono">
                                                        {adsetInsight ? formatNumber(adsetInsight.reach) : "—"}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-mono text-systemBlue font-bold">
                                                        {adsetInsight ? formatPercent(adsetInsight.ctr) : "—"}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-mono">
                                                        {adsetInsight ? formatCurrency(adsetInsight.cpc) : "—"}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Estado vazio antes de carregar */
            <div className="py-14 text-center mac-card rounded-mac-lg flex flex-col items-center justify-center space-y-4 select-none pr-4 pl-4 bg-surface-raised/30">
              <div className="h-12 w-12 rounded-mac-md bg-[#1877F2]/10 border border-[#1877F2]/25 flex items-center justify-center text-[#1877F2]">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white tracking-wide font-sans">
                  Nenhum dado importado no momento
                </h4>
                <p className="text-[11px] text-ink-secondary font-sans leading-relaxed font-semibold">
                  Carregue os dados de campanha informando suas credenciais da api de marketing do Facebook para sincronizar métricas e ver o seu dashboard analítico.
                </p>
              </div>
              <button
                onClick={handleFetchData}
                disabled={isLoadingInsights || isLoadingCampaigns || !accessToken || !adAccountId}
                className="px-6 py-2.5 bg-[#1877F2] text-white hover:bg-[#1877F2]/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold rounded-mac-sm transition duration-300 font-sans cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(24,119,242,0.3)] uppercase tracking-wider"
              >
                {isLoadingInsights || isLoadingCampaigns ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 animate-pulse" />
                )}
                Sincronizar Conta de Anúncios
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
