import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingCart,
  AlertCircle,
  Webhook,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound
} from "lucide-react";
import { useAdsData } from "../../hooks/useAdsData";
import { useOperator } from "../../contexts/OperatorContext";

interface ProductRow {
  id: string;
  name: string;
}

interface SaleRow {
  id: string;
  platform: string;
  external_order_id: string;
  product_id: string | null;
  status: string;
  gross_amount: number | null;
  net_amount: number | null;
  currency: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  utm_campaign: string | null;
  occurred_at: string;
  products: { name: string } | null;
}

const PLATFORMS = ["hotmart", "kiwify", "wiapy", "lowify"] as const;
const PLATFORM_LABELS: Record<string, string> = {
  hotmart: "Hotmart",
  kiwify: "Kiwify",
  wiapy: "Wiapy",
  lowify: "Lowify"
};

const STATUS_OPTIONS = ["approved", "refunded", "chargeback", "pending", "cancelled", "expired"];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: "Aprovada", className: "bg-systemGreen/15 text-systemGreen" },
  refunded: { label: "Reembolsada", className: "bg-systemRed/15 text-systemRed" },
  chargeback: { label: "Chargeback", className: "bg-systemRed/15 text-systemRed" },
  pending: { label: "Pendente", className: "bg-systemYellow/15 text-systemYellow" },
  cancelled: { label: "Cancelada", className: "bg-ink-tertiary/15 text-ink-tertiary" },
  expired: { label: "Expirada", className: "bg-ink-tertiary/15 text-ink-tertiary" }
};

function statusBadge(status: string) {
  return (
    STATUS_BADGE[status] || {
      label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Desconhecido",
      className: "bg-ink-tertiary/15 text-ink-tertiary"
    }
  );
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL"
  }).format(amount);
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

const PAGE_SIZE = 20;

