import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  Webhook,
  Plus,
  Pencil,
  X,
  Check,
  AlertCircle,
  Info,
  Send,
  Trash2,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { useAdsData } from "../../hooks/useAdsData";
import { useOperator } from "../../contexts/OperatorContext";

interface PixelRow {
  id: string;
  fb_pixel_id: string;
  name: string | null;
}

interface CapiConfigRow {
  id: string;
  operator: string;
  pixel_id: string | null;
  fb_pixel_id: string;
  capi_access_token_masked: string;
  test_event_code: string | null;
  event_map: Record<string, string> | null;
  is_active: boolean;
  created_at: string;
  pixels?: { name: string | null; fb_pixel_id: string } | null;
}

interface CapiFormState {
  pixelId: string;
  fbPixelId: string;
  capiAccessToken: string;
  testEventCode: string;
  eventMap: Array<{ key: string; value: string }>;
  isActive: boolean;
}

const EMPTY_FORM: CapiFormState = {
  pixelId: "",
  fbPixelId: "",
  capiAccessToken: "",
  testEventCode: "",
  eventMap: [],
  isActive: true
};

function eventMapToRows(eventMap: Record<string, string> | null): Array<{ key: string; value: string }> {
  if (!eventMap) return [];
  return Object.entries(eventMap).map(([key, value]) => ({ key, value: String(value) }));
}

function rowsToEventMap(rows: Array<{ key: string; value: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    const key = row.key.trim();
    const value = row.value.trim();
    if (key && value) map[key] = value;
  }
  return map;
}

interface CapiFormModalProps {
  initial: CapiFormState;
  isEdit: boolean;
  pixels: PixelRow[];
  saving: boolean;
  onClose: () => void;
  onSave: (form: CapiFormState) => Promise<void>;
}

