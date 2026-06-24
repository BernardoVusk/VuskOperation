import React, { useState, useEffect, useCallback } from "react";
import {
  Workflow,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Info,
  ShoppingCart
} from "lucide-react";
import { useOperator } from "../../contexts/OperatorContext";

interface AttributionSummaryRow {
  fb_entity_id: string;
  entity_name: string | null;
  level: string;
  spend: number;
  revenue: number;
  roas: number | null;
}

interface UnattributedSale {
  id: string;
  occurred_at: string;
  platform: string;
  gross_amount: number | null;
  product_name: string | null;
  attribution_model: string | null;
}

const LEVEL_LABELS: Record<string, string> = {
  account: "Conta",
  campaign: "Campanha",
  adset: "Conjunto",
  ad: "Anúncio"
};

function formatAmount(amount: number | null, currency = "BRL"): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(amount);
}

function formatRoas(roas: number | null): string {
  if (roas === null || roas === undefined) return "—";
  return `${roas.toFixed(2)}x`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Distingue os dois "tipos" de venda sem sinal resolvido — ver nota de honestidade no
// server.ts (POST /api/ads/attribution/recompute): 'fbclid' sabe que veio de um clique no
// Facebook mas não sabe qual anúncio; 'none'/null não tem sinal nenhum.
function unattributedLabel(model: string | null): { label: string; className: string } {
  if (model === "fbclid") {
    return {
      label: "Clique do Facebook (anúncio não identificado)",
      className: "bg-systemYellow/15 text-systemYellow"
    };
  }
  return { label: "Sem sinal", className: "bg-ink-tertiary/15 text-ink-tertiary" };
}

export function AdsAttribution() {
  const operator = useOperator();

  const [summary, setSummary] = useState<AttributionSummaryRow[]>([]);
  const [unattributed, setUnattributed] = useState<UnattributedSale[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRecomputing, setIsRecomputing] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<string | null>(null);
  const [recomputeError, setRecomputeError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ads/attribution/summary?operator=${encodeURIComponent(operator)}`);
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao buscar resumo de atribuição.");
      }
      setSummary(data.summary || []);
      setUnattributed(data.unattributed || []);
    } catch (err: any) {
      setError(err.message || "Erro de rede ao buscar resumo de atribuição.");
    } finally {
      setIsLoading(false);
    }
  }, [operator]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleRecompute = useCallback(async () => {
    setIsRecomputing(true);
    setRecomputeResult(null);
    setRecomputeError(null);
    try {
      const res = await fetch("/api/ads/attribution/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao recalcular atribuição.");
      }
      setRecomputeResult(
        `${data.updated} venda${data.updated === 1 ? "" : "s"} processada${data.updated === 1 ? "" : "s"} ` +
          `(UTM: ${data.byModel.utm}, fbclid: ${data.byModel.fbclid}, sem sinal: ${data.byModel.none}).`
      );
      await loadSummary();
    } catch (err: any) {
      setRecomputeError(err.message || "Erro de rede ao recalcular atribuição.");
    } finally {
      setIsRecomputing(false);
    }
  }, [operator, loadSummary]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
          {summary.length} entidade{summary.length === 1 ? "" : "s"} atribuída
          {summary.length === 1 ? "" : "s"}
        </span>
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={handleRecompute}
            disabled={isRecomputing}
            className="px-3.5 py-2 bg-primary hover:bg-red-650 disabled:opacity-50 text-white text-[11px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecomputing ? "animate-spin" : ""}`} />
            {isRecomputing ? "Recalculando..." : "Recalcular atribuição"}
          </button>
          {recomputeResult && (
            <span className="text-[10px] text-systemGreen font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {recomputeResult}
            </span>
          )}
          {recomputeError && (
            <span className="text-[10px] text-systemRed font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {recomputeError}
            </span>
          )}
        </div>
      </div>

      <div className="mac-card rounded-mac-lg p-4 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="text-[11px] text-ink-secondary font-semibold space-y-1.5">
          <p>
            A atribuição real é feita casando as UTMs da venda com os nomes/ids das campanhas e
            anúncios do Facebook — não existe forma de "decodificar" o <code>fbclid</code> para
            descobrir de qual anúncio ele veio (é um identificador opaco do Facebook).
          </p>
          <p>
            Para a atribuição funcionar, nomeie a UTM <code>utm_campaign</code> igual ao nome da
            campanha no Facebook (ou use o parâmetro dinâmico{" "}
            <code>utm_campaign=&#123;&#123;campaign.name&#125;&#125;</code> na URL de destino do anúncio). Para o
            anúncio específico, prefira <code>utm_content=&#123;&#123;ad.id&#125;&#125;</code> — esse parâmetro
            grava o id numérico do anúncio diretamente, o que é mais confiável que casar por nome.
          </p>
          <p>
            Vendas com <code>fbclid</code> mas sem UTM reconhecida aparecem como "clique do
            Facebook (anúncio não identificado)" — sabemos que vieram de um anúncio, mas não qual.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-systemRed text-xs bg-systemRed/10 border border-systemRed/25 rounded-mac-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="mac-card rounded-mac-lg p-12 flex items-center justify-center text-ink-tertiary text-xs font-sans">
          Carregando atribuição...
        </div>
      ) : (
        <>
          {summary.length === 0 ? (
            <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
              <Workflow className="w-6 h-6 text-ink-tertiary" />
              <span className="text-xs text-ink-secondary font-sans font-semibold">
                Nenhuma venda atribuída ainda. Clique em "Recalcular atribuição".
              </span>
            </div>
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block mac-card rounded-mac-lg overflow-hidden">
                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-left border-collapse font-sans text-xs">
                    <thead>
                      <tr className="bg-surface-raised border-b border-hairline text-[10px] text-ink-tertiary font-bold uppercase tracking-widest font-mono">
                        <th className="px-4 py-3">Entidade</th>
                        <th className="px-4 py-3">Nível</th>
                        <th className="px-4 py-3">Gasto</th>
                        <th className="px-4 py-3">Receita atribuída</th>
                        <th className="px-4 py-3">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline text-ink-secondary">
                      {summary.map((row) => (
                        <tr key={row.fb_entity_id} className="hover:bg-surface-raised/50 transition-all">
                          <td className="px-4 py-3.5 font-bold text-white">
                            {row.entity_name || row.fb_entity_id}
                          </td>
                          <td className="px-4 py-3.5">{LEVEL_LABELS[row.level] || row.level}</td>
                          <td className="px-4 py-3.5 font-mono">{formatAmount(row.spend)}</td>
                          <td className="px-4 py-3.5 font-mono">{formatAmount(row.revenue)}</td>
                          <td className="px-4 py-3.5 font-mono">{formatRoas(row.roas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile: cards */}
              <div className="block md:hidden space-y-3">
                {summary.map((row) => (
                  <div key={row.fb_entity_id} className="mac-card rounded-mac-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white truncate">
                        {row.entity_name || row.fb_entity_id}
                      </p>
                      <span className="text-[10px] font-mono text-ink-tertiary shrink-0">
                        {LEVEL_LABELS[row.level] || row.level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono text-ink-tertiary">
                        Gasto {formatAmount(row.spend)}
                      </span>
                      <span className="font-mono font-bold text-zinc-100">
                        Receita {formatAmount(row.revenue)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-hairline text-[11px] font-mono text-ink-secondary">
                      ROAS: {formatRoas(row.roas)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                Vendas não atribuídas ({unattributed.length})
              </span>
            </div>

            {unattributed.length === 0 ? (
              <div className="mac-card rounded-mac-lg p-8 flex flex-col items-center justify-center text-center gap-2 select-none">
                <ShoppingCart className="w-5 h-5 text-ink-tertiary" />
                <span className="text-xs text-ink-secondary font-sans font-semibold">
                  Todas as vendas têm atribuição resolvida.
                </span>
              </div>
            ) : (
              <>
                {/* Desktop: tabela */}
                <div className="hidden md:block mac-card rounded-mac-lg overflow-hidden">
                  <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="bg-surface-raised border-b border-hairline text-[10px] text-ink-tertiary font-bold uppercase tracking-widest font-mono">
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Produto</th>
                          <th className="px-4 py-3">Plataforma</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3">Sinal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline text-ink-secondary">
                        {unattributed.map((sale) => {
                          const badge = unattributedLabel(sale.attribution_model);
                          return (
                            <tr key={sale.id} className="hover:bg-surface-raised/50 transition-all">
                              <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                                {formatDate(sale.occurred_at)}
                              </td>
                              <td className="px-4 py-3.5 font-bold text-white">
                                {sale.product_name || "—"}
                              </td>
                              <td className="px-4 py-3.5">{sale.platform}</td>
                              <td className="px-4 py-3.5 font-mono">{formatAmount(sale.gross_amount)}</td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase ${badge.className}`}
                                >
                                  {badge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile: cards */}
                <div className="block md:hidden space-y-3">
                  {unattributed.map((sale) => {
                    const badge = unattributedLabel(sale.attribution_model);
                    return (
                      <div key={sale.id} className="mac-card rounded-mac-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {sale.product_name || "—"}
                            </p>
                            <p className="text-[10px] font-mono text-ink-tertiary">
                              {formatDate(sale.occurred_at)} · {sale.platform}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-zinc-100 text-[11px] shrink-0">
                            {formatAmount(sale.gross_amount)}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
