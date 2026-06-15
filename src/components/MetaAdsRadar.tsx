import React, { useState, useEffect } from "react";
import { Plus, Trash2, Copy, Check, Database, Tag, Sparkles, X, AlertCircle, Info, RefreshCw, Layers, Pencil } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface RadarCategory {
  id: string;
  name: string;
  description: string;
  created_at?: string;
}

interface RadarKeyword {
  id: string;
  category_id: string;
  word: string;
  created_at?: string;
}

interface PopulatedCategory extends RadarCategory {
  keywords: RadarKeyword[];
}

export function MetaAdsRadar() {
  const [categories, setCategories] = useState<PopulatedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSqlVisible, setIsSqlVisible] = useState(false);

  // States for category form inside modal
  const [editingCategory, setEditingCategory] = useState<PopulatedCategory | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [currentKeywordInput, setCurrentKeywordInput] = useState("");
  const [stagedKeywords, setStagedKeywords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Copy-feedback states
  const [copiedKeywordId, setCopiedKeywordId] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toastText, setToastText] = useState("");
  const [isSqlCopied, setIsSqlCopied] = useState(false);

  // Load categories and keywords from Supabase
  const loadRadarData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      // Fallback seed categories if Supabase is not ready
      const stored = localStorage.getItem("minerador_local_radar");
      if (stored) {
        try {
          setCategories(JSON.parse(stored));
        } catch (e) {
          setCategories(DEMO_RADAR_DATA);
        }
      } else {
        setCategories(DEMO_RADAR_DATA);
      }
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Fetch categories
      const { data: catData, error: catErr } = await supabase
        .from("radar_categories")
        .select("*")
        .order("created_at", { ascending: true });

      if (catErr) throw catErr;

      if (!catData || catData.length === 0) {
        setCategories([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all keywords
      const { data: kwData, error: kwErr } = await supabase
        .from("radar_keywords")
        .select("*")
        .order("created_at", { ascending: true });

      if (kwErr) throw kwErr;

      // 3. Populate categories with keywords
      const populated: PopulatedCategory[] = catData.map((cat) => {
        const catKeywords = (kwData || []).filter((kw) => kw.category_id === cat.id);
        return {
          ...cat,
          keywords: catKeywords,
        };
      });

      setCategories(populated);
    } catch (err: any) {
      console.error("Erro ao carregar dados do Radar do Supabase:", err);
      setErrorMsg(
        err.message === "relation \"public.radar_categories\" does not exist"
          ? "As tabelas 'radar_categories' e 'radar_keywords' não foram criadas no seu banco de dados do Supabase. Use o script SQL abaixo para criá-las!"
          : `Erro de conexão com o Supabase: ${err.message || err}`
      );
      // Fallback tool
      const stored = localStorage.getItem("minerador_local_radar");
      if (stored) {
        try {
          setCategories(JSON.parse(stored));
        } catch (e) {
          setCategories(DEMO_RADAR_DATA);
        }
      } else {
        setCategories(DEMO_RADAR_DATA);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRadarData();
  }, []);

  // Modal actions helpers
  const openCreateModal = () => {
    setEditingCategory(null);
    setNewCatName("");
    setNewCatDesc("");
    setStagedKeywords([]);
    setCurrentKeywordInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: PopulatedCategory) => {
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || "");
    setStagedKeywords(cat.keywords.map((kw) => kw.word));
    setCurrentKeywordInput("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setNewCatName("");
    setNewCatDesc("");
    setStagedKeywords([]);
    setCurrentKeywordInput("");
  };

  // Copy keyword to clipboard helper
  const handleCopyKeyword = (word: string, kwId: string) => {
    navigator.clipboard.writeText(word);
    setCopiedKeywordId(kwId);
    setToastText(`Copiado: "${word}"`);
    setShowCopyToast(true);

    // Reset feedback
    setTimeout(() => {
      setCopiedKeywordId(null);
    }, 1500);

    setTimeout(() => {
      setShowCopyToast(false);
    }, 2500);
  };

  // Add a keyword to the temporary staging list in modal
  const handleAddStagedKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = currentKeywordInput.trim();
    if (!trimmed) return;

    // Avoid duplication in staging
    if (!stagedKeywords.includes(trimmed)) {
      setStagedKeywords([...stagedKeywords, trimmed]);
    }
    setCurrentKeywordInput("");
  };

  // Key event on staging keywords input (allows pressing Enter)
  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddStagedKeyword();
    }
  };

  // Remove keyword from staging
  const handleRemoveStagedKeyword = (index: number) => {
    const updated = [...stagedKeywords];
    updated.splice(index, 1);
    setStagedKeywords(updated);
  };

  // Save new category & staging keywords to Supabase or LocalStorage
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const catNameTrimmed = newCatName.trim();
    if (!catNameTrimmed) {
      alert("Por favor insira um nome de categoria.");
      return;
    }

    setIsSaving(true);

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Local mode fallback
        let updatedCats: PopulatedCategory[] = [];
        if (editingCategory) {
          // Editing existing local
          updatedCats = categories.map((c) => {
            if (c.id === editingCategory.id) {
              return {
                ...c,
                name: catNameTrimmed,
                description: newCatDesc.trim(),
                keywords: stagedKeywords.map((word) => ({
                  id: crypto.randomUUID(),
                  category_id: editingCategory.id,
                  word,
                })),
              };
            }
            return c;
          });
        } else {
          // Creating new local
          const mockNewId = crypto.randomUUID();
          const mockCat: PopulatedCategory = {
            id: mockNewId,
            name: catNameTrimmed,
            description: newCatDesc.trim(),
            keywords: stagedKeywords.map((word) => ({
              id: crypto.randomUUID(),
              category_id: mockNewId,
              word,
            })),
          };
          updatedCats = [...categories, mockCat];
        }
        
        setCategories(updatedCats);
        localStorage.setItem("minerador_local_radar", JSON.stringify(updatedCats));
        closeModal();
        return;
      }

      if (editingCategory) {
        // 1. Update existing category
        const { error: catUpdateErr } = await supabase
          .from("radar_categories")
          .update({ name: catNameTrimmed, description: newCatDesc.trim() })
          .eq("id", editingCategory.id);

        if (catUpdateErr) throw catUpdateErr;

        // 2. Clear old keywords
        const { error: kwDeleteErr } = await supabase
          .from("radar_keywords")
          .delete()
          .eq("category_id", editingCategory.id);

        if (kwDeleteErr) throw kwDeleteErr;

        // 3. Insert updated list
        if (stagedKeywords.length > 0) {
          const keywordsToInsert = stagedKeywords.map((word) => ({
            category_id: editingCategory.id,
            word: word.trim(),
          }));

          const { error: kwInsertErr } = await supabase
            .from("radar_keywords")
            .insert(keywordsToInsert);

          if (kwInsertErr) throw kwInsertErr;
        }
      } else {
        // 1. Insert category
        const { data: newCat, error: catInsertErr } = await supabase
          .from("radar_categories")
          .insert([{ name: catNameTrimmed, description: newCatDesc.trim() }])
          .select()
          .single();

        if (catInsertErr) throw catInsertErr;

        // 2. Insert keys of that category in bulk
        if (stagedKeywords.length > 0 && newCat) {
          const keywordsToInsert = stagedKeywords.map((word) => ({
            category_id: newCat.id,
            word: word.trim(),
          }));

          const { error: kwInsertErr } = await supabase
            .from("radar_keywords")
            .insert(keywordsToInsert);

          if (kwInsertErr) throw kwInsertErr;
        }
      }

      // 3. Reload from remote
      await loadRadarData();
      closeModal();
    } catch (err: any) {
      console.error("Erro ao salvar categoria no Supabase:", err);
      alert(`Falha ao salvar no banco de dados: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete category from database
  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm("Deseja realmente remover esta categoria e todas as suas palavras-chave?")) {
      return;
    }

    try {
      if (!isSupabaseConfigured || !supabase) {
        // Local Mode deletion
        const updated = categories.filter((c) => c.id !== catId);
        setCategories(updated);
        localStorage.setItem("minerador_local_radar", JSON.stringify(updated));
        return;
      }

      const { error } = await supabase
        .from("radar_categories")
        .delete()
        .eq("id", catId);

      if (error) throw error;

      await loadRadarData();
    } catch (err: any) {
      console.error("Erro ao deletar categoria no Supabase:", err);
      alert(`Erro ao remover categoria: ${err.message}`);
    }
  };

  // Re-fetch custom saved locals on load if not configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem("minerador_local_radar");
      if (stored) {
        try {
          setCategories(JSON.parse(stored));
        } catch (e) {
          console.error("Erro parseando radar local:", e);
        }
      }
    }
  }, [isSupabaseConfigured]);

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(RADAR_SQL_SCRIPT);
    setIsSqlCopied(true);
    setTimeout(() => setIsSqlCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in text-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mac-card p-6 select-none">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#FF453A] animate-pulse"></span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest font-mono">AD-RADAR INTELLIGENCE</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">Radar Meta Ads</h2>
          <p className="text-xs text-ink-secondary">
            Copie palavras de alta intenção com 1 clique para colar no campo de pesquisa da Biblioteca de Anúncios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRadarData()}
            className="w-11 h-11 flex items-center justify-center mac-btn-secondary text-zinc-400 hover:text-white cursor-pointer"
            title="Sincronizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 mac-btn-primary text-white text-xs font-bold tracking-wide cursor-pointer h-11"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* ERROR / INFO WARNING FOR SQL NOT SETUP */}
      {errorMsg && (
        <div className="bg-systemRed/10 border border-systemRed/25 rounded-mac-lg p-4 flex gap-3 text-xs text-red-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-systemRed" />
          <div className="space-y-2">
            <p className="font-bold">Aviso de Configuração:</p>
            <p>{errorMsg}</p>
            <button
              onClick={() => setIsSqlVisible(true)}
              className="px-3 py-1.5 bg-systemRed/20 hover:bg-systemRed/30 border border-systemRed/25 rounded-mac-sm font-mono text-[10px] uppercase font-bold tracking-wider text-rose-300 transition-all cursor-pointer"
            >
              Ver Script SQL de Ajuste
            </button>
          </div>
        </div>
      )}

      {/* KANBAN HORIZONTAL COLUMNS GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-ink-tertiary font-mono">Buscando dados no Supabase...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="mac-card p-10 text-center space-y-4 select-none">
          <div className="w-12 h-12 rounded-full bg-surface-raised border border-hairline flex items-center justify-center mx-auto text-ink-secondary">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Nenhum canal ou categoria ativa</h4>
            <p className="text-xs text-ink-secondary max-w-md mx-auto leading-relaxed">
              Adicione categorias com palavras-chave relevantes para o Meta Ads. Você pode usar o botão "Nova Categoria" para criar a sua agora mesmo.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 mac-btn-secondary text-white text-xs font-bold ml-auto mr-auto"
          >
            Começar Agora
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-6 -mx-1 px-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="flex gap-5 min-w-max">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="w-80 mac-card p-5 flex flex-col justify-between space-y-5 shadow-lg transition-all hover:bg-surface-raised"
              >
                {/* Column header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="font-bold text-sm text-white tracking-wide leading-snug">{cat.name}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 rounded-mac-sm text-zinc-500 hover:text-white hover:bg-surface-base transition-all cursor-pointer"
                        title="Editar Categoria / Palavras-chave"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-mac-sm text-zinc-600 hover:text-systemRed hover:bg-systemRed/10 transition-all cursor-pointer"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  
                  {cat.description && (
                    <p className="text-[11px] text-ink-secondary leading-relaxed font-medium">
                      {cat.description}
                    </p>
                  )}
                  
                  <div className="border-b border-hairline pt-1.5"></div>
                </div>

                {/* Keyword Pills Panel */}
                <div className="flex-1 flex flex-wrap gap-2 content-start min-h-[140px]">
                  {cat.keywords.length === 0 ? (
                    <div className="w-full flex flex-col items-center justify-center p-6 border border-dashed border-hairline rounded-mac-md text-center select-none text-[10px] text-ink-tertiary">
                      Sem palavras-chave
                    </div>
                  ) : (
                    cat.keywords.map((kw) => {
                      const isCopied = copiedKeywordId === kw.id;
                      return (
                        <button
                          key={kw.id}
                          onClick={() => handleCopyKeyword(kw.word, kw.id)}
                          className={`group relative flex items-center gap-1.5 pl-3 pr-2.5 py-2.5 rounded-mac-md text-[11px] font-sans font-bold tracking-wide border cursor-pointer select-none transition-all active:scale-[0.93] min-h-[38px] ${
                            isCopied
                              ? "bg-systemGreen/15 border-systemGreen/30 text-systemGreen shadow-[0_0_10px_rgba(48,209,88,0.15)]"
                              : "bg-surface-raised border border-hairline hover:bg-surface-raised/40 text-ink-secondary hover:text-white"
                          }`}
                        >
                          <Tag className={`w-3 h-3 transition-transform duration-200 group-hover:rotate-12 ${isCopied ? "text-systemGreen" : "text-primary"}`} />
                          
                          <span>{kw.word}</span>
                          
                          {isCopied ? (
                            <Check className="w-3 h-3 text-systemGreen animate-scale-in" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Foot indicators */}
                <div className="pt-2 select-none">
                  <span className="text-[9px] font-mono font-bold text-ink-tertiary uppercase tracking-widest">
                    {cat.keywords.length} PALAVRAS-CHAVE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* NEW CATEGORY MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 mac-glass z-50 flex items-center justify-center p-4 animate-fade-in font-sans">
          <div className="w-full max-w-lg mac-card overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Head */}
            <div className="p-5 border-b border-hairline flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingCategory ? "Editar Categoria Radar" : "Nova Categoria Radar"}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-surface-base transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCategory} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Category Name Area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-ink-secondary tracking-wider font-mono">
                  Nome da Categoria <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Emagrecimento, Dropshipping, Renda Extra..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full mac-input text-white text-sm outline-none px-4 py-3"
                  style={{ fontSize: "16px" }} // Prevent iOS auto-zoom
                />
              </div>

              {/* Description field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase text-ink-secondary tracking-wider font-mono">
                  Descrição / Objetivo (Opcional)
                </label>
                <textarea
                  placeholder="Ex: Termos e ganchos de busca para nicho esportivo"
                  rows={2}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full mac-input text-white text-sm outline-none px-4 py-3 rounded-2xl resize-none"
                  style={{ fontSize: "16px" }}
                />
              </div>

              {/* Keywords dynamic adding inputs */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-ink-secondary tracking-wider font-mono block">
                  Adicionar Palavras-Chave
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escreva uma palavra e tecle enter"
                    value={currentKeywordInput}
                    onChange={(e) => setCurrentKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    className="flex-1 mac-input text-white text-sm outline-none px-4 py-3"
                    style={{ fontSize: "16px" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddStagedKeyword()}
                    className="px-4 mac-btn-secondary text-white text-xs font-bold font-sans cursor-pointer whitespace-nowrap"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Staging pills indicator */}
                <div className="border border-hairline bg-surface-base p-3 rounded-mac-lg min-h-[90px] flex flex-wrap gap-2 content-start">
                  {stagedKeywords.length === 0 ? (
                    <span className="text-[10px] text-ink-tertiary self-center mx-auto select-none font-mono">
                      Nenhuma palavra adicionada no rascunho
                    </span>
                  ) : (
                    stagedKeywords.map((word, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 bg-primary/10 border border-primary/25 text-white rounded-mac-lg pl-2.5 pr-1.5 py-1 text-[11px] font-semibold animate-scale-in"
                      >
                        <span>{word}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedKeyword(index)}
                          className="p-0.5 hover:bg-white/10 rounded-mac-sm text-ink-tertiary hover:text-systemRed cursor-pointer transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="pt-4 border-t border-hairline flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 text-ink-secondary hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 mac-btn-primary text-white disabled:opacity-50 font-bold text-xs tracking-wide cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      Salvar Radar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOAT GLOBAL SATISFYING CLIPBOARD TOAST */}
      {showCopyToast && (
        <div className="fixed bottom-6 right-6 z-[80] bg-systemGreen text-white px-5 py-3 rounded-mac-lg shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-slide-up select-none tracking-wide">
          <Check className="w-4 h-4 text-white" />
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}

// Demo placeholders if database connection is not synced yet
const DEMO_RADAR_DATA: PopulatedCategory[] = [
  {
    id: "demo-cat-1",
    name: "🔥 Emagrecimento Extremamente Quente",
    description: "Palavras-chave de alto volume de buscas no Meta Ads para emagrecimento biológico.",
    keywords: [
      { id: "demo-kw-1-1", category_id: "demo-cat-1", word: "secar barriga rapido" },
      { id: "demo-kw-1-2", category_id: "demo-cat-1", word: "emagrecer natural" },
      { id: "demo-kw-1-3", category_id: "demo-cat-1", word: "metabolismo acelerado" },
      { id: "demo-kw-1-4", category_id: "demo-cat-1", word: "receita detox" },
      { id: "demo-kw-1-5", category_id: "demo-cat-1", word: "protocolo zero gordura" },
      { id: "demo-kw-1-6", category_id: "demo-cat-1", word: "cha das 5 ingredientes" },
    ],
  },
  {
    id: "demo-cat-2",
    name: "💸 Renda Extra e Inteligência Financeira",
    description: "Palavras gatilho para VSLs de dropshipping, milhas e produtos de renda digital.",
    keywords: [
      { id: "demo-kw-2-1", category_id: "demo-cat-2", word: "renda extra no celular" },
      { id: "demo-kw-2-2", category_id: "demo-cat-2", word: "avaliador premiado" },
      { id: "demo-kw-2-3", category_id: "demo-cat-2", word: "faturamento diario com app" },
      { id: "demo-kw-2-4", category_id: "demo-cat-2", word: "vagas home office 2026" },
      { id: "demo-kw-2-5", category_id: "demo-cat-2", word: "metodo lucrar com milhas" },
    ],
  },
  {
    id: "demo-cat-3",
    name: "🧴 Estética e Cuidados Corporais",
    description: "Para cosméticos encapsulados de rejuvenescimento e redução de estrias/rugas.",
    keywords: [
      { id: "demo-kw-3-1", category_id: "demo-cat-3", word: "rejuvenescer pele do rosto" },
      { id: "demo-kw-3-2", category_id: "demo-cat-3", word: "remover rugas profundas" },
      { id: "demo-kw-3-3", category_id: "demo-cat-3", word: "creme elastina natural" },
      { id: "demo-kw-3-4", category_id: "demo-cat-3", word: "anti melasma potente" },
    ],
  }
];

const RADAR_SQL_SCRIPT = `-- 1. Criar a tabela de categorias do Radar
create table if not exists public.radar_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Criar a tabela de palavras-chave do Radar
create table if not exists public.radar_keywords (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.radar_categories(id) on delete cascade not null,
  word text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar RLS nas tabelas
alter table public.radar_categories enable row level security;
alter table public.radar_keywords enable row level security;

-- Habilitar permissões públicas de Leitura/Gravação para ambiente de Testes:
create policy "Allow public read radar_categories" on public.radar_categories for select using (true);
create policy "Allow public insert radar_categories" on public.radar_categories for insert with check (true);
create policy "Allow public delete radar_categories" on public.radar_categories for delete using (true);

create policy "Allow public read radar_keywords" on public.radar_keywords for select using (true);
create policy "Allow public insert radar_keywords" on public.radar_keywords for insert with check (true);
create policy "Allow public delete radar_keywords" on public.radar_keywords for delete using (true);`;
