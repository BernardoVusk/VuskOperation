import React, { useState, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  RefreshCw,
  AlertCircle,
  Search,
  Play,
  Pause,
  BarChart2
} from "lucide-react";
import { useFacebookAuth } from "../../hooks/useFacebookAuth";
import { useOperator } from "../../contexts/OperatorContext";
import { fbEndpoint } from "../../lib/fbEndpoint";

interface AdInsightAction {
  action_type: string;
  value: string;
}

interface AdInsight {
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  actions?: AdInsightAction[];
}

interface AdCreative {
  thumbnail_url?: string;
  body?: string;
  title?: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  creative?: AdCreative;
  insights?: {
    data: AdInsight[];
  };
}

interface AdAccount {
  id: string;
  name: string;
  currency: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface AdSet {
  id: string;
  name: string;
}

export function AdsAds() {
  const operator = useOperator();
  const CREDENTIALS_KEY = `vusk_fb_ads_credentials_${operator.toLowerCase()}`;
  const { authState } = useFacebookAuth();
  const accessToken = authState.accessToken || "";

  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [adAccountId, setAdAccountId] = useState("");
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [adsetId, setAdsetId] = useState("");
  const [isLoadingAdSets, setIsLoadingAdSets] = useState(false);

  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedAtLeastOnce, setHasLoadedAtLeastOnce] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ACTIVE" | "PAUSED">("all");
  const [sortBy, setSortBy] = useState<"spend" | "ctr" | "clicks">("spend");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Estado de ação em andamento (toggle de status) por linha.
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Busca contas de anúncio disponíveis (mesma lógica do AdsAdSets).
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
          let preservedAccountId = "";
          let preservedCampaignId = "";
          let preservedAdsetId = "";
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.adAccountId) preservedAccountId = parsed.adAccountId;
              if (parsed.campaignId) preservedCampaignId = parsed.campaignId;
              if (parsed.adsetId) preservedAdsetId = parsed.adsetId;
            } catch {}
          }

          if (preservedAccountId && data.accounts?.some((acc: AdAccount) => acc.id === preservedAccountId)) {
            setAdAccountId(preservedAccountId);
          } else if (data.accounts && data.accounts.length > 0) {
            setAdAccountId(data.accounts[0].id);
          }

          if (preservedCampaignId) {
            setCampaignId(preservedCampaignId);
          }
          if (preservedAdsetId) {
            setAdsetId(preservedAdsetId);
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

  // Busca campanhas da conta selecionada, para alimentar o seletor de campanha.
  useEffect(() => {
    if (!accessToken || !adAccountId) {
      setCampaigns([]);
      return;
    }
    setIsLoadingCampaigns(true);
    fetch(
      `${fbEndpoint("facebook-campaigns", "campaigns")}?accessToken=${encodeURIComponent(accessToken.trim())}&adAccountId=${encodeURIComponent(adAccountId.trim())}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCampaigns(data.campaigns || []);
        } else {
          setError(data.error || "Erro ao carregar campanhas da conta.");
        }
      })
      .catch((err) => {
        setError(err.message || "Erro de rede ao carregar campanhas.");
      })
      .finally(() => {
        setIsLoadingCampaigns(false);
      });
  }, [accessToken, adAccountId]);

  // Busca conjuntos de anúncios da campanha selecionada, para alimentar o seletor de conjunto.
  useEffect(() => {
    if (!accessToken || !campaignId) {
      setAdSets([]);
      return;
    }
    setIsLoadingAdSets(true);
    fetch(
      `${fbEndpoint("facebook-adsets", "adsets")}?accessToken=${encodeURIComponent(accessToken.trim())}&campaignId=${encodeURIComponent(campaignId.trim())}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdSets(data.adsets || []);
        } else {
          setError(data.error || "Erro ao carregar conjuntos de anúncios da campanha.");
        }
      })
      .catch((err) => {
        setError(err.message || "Erro de rede ao carregar conjuntos de anúncios.");
      })
      .finally(() => {
        setIsLoadingAdSets(false);
      });
  }, [accessToken, campaignId]);

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

  // Rota nova (sem twin no Netlify Functions) — chamada direta pelo path do Express,
  // sem passar por fbEndpoint().
  const handleFetchAds = useCallback(async () => {
    if (!accessToken || !adsetId) {
      setError("Selecione um conjunto de anúncios antes de carregar.");
      return;
    }

    const cleanToken = accessToken.trim();
    const cleanAdsetId = adsetId.trim();

    setError(null);
    setIsLoadingAds(true);

    try {
      const res = await fetch(
        `/api/facebook/ads?accessToken=${encodeURIComponent(cleanToken)}&adsetId=${encodeURIComponent(cleanAdsetId)}`
      );
      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao carregar anúncios do conjunto.");
      }

      setAds(data.ads || []);
      setHasLoadedAtLeastOnce(true);

      localStorage.setItem(
        CREDENTIALS_KEY,
        JSON.stringify({ accessToken: cleanToken, adAccountId, campaignId, adsetId: cleanAdsetId })
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao comunicar com o servidor.");
    } finally {
      setIsLoadingAds(false);
    }
  }, [accessToken, adsetId, adAccountId, campaignId, CREDENTIALS_KEY]);

  // Toggle de status (Ativar/Pausar) com confirmação obrigatória antes de cada chamada real.
  const handleToggleStatus = async (ad: Ad) => {
    const nextStatus = ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const verb = nextStatus === "ACTIVE" ? "ativar" : "pausar";
    const confirmed = window.confirm(
      `Tem certeza que deseja ${verb} o anúncio "${ad.name}"? Essa ação altera o status real do anúncio na sua conta de anúncios do Facebook.`
    );
    if (!confirmed) return;

    setUpdatingStatusId(ad.id);
    setError(null);
    try {
      const res = await fetch(`/api/facebook/ad/${ad.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.trim(), status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao atualizar status do anúncio.");
      }
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, status: nextStatus } : a)));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido ao atualizar status.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const processedAds = React.useMemo(() => {
    return ads
      .filter((a) => {
        if (filterStatus !== "all" && a.status !== filterStatus) return false;
        if (searchTerm.trim() !== "") {
          return a.name.toLowerCase().includes(searchTerm.toLowerCase());
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
          valA = parseFloat(insightsA?.ctr || "0");
          valB = parseFloat(insightsB?.ctr || "0");
        } else if (sortBy === "clicks") {
          valA = parseFloat(insightsA?.clicks || "0");
          valB = parseFloat(insightsB?.clicks || "0");
        }

        return sortOrder === "desc" ? valB - valA : valA - valB;
      });
  }, [ads, filterStatus, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: "spend" | "ctr" | "clicks") => {
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
          <ImageIcon className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h4 className="text-sm font-bold text-white tracking-wide font-sans">
            Conecte o Facebook primeiro
          </h4>
          <p className="text-[11px] text-ink-secondary font-sans leading-relaxed font-semibold">
            Vá até a aba de integração do Facebook e conecte sua conta para gerenciar anúncios aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletores de conta + campanha + conjunto + carregar */}
      <div className="mac-card rounded-mac-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
            Conta de Anúncios
          </label>
          <select
            value={adAccountId}
            onChange={(e) => {
              setAdAccountId(e.target.value);
              setCampaignId("");
              setAdsetId("");
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
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
            Campanha
          </label>
          <select
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value);
              setAdsetId("");
            }}
            disabled={isLoadingCampaigns || !adAccountId}
            className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer font-sans bg-surface-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="" className="bg-surface-base">
              {isLoadingCampaigns ? "Carregando campanhas..." : "Selecionar campanha..."}
            </option>
            {campaigns.map((camp) => (
              <option key={camp.id} value={camp.id} className="bg-surface-base">
                {camp.name} ({camp.id})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
            Conjunto de Anúncios
          </label>
          <select
            value={adsetId}
            onChange={(e) => setAdsetId(e.target.value)}
            disabled={isLoadingAdSets || !campaignId}
            className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer font-sans bg-surface-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="" className="bg-surface-base">
              {isLoadingAdSets ? "Carregando conjuntos..." : "Selecionar conjunto..."}
            </option>
            {adSets.map((adSet) => (
              <option key={adSet.id} value={adSet.id} className="bg-surface-base">
                {adSet.name} ({adSet.id})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleFetchAds}
          disabled={isLoadingAds || !adsetId}
          className="px-5 py-2.5 bg-primary hover:bg-red-650 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAds ? "animate-spin" : ""}`} />
          Carregar Anúncios
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
          <ImageIcon className="w-8 h-8 text-ink-tertiary mx-auto" />
          <span className="block font-bold text-ink-secondary text-xs">Nenhum anúncio carregado</span>
          <span className="block text-[11px] text-ink-tertiary mt-1">
            Selecione uma conta de anúncios, uma campanha, um conjunto e clique em "Carregar Anúncios".
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
                  placeholder="Filtrar por nome de anúncio..."
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
                      {s === "all" ? "TODOS" : s === "ACTIVE" ? "ATIVOS" : "PAUSADOS"}
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
                    { key: "clicks" as const, label: "Cliques" }
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

          {processedAds.length === 0 ? (
            <div className="py-12 text-center text-ink-tertiary font-sans">
              <BarChart2 className="w-8 h-8 text-ink-tertiary mx-auto mb-2" />
              <span className="block font-bold text-ink-secondary text-xs">Nenhum anúncio encontrado</span>
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
                      <th className="py-3 px-4 w-16">Criativo</th>
                      <th className="py-3 px-4 min-w-[200px]">Anúncio</th>
                      <th className="py-3 px-4 text-right">Investido</th>
                      <th className="py-3 px-4 text-right">Impressões</th>
                      <th className="py-3 px-4 text-right">Cliques</th>
                      <th className="py-3 px-4 text-right">CTR</th>
                      <th className="py-3 px-4 text-center w-32">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline text-ink-secondary font-medium">
                    {processedAds.map((ad) => {
                      const ins = ad.insights?.data?.[0];
                      const hasInsights = !!ins;

                      return (
                        <tr key={ad.id} className="hover:bg-surface-raised/50 transition-all duration-150 bg-surface-base">
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                ad.status === "ACTIVE"
                                  ? "bg-systemGreen shadow-[0_0_8px_rgba(48,209,88,0.5)]"
                                  : ad.status === "PAUSED"
                                    ? "bg-systemYellow"
                                    : "bg-[#F5F5F7]/30"
                              }`}
                              title={ad.status}
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            {ad.creative?.thumbnail_url ? (
                              <img
                                src={ad.creative.thumbnail_url}
                                alt={ad.creative.title || ad.name}
                                className="w-10 h-10 rounded-mac-sm object-cover border border-hairline"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-mac-sm border border-hairline bg-surface-raised flex items-center justify-center text-ink-tertiary">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold font-sans text-white text-[12.5px] max-w-[280px] truncate">
                            <div>{ad.name}</div>
                            <span className="text-[9.5px] font-mono text-ink-tertiary block font-normal">{ad.id}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-zinc-100 font-bold">
                            {hasInsights ? formatCurrency(ins.spend) : "R$ 0,00"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-ink-secondary font-bold">
                            {hasInsights ? formatNumber(ins.impressions) : "0"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-systemGreen font-bold">
                            {hasInsights ? formatNumber(ins.clicks) : "0"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-systemBlue font-bold">
                            {hasInsights ? formatPercent(ins.ctr) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(ad)}
                              disabled={updatingStatusId === ad.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                ad.status === "ACTIVE"
                                  ? "bg-systemYellow/15 text-systemYellow hover:bg-systemYellow/25"
                                  : "bg-systemGreen/15 text-systemGreen hover:bg-systemGreen/25"
                              }`}
                            >
                              {updatingStatusId === ad.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : ad.status === "ACTIVE" ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              {ad.status === "ACTIVE" ? "Pausar" : "Ativar"}
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
                {processedAds.map((ad) => {
                  const ins = ad.insights?.data?.[0];
                  const hasInsights = !!ins;

                  return (
                    <div key={ad.id} className="mac-card rounded-mac-lg p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {ad.creative?.thumbnail_url ? (
                            <img
                              src={ad.creative.thumbnail_url}
                              alt={ad.creative.title || ad.name}
                              className="w-14 h-14 rounded-mac-sm object-cover border border-hairline shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-mac-sm border border-hairline bg-surface-raised flex items-center justify-center text-ink-tertiary shrink-0">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                                  ad.status === "ACTIVE"
                                    ? "bg-systemGreen shadow-[0_0_8px_rgba(48,209,88,0.5)]"
                                    : "bg-systemYellow"
                                }`}
                              />
                              <p className="text-sm font-bold text-white truncate">{ad.name}</p>
                            </div>
                            <p className="text-[10px] font-mono text-ink-tertiary">{ad.id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleStatus(ad)}
                          disabled={updatingStatusId === ad.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-mac-sm text-[9px] font-bold font-mono uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                            ad.status === "ACTIVE"
                              ? "bg-systemYellow/15 text-systemYellow hover:bg-systemYellow/25"
                              : "bg-systemGreen/15 text-systemGreen hover:bg-systemGreen/25"
                          }`}
                        >
                          {updatingStatusId === ad.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : ad.status === "ACTIVE" ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                          {ad.status === "ACTIVE" ? "Pausar" : "Ativar"}
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">Investido</span>
                          <span className="font-mono font-bold text-zinc-100">{hasInsights ? formatCurrency(ins.spend) : "R$ 0,00"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">Impr.</span>
                          <span className="font-mono font-bold text-ink-secondary">{hasInsights ? formatNumber(ins.impressions) : "0"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">Cliques</span>
                          <span className="font-mono font-bold text-systemGreen">{hasInsights ? formatNumber(ins.clicks) : "0"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-ink-tertiary font-mono uppercase block">CTR</span>
                          <span className="font-mono font-bold text-systemBlue">{hasInsights ? formatPercent(ins.ctr) : "—"}</span>
                        </div>
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
