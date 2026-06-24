import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { useAdsData } from "../../hooks/useAdsData";

interface ProductRow {
  id: string;
  operator: string;
  name: string;
  ticket_type: "low" | "high" | null;
  price: number | null;
  currency: string | null;
  platform: string | null;
  external_product_id: string | null;
  fb_pixel_id: string | null;
  status: string | null;
  created_at: string;
}

const PLATFORM_OPTIONS = ["Hotmart", "Kiwify", "Wiapy", "Lowify", "Outro"];

interface ProductFormState {
  name: string;
  ticket_type: "low" | "high";
  price: string;
  currency: string;
  platform: string;
  external_product_id: string;
  fb_pixel_id: string;
  status: "active" | "inactive";
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  ticket_type: "low",
  price: "",
  currency: "BRL",
  platform: PLATFORM_OPTIONS[0],
  external_product_id: "",
  fb_pixel_id: "",
  status: "active"
};

function formatPrice(price: number | null, currency: string | null): string {
  if (price === null || price === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL"
  }).format(price);
}

interface ProductFormModalProps {
  initial: ProductFormState;
  isEdit: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (form: ProductFormState) => Promise<void>;
}

function ProductFormModal({ initial, isEdit, saving, onClose, onSave }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductFormState>(initial);
  const [errorInput, setErrorInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInput("");

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setErrorInput("Nome do produto é obrigatório.");
      return;
    }

    try {
      await onSave({ ...form, name: trimmedName, currency: form.currency.trim() || "BRL" });
    } catch (err: any) {
      setErrorInput(err.message || "Erro desconhecido ao salvar o produto.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#050506]/92 backdrop-blur-md cursor-pointer"
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg mac-card rounded-mac-lg overflow-hidden shadow-[0_0_50px_rgba(255,42,42,0.15)] flex flex-col max-h-[85vh]"
      >
        <div className="h-1 bg-gradient-to-r from-red-500 via-primary to-orange-500" />

        <div className="p-5 border-b border-hairline flex items-center justify-between bg-surface-base">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isEdit ? "Editar Produto" : "Novo Produto"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-none">
          {errorInput && (
            <div className="p-3.5 rounded-mac-md bg-systemRed/10 border border-systemRed/25 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-systemRed shrink-0 mt-0.5" />
              <div className="text-[11px] text-red-200 leading-normal font-medium">{errorInput}</div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Nome do Produto <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Curso Tráfego Pago Avançado"
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                Tipo de Ticket
              </label>
              <select
                value={form.ticket_type}
                onChange={(e) => setForm((f) => ({ ...f, ticket_type: e.target.value as "low" | "high" }))}
                className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none cursor-pointer"
                disabled={saving}
              >
                <option value="low">Low Ticket</option>
                <option value="high">High Ticket</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "inactive" }))}
                className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none cursor-pointer"
                disabled={saving}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                Preço
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0.00"
                className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
                disabled={saving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                Moeda
              </label>
              <input
                type="text"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                placeholder="BRL"
                maxLength={3}
                className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none uppercase"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Plataforma
            </label>
            <select
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none cursor-pointer"
              disabled={saving}
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              ID do Produto na Plataforma
            </label>
            <input
              type="text"
              value={form.external_product_id}
              onChange={(e) => setForm((f) => ({ ...f, external_product_id: e.target.value }))}
              placeholder="Ex: PROD123ABC"
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Pixel ID (Meta)
            </label>
            <input
              type="text"
              value={form.fb_pixel_id}
              onChange={(e) => setForm((f) => ({ ...f, fb_pixel_id: e.target.value }))}
              placeholder="Ex: 1234567890123456"
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            />
          </div>
        </form>

        <div className="p-5 border-t border-hairline bg-surface-base flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 mac-btn-secondary text-white rounded-mac-sm text-xs font-bold tracking-wide transition-all cursor-pointer"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 mac-btn-primary text-white rounded-mac-sm text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer"
            disabled={saving}
          >
            {saving ? (
              "Salvando..."
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> {isEdit ? "Salvar Alterações" : "Criar Produto"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AdsProducts() {
  const { useAdsTable } = useAdsData();
  const productsTable = useAdsTable<ProductRow>("products");

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    const res = await productsTable.list("*", (q) => q.order("created_at", { ascending: false }));
    if (res.success) {
      setProducts(res.data);
    } else {
      setError(res.error);
    }
    setIsLoading(false);
  }, [productsTable]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreateForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditForm = (product: ProductRow) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSave = async (form: ProductFormState) => {
    setIsSaving(true);
    setError(null);
    try {
      const values: Partial<ProductRow> = {
        name: form.name,
        ticket_type: form.ticket_type,
        price: form.price ? Number(form.price) : null,
        currency: form.currency,
        platform: form.platform,
        external_product_id: form.external_product_id || null,
        fb_pixel_id: form.fb_pixel_id || null,
        status: form.status
      };

      const res = editingProduct
        ? await productsTable.update(editingProduct.id, values)
        : await productsTable.insert(values);

      if (!res.success) throw new Error(res.error);

      closeForm();
      await loadProducts();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (product: ProductRow) => {
    const confirmed = window.confirm(`Excluir o produto "${product.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeletingId(product.id);
    setError(null);
    try {
      const res = await productsTable.remove(product.id);
      if (!res.success) throw new Error(res.error);
      await loadProducts();
    } catch (err: any) {
      setError(err.message || "Erro ao excluir produto.");
    } finally {
      setDeletingId(null);
    }
  };

  const formInitial: ProductFormState = editingProduct
    ? {
        name: editingProduct.name,
        ticket_type: editingProduct.ticket_type || "low",
        price: editingProduct.price !== null && editingProduct.price !== undefined ? String(editingProduct.price) : "",
        currency: editingProduct.currency || "BRL",
        platform: editingProduct.platform || PLATFORM_OPTIONS[0],
        external_product_id: editingProduct.external_product_id || "",
        fb_pixel_id: editingProduct.fb_pixel_id || "",
        status: (editingProduct.status as "active" | "inactive") || "active"
      }
    : EMPTY_FORM;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
          {products.length} produto{products.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={openCreateForm}
          className="px-3.5 py-2 bg-primary hover:bg-red-650 text-white text-[11px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Produto
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-systemRed text-xs bg-systemRed/10 border border-systemRed/25 rounded-mac-md px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="mac-card rounded-mac-lg p-12 flex items-center justify-center text-ink-tertiary text-xs font-sans">
          Carregando produtos...
        </div>
      ) : products.length === 0 ? (
        <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
          <Package className="w-6 h-6 text-ink-tertiary" />
          <span className="text-xs text-ink-secondary font-sans font-semibold">
            Nenhum produto cadastrado. Clique em "Novo Produto".
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
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Preço</th>
                    <th className="px-4 py-3">Plataforma</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink-secondary">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-surface-raised/50 transition-all">
                      <td className="px-4 py-3.5 font-bold text-white">{product.name}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase ${
                            product.ticket_type === "high"
                              ? "bg-systemPurple/15 text-systemPurple"
                              : "bg-systemBlue/15 text-systemBlue"
                          }`}
                        >
                          {product.ticket_type === "high" ? "High" : "Low"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono">{formatPrice(product.price, product.currency)}</td>
                      <td className="px-4 py-3.5">{product.platform || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase ${
                            product.status === "active" ? "text-systemGreen" : "text-ink-tertiary"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              product.status === "active" ? "bg-systemGreen" : "bg-ink-tertiary"
                            }`}
                          />
                          {product.status === "active" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditForm(product)}
                            title="Editar produto"
                            className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product)}
                            disabled={deletingId === product.id}
                            title="Excluir produto"
                            className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-systemRed hover:bg-systemRed/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="block md:hidden space-y-3">
            {products.map((product) => (
              <div key={product.id} className="mac-card rounded-mac-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{product.name}</p>
                    <p className="text-[10px] font-mono text-ink-tertiary">{product.platform || "—"}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-mac-sm text-[10px] font-bold font-mono uppercase shrink-0 ${
                      product.ticket_type === "high"
                        ? "bg-systemPurple/15 text-systemPurple"
                        : "bg-systemBlue/15 text-systemBlue"
                    }`}
                  >
                    {product.ticket_type === "high" ? "High" : "Low"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-zinc-100">
                    {formatPrice(product.price, product.currency)}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase ${
                      product.status === "active" ? "text-systemGreen" : "text-ink-tertiary"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        product.status === "active" ? "bg-systemGreen" : "bg-ink-tertiary"
                      }`}
                    />
                    {product.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                  <button
                    onClick={() => openEditForm(product)}
                    className="flex-1 px-3 py-2 bg-surface-base border border-hairline hover:border-primary/40 hover:text-white text-ink-secondary text-[10px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product.id}
                    className="flex-1 px-3 py-2 bg-surface-base border border-hairline hover:border-systemRed/40 hover:text-systemRed disabled:opacity-40 disabled:cursor-not-allowed text-ink-secondary text-[10px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    <Trash2 className="w-3 h-3" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isFormOpen && (
        <ProductFormModal
          initial={formInitial}
          isEdit={!!editingProduct}
          saving={isSaving}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