function WebhookConfigSection() {
  const operator = useOperator();
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const [secretPlatform, setSecretPlatform] = useState<string>(PLATFORMS[0]);
  const [secretValue, setSecretValue] = useState("");
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [secretError, setSecretError] = useState<string | null>(null);
  const [secretSaved, setSecretSaved] = useState(false);

  const handleGenerateToken = useCallback(async () => {
    setIsLoadingToken(true);
    setTokenError(null);
    try {
      const res = await fetch("/api/ads/webhook-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao gerar token de webhook.");
      }
      setToken(data.token);
    } catch (err: any) {
      setTokenError(err.message || "Erro de rede ao gerar token.");
    } finally {
      setIsLoadingToken(false);
    }
  }, [operator]);

  const handleCopy = useCallback(async (platform: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform((p) => (p === platform ? null : p)), 1500);
    } catch {
      // Clipboard pode falhar (permissão/contexto inseguro) — sem efeito além de não copiar.
    }
  }, []);

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecretError(null);
    setSecretSaved(false);
    const trimmed = secretValue.trim();
    if (!trimmed) {
      setSecretError("Informe o secret antes de salvar.");
      return;
    }
    setIsSavingSecret(true);
    try {
      const res = await fetch("/api/ads/webhook-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator, platform: secretPlatform, secret: trimmed })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "Erro ao salvar secret.");
      }
      setSecretValue("");
      setSecretSaved(true);
      setTimeout(() => setSecretSaved(false), 2500);
    } catch (err: any) {
      setSecretError(err.message || "Erro de rede ao salvar secret.");
    } finally {
      setIsSavingSecret(false);
    }
  };

  return (
    <div className="mac-card rounded-mac-lg p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Webhook className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Configuração de Webhooks
        </h3>
      </div>

      {!token ? (
        <div className="space-y-2">
          <p className="text-[11px] text-ink-secondary font-semibold">
            Gere a URL de webhook do seu operador para colar nas plataformas de checkout.
          </p>
          <button
            onClick={handleGenerateToken}
            disabled={isLoadingToken}
            className="px-3.5 py-2 bg-primary hover:bg-red-650 disabled:opacity-50 text-white text-[11px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
          >
            <Webhook className="w-3.5 h-3.5" />
            {isLoadingToken ? "Gerando..." : "Gerar/copiar URL do meu webhook"}
          </button>
          {tokenError && (
            <div className="flex items-center gap-2 text-systemRed text-[11px] font-semibold">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {tokenError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {PLATFORMS.map((platform) => {
            const url = `${window.location.origin}/api/webhooks/checkout/${platform}/${token}`;
            return (
              <div
                key={platform}
                className="flex items-center gap-2.5 bg-surface-base border border-hairline rounded-mac-sm px-3 py-2.5"
              >
                <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider font-mono w-16 shrink-0">
                  {PLATFORM_LABELS[platform]}
                </span>
                <span className="flex-1 min-w-0 truncate text-[11px] text-ink-secondary font-mono">
                  {url}
                </span>
                <button
                  onClick={() => handleCopy(platform, url)}
                  title="Copiar URL"
                  className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-white/5 transition-all cursor-pointer shrink-0"
                >
                  {copiedPlatform === platform ? (
                    <Check className="w-3.5 h-3.5 text-systemGreen" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-hairline space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">
            Secret de Assinatura
          </h4>
        </div>
        <p className="text-[10px] text-ink-tertiary font-semibold">
          O secret é usado para validar a assinatura dos webhooks recebidos. Ele não é exibido
          novamente após salvo.
        </p>
        <form onSubmit={handleSaveSecret} className="flex flex-col sm:flex-row gap-2.5">
          <select
            value={secretPlatform}
            onChange={(e) => setSecretPlatform(e.target.value)}
            disabled={isSavingSecret}
            className="mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none cursor-pointer sm:w-40"
          >
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={secretValue}
            onChange={(e) => setSecretValue(e.target.value)}
            placeholder="Secret/token de verificação"
            disabled={isSavingSecret}
            className="flex-1 mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isSavingSecret}
            className="px-4 py-2.5 mac-btn-primary text-white rounded-mac-sm text-[11px] font-bold tracking-wide transition-all cursor-pointer uppercase whitespace-nowrap disabled:opacity-50"
          >
            {isSavingSecret ? "Salvando..." : "Salvar Secret"}
          </button>
        </form>
        {secretError && (
          <div className="flex items-center gap-2 text-systemRed text-[11px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {secretError}
          </div>
        )}
        {secretSaved && (
          <div className="flex items-center gap-2 text-systemGreen text-[11px] font-semibold">
            <Check className="w-3.5 h-3.5 shrink-0" />
            Secret salvo com sucesso.
          </div>
        )}
      </div>
    </div>
  );
}

export function AdsSales() {
  const { useAdsTable } = useAdsData();
  const salesTable = useAdsTable<SaleRow>("sales");
  const productsTable = useAdsTable<ProductRow>("products");

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadSales = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await salesTable.list("*, products(name)", (q) =>
      q.order("occurred_at", { ascending: false })
    );
    if (res.success) {
      setSales(res.data);
    } else {
      setError(res.error);
    }
    setIsLoading(false);
  }, [salesTable]);

  const loadProducts = useCallback(async () => {
    const res = await productsTable.list("id, name");
    if (res.success) setProducts(res.data);
  }, [productsTable]);

  useEffect(() => {
    loadSales();
    loadProducts();
  }, [loadSales, loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, platformFilter, productFilter, dateFrom, dateTo]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (statusFilter && sale.status !== statusFilter) return false;
      if (platformFilter && sale.platform !== platformFilter) return false;
      if (productFilter && sale.product_id !== productFilter) return false;
      if (dateFrom && new Date(sale.occurred_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(sale.occurred_at) > new Date(`${dateTo}T23:59:59`)) return false;
      return true;
    });
  }, [sales, statusFilter, platformFilter, productFilter, dateFrom, dateTo]);

  const platformOptions = useMemo(
    () => Array.from(new Set(sales.map((s) => s.platform))).sort(),
    [sales]
  );

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-4">
      <WebhookConfigSection />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
          {filteredSales.length} venda{filteredSales.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mac-card rounded-mac-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full mac-input px-2.5 py-2 rounded-mac-sm text-xs font-sans outline-none cursor-pointer"
          >
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {statusBadge(s).label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
            Plataforma
          </label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full mac-input px-2.5 py-2 rounded-mac-sm text-xs font-sans outline-none cursor-pointer"
          >
            <option value="">Todas</option>
            {platformOptions.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p] || p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
            Produto
          </label>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full mac-input px-2.5 py-2 rounded-mac-sm text-xs font-sans outline-none cursor-pointer"
          >
            <option value="">Todos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
            Período
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full mac-input px-2 py-2 rounded-mac-sm text-[11px] font-sans outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full mac-input px-2 py-2 rounded-mac-sm text-[11px] font-sans outline-none"
            />
          </div>
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
          Carregando vendas...
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
          <ShoppingCart className="w-6 h-6 text-ink-tertiary" />
          <span className="text-xs text-ink-secondary font-sans font-semibold">
            Nenhuma venda encontrada.
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
                    <th className="px-4 py-3">Bruto</th>
                    <th className="px-4 py-3">Líquido</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Plataforma</th>
                    <th className="px-4 py-3">Comprador</th>
                    <th className="px-4 py-3">UTM Campaign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink-secondary">
                  {paginatedSales.map((sale) => {
                    const badge = statusBadge(sale.status);
                    return (
                      <tr key={sale.id} className="hover:bg-surface-raised/50 transition-all">
                        <td className="px-4 py-3.5 font-mono whitespace-nowrap">
                          {formatDate(sale.occurred_at)}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          {sale.products?.name || "—"}
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          {formatAmount(sale.gross_amount, sale.currency)}
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          {formatAmount(sale.net_amount, sale.currency)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{PLATFORM_LABELS[sale.platform] || sale.platform}</td>
                        <td className="px-4 py-3.5">{sale.buyer_name || sale.buyer_email || "—"}</td>
                        <td className="px-4 py-3.5">{sale.utm_campaign || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-hairline select-none">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="mac-btn-secondary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="text-[10px] text-ink-tertiary font-mono font-bold uppercase tracking-wider">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="mac-btn-secondary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile: cards */}
          <div className="block md:hidden space-y-3">
            {paginatedSales.map((sale) => {
              const badge = statusBadge(sale.status);
              return (
                <div key={sale.id} className="mac-card rounded-mac-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {sale.products?.name || "—"}
                      </p>
                      <p className="text-[10px] font-mono text-ink-tertiary">
                        {formatDate(sale.occurred_at)} · {PLATFORM_LABELS[sale.platform] || sale.platform}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase shrink-0 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-bold text-zinc-100">
                      {formatAmount(sale.gross_amount, sale.currency)}
                    </span>
                    <span className="font-mono text-ink-tertiary">
                      Líq. {formatAmount(sale.net_amount, sale.currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-hairline space-y-1 text-[11px] text-ink-secondary">
                    <p className="truncate">{sale.buyer_name || sale.buyer_email || "—"}</p>
                    {sale.utm_campaign && (
                      <p className="truncate font-mono text-ink-tertiary">UTM: {sale.utm_campaign}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-2 py-2 select-none">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="mac-btn-secondary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="text-[10px] text-ink-tertiary font-mono font-bold uppercase tracking-wider">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="mac-btn-secondary text-white text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