function CapiFormModal({ initial, isEdit, pixels, saving, onClose, onSave }: CapiFormModalProps) {
  const [form, setForm] = useState<CapiFormState>(initial);
  const [errorInput, setErrorInput] = useState("");

  const handlePixelChange = (pixelId: string) => {
    const pixel = pixels.find((p) => p.id === pixelId);
    setForm((f) => ({ ...f, pixelId, fbPixelId: pixel?.fb_pixel_id || "" }));
  };

  const addEventMapRow = () => {
    setForm((f) => ({ ...f, eventMap: [...f.eventMap, { key: "", value: "" }] }));
  };

  const updateEventMapRow = (index: number, field: "key" | "value", text: string) => {
    setForm((f) => ({
      ...f,
      eventMap: f.eventMap.map((row, i) => (i === index ? { ...row, [field]: text } : row))
    }));
  };

  const removeEventMapRow = (index: number) => {
    setForm((f) => ({ ...f, eventMap: f.eventMap.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInput("");

    if (!form.pixelId || !form.fbPixelId) {
      setErrorInput("Selecione um pixel.");
      return;
    }
    if (!isEdit && !form.capiAccessToken.trim()) {
      setErrorInput("Token de acesso da CAPI é obrigatório.");
      return;
    }

    try {
      await onSave({ ...form, capiAccessToken: form.capiAccessToken.trim() });
    } catch (err: any) {
      setErrorInput(err.message || "Erro desconhecido ao salvar a configuração.");
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
            <Webhook className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {isEdit ? "Editar Config. CAPI" : "Nova Config. CAPI"}
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
              Pixel <span className="text-primary">*</span>
            </label>
            <select
              required
              value={form.pixelId}
              onChange={(e) => handlePixelChange(e.target.value)}
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            >
              <option value="">Selecione um pixel...</option>
              {pixels.map((pixel) => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name || pixel.fb_pixel_id} ({pixel.fb_pixel_id})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Token de Acesso CAPI {isEdit ? "" : <span className="text-primary">*</span>}
            </label>
            <input
              type="password"
              value={form.capiAccessToken}
              onChange={(e) => setForm((f) => ({ ...f, capiAccessToken: e.target.value }))}
              placeholder={isEdit ? "Deixe em branco para manter o token atual" : "Token de acesso gerado no Events Manager"}
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Código de Evento de Teste
            </label>
            <input
              type="text"
              value={form.testEventCode}
              onChange={(e) => setForm((f) => ({ ...f, testEventCode: e.target.value }))}
              placeholder="Ex: TEST12345"
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                Mapa de Eventos
              </label>
              <button
                type="button"
                onClick={addEventMapRow}
                className="px-2.5 py-1 bg-surface-base border border-hairline hover:border-primary/40 hover:text-white text-ink-secondary text-[10px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                disabled={saving}
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            <p className="text-[10px] text-ink-tertiary font-semibold">
              Evento interno → Evento Meta (ex: <code className="font-mono">purchase_webhook</code> →{" "}
              <code className="font-mono">Purchase</code>)
            </p>
            {form.eventMap.length === 0 ? (
              <div className="text-[10.5px] text-ink-tertiary font-semibold italic py-2">
                Nenhum mapeamento adicionado.
              </div>
            ) : (
              <div className="space-y-2">
                {form.eventMap.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateEventMapRow(index, "key", e.target.value)}
                      placeholder="Evento interno"
                      className="flex-1 mac-input px-3 py-2 rounded-mac-sm text-xs font-sans outline-none"
                      disabled={saving}
                    />
                    <span className="text-ink-tertiary text-xs">→</span>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateEventMapRow(index, "value", e.target.value)}
                      placeholder="Evento Meta"
                      className="flex-1 mac-input px-3 py-2 rounded-mac-sm text-xs font-sans outline-none"
                      disabled={saving}
                    />
                    <button
                      type="button"
                      onClick={() => removeEventMapRow(index)}
                      className="p-2 rounded-mac-sm text-ink-secondary hover:text-systemRed hover:bg-systemRed/10 transition-all cursor-pointer"
                      disabled={saving}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className="w-full flex items-center justify-between p-3 rounded-mac-sm bg-surface-base border border-hairline cursor-pointer"
            disabled={saving}
          >
            <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Ativa
            </span>
            {form.isActive ? (
              <ToggleRight className="w-6 h-6 text-systemGreen" />
            ) : (
              <ToggleLeft className="w-6 h-6 text-ink-tertiary" />
            )}
          </button>
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
                <Check className="w-3.5 h-3.5" /> {isEdit ? "Salvar Alterações" : "Criar Configuração"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AdsCapi() {
  const operator = useOperator();
  const { useAdsTable } = useAdsData();
  const pixelsTable = useAdsTable<PixelRow>("pixels");

  const [pixels, setPixels] = useState<PixelRow[]>([]);
  const [configs, setConfigs] = useState<CapiConfigRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CapiConfigRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<Record<string, { success: boolean; message: string }>>({});

  const loadPixels = useCallback(async () => {
    const res = await pixelsTable.list("*", (q) => q.order("created_at", { ascending: false }));
    if (res.success) setPixels(res.data);
  }, [pixelsTable]);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ads/capi/configs?operator=${encodeURIComponent(operator)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao buscar configurações de CAPI.");
      setConfigs(data.configs || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar configurações de CAPI.");
    } finally {
      setIsLoading(false);
    }
  }, [operator]);

  useEffect(() => {
    loadPixels();
    loadConfigs();
  }, [loadPixels, loadConfigs]);

  const openCreateForm = () => {
    setEditingConfig(null);
    setIsFormOpen(true);
  };

  const openEditForm = (config: CapiConfigRow) => {
    setEditingConfig(config);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingConfig(null);
  };

  const handleSave = async (form: CapiFormState) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ads/capi/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator,
          pixelId: form.pixelId,
          fbPixelId: form.fbPixelId,
          capiAccessToken: form.capiAccessToken || undefined,
          testEventCode: form.testEventCode || null,
          eventMap: rowsToEventMap(form.eventMap),
          isActive: form.isActive,
          configId: editingConfig?.id
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Erro ao salvar configuração de CAPI.");

      closeForm();
      await loadConfigs();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (config: CapiConfigRow) => {
    setTestingId(config.id);
    setTestFeedback((prev) => {
      const next = { ...prev };
      delete next[config.id];
      return next;
    });
    try {
      const res = await fetch("/api/ads/capi/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capiConfigId: config.id })
      });
      const data = await res.json();
      if (!data.success) {
        setTestFeedback((prev) => ({
          ...prev,
          [config.id]: { success: false, message: data.error || "Erro ao enviar evento de teste." }
        }));
      } else {
        setTestFeedback((prev) => ({
          ...prev,
          [config.id]: { success: true, message: "Evento de teste enviado com sucesso." }
        }));
      }
    } catch (err: any) {
      setTestFeedback((prev) => ({
        ...prev,
        [config.id]: { success: false, message: err.message || "Falha na comunicação com o servidor." }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const formInitial: CapiFormState = editingConfig
    ? {
        pixelId: editingConfig.pixel_id || "",
        fbPixelId: editingConfig.fb_pixel_id,
        capiAccessToken: "",
        testEventCode: editingConfig.test_event_code || "",
        eventMap: eventMapToRows(editingConfig.event_map),
        isActive: editingConfig.is_active
      }
    : EMPTY_FORM;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 text-ink-secondary bg-surface-base border border-hairline rounded-mac-md px-4 py-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[10.5px] leading-relaxed font-semibold">
          Risco de double-counting: se a plataforma de checkout já envia o evento de Purchase
          nativamente para o mesmo Pixel ID (via Pixel/CAPI próprio dela), o Meta pode contar
          esse evento duas vezes ao usar também a CAPI deste sistema. É uma limitação conhecida
          e aceita do modelo — o mesmo trade-off de ferramentas como a UTMIFY.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
          {configs.length} configuração{configs.length === 1 ? "" : "ões"}
        </span>
        <button
          onClick={openCreateForm}
          className="px-3.5 py-2 bg-primary hover:bg-red-650 text-white text-[11px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Configuração
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
          Carregando configurações...
        </div>
      ) : configs.length === 0 ? (
        <div className="mac-card rounded-mac-lg p-12 flex flex-col items-center justify-center text-center gap-2 select-none">
          <Webhook className="w-6 h-6 text-ink-tertiary" />
          <span className="text-xs text-ink-secondary font-sans font-semibold">
            Nenhuma configuração de CAPI cadastrada. Clique em "Nova Configuração".
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
                    <th className="px-4 py-3">Pixel</th>
                    <th className="px-4 py-3">Token</th>
                    <th className="px-4 py-3">Evento Teste</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline text-ink-secondary">
                  {configs.map((config) => (
                    <React.Fragment key={config.id}>
                      <tr className="hover:bg-surface-raised/50 transition-all">
                        <td className="px-4 py-3.5 font-bold text-white">
                          {config.pixels?.name || config.fb_pixel_id}
                          <div className="text-[10px] font-mono text-ink-tertiary font-normal">{config.fb_pixel_id}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono">{config.capi_access_token_masked || "—"}</td>
                        <td className="px-4 py-3.5 font-mono">{config.test_event_code || "—"}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase ${
                              config.is_active ? "text-systemGreen" : "text-ink-tertiary"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                config.is_active ? "bg-systemGreen" : "bg-ink-tertiary"
                              }`}
                            />
                            {config.is_active ? "ativa" : "inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleTest(config)}
                              disabled={testingId === config.id}
                              title="Enviar evento de teste"
                              className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditForm(config)}
                              title="Editar configuração"
                              className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {testFeedback[config.id] && (
                        <tr>
                          <td colSpan={5} className="px-4 pb-3">
                            <div
                              className={`text-[10.5px] font-semibold rounded-mac-sm px-3 py-2 border ${
                                testFeedback[config.id].success
                                  ? "text-systemGreen bg-systemGreen/10 border-systemGreen/25"
                                  : "text-systemRed bg-systemRed/10 border-systemRed/25"
                              }`}
                            >
                              {testFeedback[config.id].message}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: cards */}
          <div className="block md:hidden space-y-3">
            {configs.map((config) => (
              <div key={config.id} className="mac-card rounded-mac-lg overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {config.pixels?.name || config.fb_pixel_id}
                      </p>
                      <p className="text-[10px] font-mono text-ink-tertiary truncate">{config.fb_pixel_id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase shrink-0 ${
                        config.is_active ? "text-systemGreen" : "text-ink-tertiary"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          config.is_active ? "bg-systemGreen" : "bg-ink-tertiary"
                        }`}
                      />
                      {config.is_active ? "ativa" : "inativa"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-ink-tertiary">{config.capi_access_token_masked || "—"}</span>
                    <span className="font-mono text-ink-tertiary">{config.test_event_code || "—"}</span>
                  </div>
                  {testFeedback[config.id] && (
                    <div
                      className={`text-[10.5px] font-semibold rounded-mac-sm px-3 py-2 border ${
                        testFeedback[config.id].success
                          ? "text-systemGreen bg-systemGreen/10 border-systemGreen/25"
                          : "text-systemRed bg-systemRed/10 border-systemRed/25"
                      }`}
                    >
                      {testFeedback[config.id].message}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-hairline">
                    <button
                      onClick={() => handleTest(config)}
                      disabled={testingId === config.id}
                      className="flex-1 px-3 py-2 bg-surface-base border border-hairline hover:border-primary/40 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-ink-secondary text-[10px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <Send className="w-3 h-3" />
                      Testar
                    </button>
                    <button
                      onClick={() => openEditForm(config)}
                      className="flex-1 px-3 py-2 bg-surface-base border border-hairline hover:border-primary/40 hover:text-white text-ink-secondary text-[10px] font-bold rounded-mac-sm transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {isFormOpen && (
        <CapiFormModal
          initial={formInitial}
          isEdit={!!editingConfig}
          pixels={pixels}
          saving={isSaving}
          onClose={closeForm}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
