import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  RefreshCw,
  AlertCircle,
  Search,
  Play,
  Pause,
  Pencil,
  Check,
  X,
  BarChart2
} from "lucide-react";
import { useFacebookAuth } from "../../hooks/useFacebookAuth";
import { useOperator } from "../../contexts/OperatorContext";
import { fbEndpoint } from "../../lib/fbEndpoint";

interface CampaignInsight {
  spend: string;
  reach: string;
  impressions: string;
  inline_link_clicks: string;
  inline_link_click_ctr: string;
  actions?: Array<{ action_type: string; value: string }>;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  insights?: {
    data: CampaignInsight[];
  };
}

interface AdAccount {
  id: string;
  name: string;
  currency: string;
}

export function AdsCampaigns() {
  const operator = useOperator();
  const CREDENTIALS_KEY = `vusk_fb_credentials_${operator.toLowerCase()}`;
  const { authState } = useFacebookAuth();
  const accessToken = authState.accessToken || "";

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [adAccountId, setAdAccountId] = useState("");
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedAtLeastOnce, setHasLoadedAtLeastOnce] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ACTIVE" | "PAUSED">("all");
  const [sortBy, setSortBy] = useState<"spend" | "ctr" | "results">("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estado de ação em andamento (toggle de status) por linha.
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  // Estado de edição inline de orçamento: id da campanha sendo editada e valor digitado (em reais, string).
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [updatingBudgetId, setUpdatingBudgetId] = useState<string | null>(null);

  // Busca contas de anúncio disponíveis (mesma lógica do FacebookAdsPanel).
  useEffect(() => {
    if (!authState.isConnected || !authState.accessToken) {
      setAdAccounts([]);
      setAdAccountId("");
      return;
    }
    setIsLoadingAccounts(true);
    setError(null);
    fetch(`${fbEndpoint("facebook-ad-accounts", "ad-accounts")}?accessToken=${encodeURIComponent(authState.accessToken)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdAccounts(data.accounts || []);

          const saved = localStorage.getItem(CREDENTIALS_KEY);
          let preservedId = "";
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.adAccountId) preservedId = parsed.adAccountId;
            } catch {}
          }

          if (preservedId && data.accounts?.some((acc: AdAccount) => acc.id === preservedId)) {
            setAdAccountId(preservedId);
          } else if (data.accounts && data.accounts.length > 0) {
            setAdAccountId(data.accounts[0].id);
          }
        } else {
          setError(data.error || "Erro ao carregar contas de anúncio.");
        }
      })
      .catch((err) => {
        setError(err.message || "Erro de rede ao carregar contas de anúncio.");
      })
      .finally(() => {
        setIsLoadingAccounts(false);
      });
  }, [authState.isConnected, authState.accessToken, CREDENTIALS_KEY]);

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

  // daily_budget da Graph API vem em centavos da moeda da conta.
  const formatBudgetCents = (cents: string | undefined) => {
    if (!cents) return "—";
    const num = parseFloat(cents);
    if (isNaN(num)) return "—";
    return formatCurrency(num / 100);
  };

  const extractResults = (actions: Array<{ action_type: string; value: string }> | undefined) => {
    if (!actions || !Array.isArray(actions)) return 0;
    const purchase = actions.find((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase");
    const lead = actions.find((a) => a.action_type === "lead" || a.action_type === "offsite_conversion.fb_pixel_lead" || a.action_type === "lead_grouped" || a.action_type === "onsite_conversion.lead_grouped");
    const purValue = purchase ? parseInt(purchase.value) : 0;
    const leadValue = lead ? parseInt(lead.value) : 0;
    return purValue + leadValue;
  };

  const handleFetchCampaigns = useCallback(async () => {
    if (!accessToken || !adAccountId) {
      setError("Selecione uma conta de anúncios antes de carregar.");
      return;
    }

    const cleanToken = accessToken.trim();
    const cleanId = adAccountId.trim();

    setError(null);
    setIsLoadingCampaigns(true);

    try {
      const res = await fetch(
        `${fbEndpoint("facebook-campaigns", "campaigns")}?accessToken=${encodeURIComponent(cleanToken)}&adAccountId=${encodeURIComponent(cleanId)}&datePreset=last_7d`
      );
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao carregar campanhas da conta.");
      }

      setCampaigns(data.campaigns || []);
      setHasLoadedAtLeastOnce(true);

      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ accessToken: cleanToken, adAccountId: cleanId }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao comunicar com o servidor.");
    } finally {
      setIsLoadingCampaigns(false);
    }
  }, [accessToken, adAccountId, CREDENTIALS_KEY]);

  // Toggle de status (Ativar/Pausar) com confirmação obrigatória antes de cada chamada real.
  const handleToggleStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const verb = nextStatus === "ACTIVE" ? "ativar" : "pausar";
    const confirmed = window.confirm(
      `Tem certeza que deseja ${verb} a campanha "${campaign.name}"? Essa ação altera o status real da campanha na sua conta de anúncios do Facebook.`
    );
    if (!confirmed) return;

    setUpdatingStatusId(campaign.id);
    setError(null);
    try {
      const res = await fetch(`/api/facebook/campaign/${campaign.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim(), status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao atualizar status da campanha.");
      }
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, status: nextStatus } : c)));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao atualizar status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const startEditingBudget = (campaign: Campaign) => {
    const currentReais = campaign.daily_budget ? (parseFloat(campaign.daily_budget) / 100).toFixed(2) : "";
    setEditingBudgetId(campaign.id);
    setBudgetInput(currentReais);
  };

  const cancelEditingBudget = () => {
    setEditingBudgetId(null);
    setBudgetInput("");
  };

  // Confirmação obrigatória antes de gravar o novo orçamento diário (convertido para centavos).
  const handleConfirmBudget = async (campaign: Campaign) => {
    const reais = parseFloat(budgetInput.replace(",", "."));
    if (isNaN(reais) || reais <= 0) {
      setError("Informe um orçamento diário válido (maior que zero).");
      return;
    }
    const cents = Math.round(reais * 100);

    const confirmed = window.confirm(
      `Tem certeza que deseja alterar o orçamento diário da campanha "${campaign.name}" para ${formatCurrency(reais)}? Essa ação altera o gasto real na sua conta de anúncios do Facebook.`
    );
    if (!confirmed) return;

    setUpdatingBudgetId(campaign.id);
    setError(null);
    try {
      const res = await fetch(`/api/facebook/campaign/${campaign.id}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim(), dailyBudget: cents })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao atualizar orçamento da campanha.");
      }
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? { ...c, daily_budget: String(cents) } : c)));
      setEditingBudgetId(null);
      setBudgetInput("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao atualizar orçamento.");
    } finally {
      setUpdatingBudgetId(null);
    }
  };

  const processedCampaigns = React.useMemo(() => {
    return campaigns
      .filter((c) => {
        if (filterStatus !== "all" && c.status !== filterStatus) return false;
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

        return sortOrder === "desc" ? valB - valA : valA - valB;
      });
  }, [campaigns, filterStatus, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: "spend" | "ctr" | "results") => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  if (!authState.isConnected) {
    return (
      <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-3 select-none">
        <div className="h-12 w-12 rounded-mac-md bg-[#1877F2]/10 border border-[#1877F2]/25 flex items-center justify-center text-[#1877F2]">
          <Megaphone className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h4 className="text-sm font-bold text-white tracking-wide font-sans">
            Conecte o Facebook primeiro
          </h4>
          <p className="text-[11px] text-ink-secondary font-sans leading-relaxed font-semibold">
            Vá até a aba de integração do Facebook e conecte sua conta para gerenciar campanhas aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor de conta + carregar */}
      <div className="mac-card rounded-mac-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
            Conta de Anúncios
          </label>
          <select
            value={adAccountId}
            onChange={(e) => {
              setAdAccountId(e.target.value);
              localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({ accessToken, adAccountId: e.target.value }));
            }}
            disabled={isLoadingAccounts}
            className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer font-sans bg-surface-base"
          >
            <option value="" className="bg-surface-base">
              {isLoadingAccounts ? "Carregando contas de anúncio..." : "Selecionar conta..."}
            </option>
            {adAccounts.map((account) => (
              <option key={account.id} value={account.id} className="bg-surface-base">
                {account.name} ({account.id}) — {account.currency}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFetchCampaigns}
          disabled={isLoadingCampaigns || !adAccountId}
          className="px-5 py-2.5 bg-primary hover:bg-red-650 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCampaigns ? "animate-spin" : ""}`} />
          Carregar Campanhas
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-systemRed text-xs bg-systemRed/10 border border-systemRed/25 rounded-mac-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {!hasLoadedAtLeastOnce ? (
        <div className="py-14 text-center mac-card rounded-mac-lg flex flex-col items-center justify-center space-y-2 select-none">
          <Megaphone className="w-8 h-8 text-ink-tertiary mx-auto" />
          <span className="block font-bold text-ink-secondary text-xs">Nenhuma campanha carregada</span>
          <span className="block text-[11px] text-ink-tertiary mt-1">
            Selecione uma conta de anúncios e clique em "Carregar Campanhas".
          </span>
        </div>
      ) : (
        <div className="mac-card rounded-mac-lg p-5 space-y-4">
          {/* Filtros */}
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
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-ink-tertiary font-mono">STATUS:</span>
                <div className="flex bg-surface-base border border-hairline p-0.5 rounded-mac-sm select-none">
                  {(["all", "ACTIVE", "PAUSED"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`text-[9px] px-2.5 py-1 rounded-mac-sm font-bold font-mono transition-all cursor-pointer ${
                        filterStatus === s ? "bg-[#FF453A] text-white" : "text-ink-tertiary hover:text-white"
                      }`}
                    >
                      {s === "all" ? "TODOS" : s === "ACTIVE" ? "ATIVAS" : "PAUSADAS"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-ink-tertiary font-mono">ORDENAR:</span>
                <div className="flex bg-surface-base border border-hairline p-0.5 rounded-mac-sm text-xs font-semibold">
                  {([
                    { key: "spend" as const, label: "Investimento" },
                    { key: "ctr" as const, label: "CTR" },
                    { key: "results" as const, label: "Resultados" }
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      className={`px-2 py-1 rounded-mac-sm font-mono text-[9px] transition-all cursor-pointer flex items-center gap-1 text-center font-bold ${
                        sortBy === key ? "bg-primary text-white" : "text-ink-tertiary hover:text-white"
                      }`}
                    >
                      {label} {sortBy === key && (sortOrder === "desc" ? "↓" : "↑")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {processedCampaigns.length === 0 ? (
            <div className="py-12 text-center text-ink-tertiary font-sans">
              <BarChart2 className="w-8 h-8 text-ink-tertiary mx-auto mb-2" />
              <span className="block font-bold text-ink-secondary text-xs">Nenhuma campanha encontrada</span>
              <span className="block text-[11px] text-ink-tertiary mt-1">
                Experimente alterar os filtros de status ou termo de busca.
              </span>
            </div>
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto min-w-full rounded-mac-md border border-hairline bg-surface-base scrollbar-none">
                <table className="w-full min-w-[980px] border-collapse text-left select-none text-xs">
                  <thead>
                    <tr className="bg-surface-raised/40 border-b border-hairline font-mono text-ink-tertiary font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-3 w-16 text-center">Status</th>
                      <th className="py-3 px-4 min-w-[200px]">Campanha</th>
                      <th className="py-3 px-4 text-right">Investido</th>
                      <th className="py-3 px-4 text-right">CTR</th>
                      <th className="py-3 px-4 text-right">Resultados</th>
                      <th className="py-3 px-4 text-right min-w-[160px]">Orçamento Diário</th>
                      <th className="py-3 px-4 text-center w-32">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink-secondary font-medium">
                    {processedCampaigns.map((camp) => {
                      const ins = camp.insights?.data?.[0];
                      const hasInsights = !!ins;
                      const isEditingBudget = editingBudgetId === camp.id;

                      return (
                        <tr key={camp.id} className="hover:bg-surface-raised/50 transition-all duration-150 bg-surface-base">
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
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-100 font-bold">
                            {hasInsights ? formatCurrency(ins.spend) : "R$ 0,00"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-systemBlue font-bold">
                            {hasInsights ? formatPercent(ins.inline_link_click_ctr) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-systemGreen font-bold">
                            {hasInsights ? formatNumber(extractResults(ins.actions)) : "0"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono">
                            {isEditingBudget ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="text"
                                  value={budgetInput}
                                  onChange={(e) => setBudgetInput(e.target.value)}
                                  placeholder="0.00"
                                  disabled={updatingBudgetId === camp.id}
                                  className="w-24 mac-input rounded-mac-sm px-2 py-1.5 text-xs text-white text-right focus:outline-none bg-surface-raised"
                                />
                                <button
                                  onClick={() => handleConfirmBudget(camp)}
                                  disabled={updatingBudgetId === camp.id}
                                  title="Confirmar novo orçamento"
                                  className="p-1.5 rounded-mac-sm bg-systemGreen/15 text-systemGreen hover:bg-systemGreen/25 disabled:opacity-40 cursor-pointer transition-all"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={cancelEditingBudget}
                                  disabled={updatingBudgetId === camp.id}
                                  title="Cancelar"
                                  className="p-1.5 rounded-mac-sm bg-systemRed/15 text-systemRed hover:bg-systemRed/25 disabled:opacity-40 cursor-pointer transition-all"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditingBudget(camp)}
                                className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-white transition-colors cursor-pointer"
                                title="Editar orçamento diário"
                              >
                                {formatBudgetCents(camp.daily_budget)}
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(camp)}
                              disabled={updatingStatusId === camp.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                camp.status === "ACTIVE"
                                  ? "bg-systemYellow/15 text-systemYellow hover:bg-systemYellow/25"
                                  : "bg-systemGreen/15 text-systemGreen hover:bg-systemGreen/25"
                              }`}
                            >
                              {updatingStatusId === camp.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : camp.status === "ACTIVE" ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              {camp.status === "ACTIVE" ? "Pausar" : "Ativar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="block md:hidden space-y-3">
                {processedCampaigns.map((camp) => {
                  const ins = camp.insights?.data?.[0];
                  const hasInsights = !!ins;
                  const isEditingBudget = editingBudgetId === camp.id;

                  return (
                    <div key={camp.id} className="mac-card rounded-mac-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`mt-1 inline-block h-2 w-2 rounded-full shrink-0 ${
                              camp.status === "ACTIVE"
                                ? "bg-systemGreen shadow-[0_0_8px_rgba(48,209,88,0.5)]"
                                : "bg-systemYellow"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{camp.name}</p>
                            <p className="text-[10px] font-mono text-ink-tertiary">{camp.id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleStatus(camp)}
                          disabled={updatingStatusId === camp.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-mac-sm text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                            camp.status === "ACTIVE"
                              ? "bg-systemYellow/15 text-systemYellow hover:bg-systemYellow/25"
                              : "bg-systemGreen/15 text-systemGreen hover:bg-systemGreen/25"
                          }`}
                        >
                          {updatingStatusId === camp.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : camp.status === "ACTIVE" ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          {camp.status === "ACTIVE" ? "Pausar" : "Ativar"}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">Investido</span>
                          <span className="font-mono font-bold text-zinc-100">{hasInsights ? formatCurrency(ins.spend) : "R$ 0,00"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">CTR</span>
                          <span className="font-mono font-bold text-systemBlue">{hasInsights ? formatPercent(ins.inline_link_click_ctr) : "—"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">Resultados</span>
                          <span className="font-mono font-bold text-systemGreen">{hasInsights ? formatNumber(extractResults(ins.actions)) : "0"}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-hairline">
                        <span className="text-[9px] text-ink-tertiary font-mono uppercase block mb-1.5">Orçamento Diário</span>
                        {isEditingBudget ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={budgetInput}
                              onChange={(e) => setBudgetInput(e.target.value)}
                              placeholder="0.00"
                              disabled={updatingBudgetId === camp.id}
                              className="flex-1 mac-input rounded-mac-sm px-2 py-2 text-xs text-white focus:outline-none bg-surface-raised"
                            />
                            <button
                              onClick={() => handleConfirmBudget(camp)}
                              disabled={updatingBudgetId === camp.id}
                              className="p-2 rounded-mac-sm bg-systemGreen/15 text-systemGreen hover:bg-systemGreen/25 disabled:opacity-40 cursor-pointer transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelEditingBudget}
                              disabled={updatingBudgetId === camp.id}
                              className="p-2 rounded-mac-sm bg-systemRed/15 text-systemRed hover:bg-systemRed/25 disabled:opacity-40 cursor-pointer transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingBudget(camp)}
                            className="w-full flex items-center justify-between px-3 py-2 bg-surface-base border border-hairline rounded-mac-sm text-ink-secondary hover:text-white hover:border-primary/40 transition-all cursor-pointer"
                          >
                            <span className="font-mono font-bold">{formatBudgetCents(camp.daily_budget)}</span>
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
