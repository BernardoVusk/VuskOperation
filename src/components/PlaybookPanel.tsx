import { useState, useEffect } from "react";
import { BookOpen, Plus, Trash2, Pencil, Copy, Check, X, AlertTriangle, ChevronUp, ChevronDown, Move, Search, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { RichTextEditor } from "./RichTextEditor";
import { ensureHtmlContent, htmlToPlainText } from "../utils/textHelpers";

export interface PlaybookPasso {
  id: string;
  numero: number;
  titulo: string;
  conteudo: string;
}

export interface Playbook {
  id: string;
  titulo: string;
  passos: PlaybookPasso[];
  created_at?: string;
  updated_at?: string;
}

// Custom simple UUID/ID generator for offline and new steps
const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function PlaybookPanel() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Advanced search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInTitle, setSearchInTitle] = useState(true);
  const [searchInSteps, setSearchInSteps] = useState(true);
  const [searchMatchAll, setSearchMatchAll] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Copy states
  const [copyState, setCopyState] = useState<Record<string, boolean>>({});
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);

  // Modal temporary fields
  const [modalTitulo, setModalTitulo] = useState("");
  const [modalPassos, setModalPassos] = useState<PlaybookPasso[]>([]);

  // Parse query into lowercase keywords for word-by-word advanced precision search
  const keywords = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter(k => k.length > 0);

  const filteredPlaybooks = playbooks.filter(pb => {
    if (keywords.length === 0) return true;

    const titleMatch = pb.titulo.toLowerCase();
    
    const stepsTextList: string[] = [];
    if (searchInSteps) {
      pb.passos.forEach(p => {
        if (p.titulo) stepsTextList.push(p.titulo.toLowerCase());
        if (p.conteudo) stepsTextList.push(p.conteudo.toLowerCase());
      });
    }

    const checkWordMatch = (word: string) => {
      let matched = false;
      if (searchInTitle && titleMatch.includes(word)) {
        matched = true;
      }
      if (searchInSteps && !matched) {
        matched = stepsTextList.some(text => text.includes(word));
      }
      return matched;
    };

    if (searchMatchAll) {
      return keywords.every(word => checkWordMatch(word));
    } else {
      return keywords.some(word => checkWordMatch(word));
    }
  });

  // Load playbooks on mount
  useEffect(() => {
    loadPlaybooks();
  }, []);

  const loadPlaybooks = async () => {
    setIsLoading(true);
    let resolvedOffline = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from("playbooks")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          setPlaybooks(data);
          setIsOffline(false);
          // Sync backup to local storage
          localStorage.setItem("minerador_playbooks", JSON.stringify(data));
          setIsLoading(false);
          // Select first playbook if available
          if (data.length > 0 && !selectedId) {
            setSelectedId(data[0].id);
          }
          return;
        }
      } catch (err) {
        console.warn("Supabase load failed, falling back to offline localStorage:", err);
        resolvedOffline = true;
      }
    } else {
      resolvedOffline = true;
    }

    if (resolvedOffline) {
      setIsOffline(true);
      try {
        const stored = localStorage.getItem("minerador_playbooks");
        if (stored) {
          const parsed = JSON.parse(stored);
          setPlaybooks(parsed);
          if (parsed.length > 0 && !selectedId) {
            setSelectedId(parsed[0].id);
          }
        } else {
          // Luxury initial seeded playbook
          const defaultPlaybooks: Playbook[] = [
            {
              id: "default-pb-1",
              titulo: "Como Criar uma Oferta Vencedora de Baixo Ticket",
              created_at: new Date().toISOString(),
              passos: [
                {
                  id: "step-1-1",
                  numero: 1,
                  titulo: "Mapear dores latentes usando o Vusk Operation.",
                  conteudo: "Filtre ofertas estáveis nas ad networks com Rank S ou A. Documente a promessa principal, o problema central discutido e as falhas de soluções tradicionais."
                },
                {
                  id: "step-1-2",
                  numero: 2,
                  titulo: "Estruturar o Gancho (Hook) Inicial da VSL.",
                  conteudo: "Utilize o roteiro de Inteligência Artificial para bolar uma abertura hipnótica de até 30 segundos. Questione as tentativas falhas anteriores que formaram cinismo no público."
                },
                {
                  id: "step-1-3",
                  numero: 3,
                  titulo: "Definir Pricing e Order Bump Irresistível.",
                  conteudo: "Escolha um ticket de aquisição violenta (R$ 27,00 ou R$ 47,00). No checkout, configure um order bump óbvio de R$ 9,90 focado em acelerar o resultado."
                }
              ]
            }
          ];
          setPlaybooks(defaultPlaybooks);
          localStorage.setItem("minerador_playbooks", JSON.stringify(defaultPlaybooks));
          setSelectedId("default-pb-1");
        }
      } catch (e) {
        console.error("Local storage reading failure:", e);
      }
    }
    setIsLoading(false);
  };

  const handleOpenCreateModal = () => {
    setEditingPlaybook(null);
    setModalTitulo("");
    setModalPassos([
      {
        id: generateUUID(),
        numero: 1,
        titulo: "Prospecção Primária",
        conteudo: ensureHtmlContent("Busque no Vusk Operation as campanhas mais ativas do nicho...")
      }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pb: Playbook) => {
    setEditingPlaybook(pb);
    setModalTitulo(pb.titulo);
    setModalPassos(pb.passos.map(p => ({ ...p, conteudo: ensureHtmlContent(p.conteudo) })));
    setIsModalOpen(true);
  };

  const handleCreateStep = () => {
    const nextNum = modalPassos.length + 1;
    setModalPassos([
      ...modalPassos,
      {
        id: generateUUID(),
        numero: nextNum,
        titulo: "",
        conteudo: ""
      }
    ]);
  };

  const handleRemoveStep = (id: string) => {
    const filtered = modalPassos.filter(p => p.id !== id);
    const renumbered = filtered.map((p, idx) => ({
      ...p,
      numero: idx + 1
    }));
    setModalPassos(renumbered);
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const nextList = [...modalPassos];
    if (direction === "up" && index > 0) {
      const temp = nextList[index];
      nextList[index] = nextList[index - 1];
      nextList[index - 1] = temp;
    } else if (direction === "down" && index < nextList.length - 1) {
      const temp = nextList[index];
      nextList[index] = nextList[index + 1];
      nextList[index + 1] = temp;
    }

    const renumbered = nextList.map((p, idx) => ({
      ...p,
      numero: idx + 1
    }));
    setModalPassos(renumbered);
  };

  const handleStepFieldChange = (id: string, field: "titulo" | "conteudo", val: string) => {
    setModalPassos(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleSavePlaybook = async () => {
    if (!modalTitulo.trim()) return;
    const cleanPassos = modalPassos.filter(p => p.titulo.trim() || p.conteudo.trim());
    if (cleanPassos.length === 0) return;

    setIsSaving(true);
    const now = new Date().toISOString();
    const isEditing = !!editingPlaybook;
    const targetId = isEditing ? editingPlaybook.id : generateUUID();

    const finalizedPassos: PlaybookPasso[] = cleanPassos.map((p, idx) => ({
      id: p.id || generateUUID(),
      numero: idx + 1,
      titulo: p.titulo.trim() || `Passo ${idx + 1}`,
      conteudo: p.conteudo.trim()
    }));

    const payload: Playbook = {
      id: targetId,
      titulo: modalTitulo.trim(),
      passos: finalizedPassos,
      updated_at: now,
      created_at: isEditing ? (editingPlaybook.created_at || now) : now
    };

    let updatedList = [...playbooks];

    if (!isOffline && isSupabaseConfigured && supabase) {
      try {
        if (isEditing) {
          const { error } = await supabase
            .from("playbooks")
            .update({
              titulo: payload.titulo,
              passos: payload.passos,
              updated_at: payload.updated_at
            })
            .eq("id", payload.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("playbooks")
            .insert([{
              id: payload.id,
              titulo: payload.titulo,
              passos: payload.passos,
              created_at: payload.created_at,
              updated_at: payload.updated_at
            }]);

          if (error) throw error;
        }
      } catch (err) {
        console.error("Fahrenheit writing problem to Supabase, saving offline instead:", err);
        setIsOffline(true);
      }
    }

    // Always keep Local Storage fully synchronized
    setPlaybooks(prev => {
      let nextList: Playbook[];
      if (isEditing) {
        nextList = prev.map(pb => (pb.id === targetId ? payload : pb));
      } else {
        nextList = [payload, ...prev];
      }
      localStorage.setItem("minerador_playbooks", JSON.stringify(nextList));
      return nextList;
    });

    setSelectedId(targetId);
    setIsModalOpen(false);
    setEditingPlaybook(null);
    setIsSaving(false);
  };

  const handleDeletePlaybook = async (id: string) => {
    if (!id) return;

    if (!isOffline && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from("playbooks")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
      } catch (err) {
        console.error("Fahrenheit deletion error on Supabase, changing to local deletion:", err);
        setIsOffline(true);
      }
    }

    setPlaybooks(prev => {
      const nextList = prev.filter(pb => pb.id !== id);
      localStorage.setItem("minerador_playbooks", JSON.stringify(nextList));
      return nextList;
    });

    if (selectedId === id) {
      const remaining = playbooks.filter(pb => pb.id !== id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
    setDeleteConfirmId(null);
  };

  const handleCopyPasso = (passo: PlaybookPasso) => {
    navigator.clipboard.writeText(htmlToPlainText(passo.conteudo));
    setCopyState(prev => ({ ...prev, [passo.id]: true }));
    setTimeout(() => {
      setCopyState(prev => ({ ...prev, [passo.id]: false }));
    }, 2000);
  };

  const handleCopyPlaybookCompleto = (playbook: Playbook) => {
    let text = `[PLAYBOOK] ${playbook.titulo.toUpperCase()}\n\n`;
    playbook.passos.forEach((p) => {
      text += `PASSO ${p.numero} — ${p.titulo}\n\n${htmlToPlainText(p.conteudo)}\n\n`;
      text += `==================================================\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopyAllSuccess(true);
    setTimeout(() => {
      setCopyAllSuccess(false);
    }, 2000);
  };

  const currentPlaybook = playbooks.find(pb => pb.id === selectedId);

  return (
    <div className="flex flex-col h-full w-full select-none" id="playbook-tab-panel">
      
      {/* Network Alert Mode Status Bar */}
      {isOffline && (
        <div className="mb-4 bg-systemYellow/10 border border-systemYellow/25 text-systemYellow rounded-mac-lg px-4 py-3 text-xs flex items-center justify-between gap-3 animate-fade-in font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-systemYellow shrink-0" />
            <span><strong>Rede Supabase Offline / Não Vinculado:</strong> Todas as alterações nos playbooks estão rodando de forma isolada localmente (LocalStorage) de forma segura.</span>
          </div>
          <button 
            onClick={loadPlaybooks} 
            className="px-2.5 py-1 bg-systemYellow/10 border border-systemYellow/25 hover:bg-systemYellow/20 text-[10px] font-bold rounded-mac-sm uppercase tracking-wider transition-colors text-systemYellow cursor-pointer"
          >
            Tentar Reconectar
          </button>
        </div>
      )}

      {/* Main Container Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-[18rem_1fr] h-full min-h-[580px] mac-card rounded-mac-lg overflow-hidden shadow-2xl relative">
        
        {/* Left Sidebar - Playbooks Selector Column */}
        <aside className="border-b lg:border-b-0 lg:border-r border-hairline bg-surface-base flex flex-col min-w-0" id="playbook-list-sidebar">
          
          <div className="p-4 border-b border-hairline flex items-center justify-between bg-surface-base">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary font-mono">
                MEUS PLAYBOOKS
              </span>
              {isOffline && (
                <span className="px-1.5 py-0.5 rounded bg-systemYellow/15 border border-systemYellow/20 text-[8px] font-mono font-bold text-systemYellow scale-90 shrink-0 animate-pulse">
                  OFFLINE
                </span>
              )}
            </div>
            {/* Touch-safe interactive trigger key with min requirements */}
            <button
              onClick={handleOpenCreateModal}
              className="w-8 h-8 rounded-mac-sm bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_0_10px_rgba(255,42,42,0.3)] active:scale-95"
              title="Criar Novo Playbook"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Advanced Search Bar Block */}
          <div className="p-3 border-b border-hairline bg-surface-base space-y-2 select-none">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-ink-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisa avançada..."
                  className="w-full mac-input rounded-mac-md pl-9 pr-8 py-2 text-xs text-white outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-white p-0.5 cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className={`p-2 rounded-mac-md border transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer ${
                  showAdvancedOptions || !searchInTitle || !searchInSteps || !searchMatchAll
                    ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 animate-pulse"
                    : "mac-btn-secondary text-ink-secondary"
                }`}
                title="Opções de Pesquisa Avançada"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Advanced Filters Drawer Panel */}
            <AnimatePresence>
              {showAdvancedOptions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-surface-raised border border-hairline rounded-mac-md p-3 space-y-3"
                >
                  {/* Search in fields options */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-ink-tertiary uppercase tracking-widest font-mono block">
                      Pesquisar Em:
                    </span>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 text-[10px] text-ink-secondary cursor-pointer hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={searchInTitle}
                          onChange={(e) => {
                            setSearchInTitle(e.target.checked);
                            // Avoid having both unchecked
                            if (!e.target.checked && !searchInSteps) {
                                setSearchInSteps(true);
                            }
                          }}
                          className="accent-primary w-3.5 h-3.5 rounded border-white/10 bg-[#141416] text-primary cursor-pointer"
                        />
                        <span>Título do Playbook</span>
                      </label>
                      <label className="flex items-center gap-2 text-[10px] text-ink-secondary cursor-pointer hover:text-white select-none">
                        <input
                          type="checkbox"
                          checked={searchInSteps}
                          onChange={(e) => {
                            setSearchInSteps(e.target.checked);
                            // Avoid having both unchecked
                            if (!e.target.checked && !searchInTitle) {
                                setSearchInTitle(true);
                            }
                          }}
                          className="accent-primary w-3.5 h-3.5 rounded border-white/10 bg-[#141416] text-primary cursor-pointer"
                        />
                        <span>Conteúdo de Passos</span>
                      </label>
                    </div>
                  </div>

                  {/* Word match method options */}
                  <div className="space-y-2 pt-2 border-t border-hairline">
                    <span className="text-[9px] font-bold text-ink-tertiary uppercase tracking-widest font-mono block">
                      Critério de Palavras:
                    </span>
                    <div className="grid grid-cols-2 gap-1 bg-surface-base p-0.5 rounded-mac-sm border border-hairline">
                      <button
                        onClick={() => setSearchMatchAll(true)}
                        className={`text-[9px] py-1 px-1.5 rounded-mac-sm font-semibold font-mono tracking-wide transition-all cursor-pointer ${
                          searchMatchAll
                            ? "bg-primary text-white shadow-sm"
                            : "text-ink-tertiary hover:text-white bg-transparent"
                        }`}
                      >
                        TODAS (E)
                      </button>
                      <button
                        onClick={() => setSearchMatchAll(false)}
                        className={`text-[9px] py-1 px-1.5 rounded-mac-sm font-semibold font-mono tracking-wide transition-all cursor-pointer ${
                          !searchMatchAll
                            ? "bg-primary text-white shadow-sm"
                            : "text-ink-tertiary hover:text-white bg-transparent"
                        }`}
                      >
                        QUALQUER (OU)
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Search active results feedback */}
            {searchQuery && (
              <div className="flex items-center justify-between text-[9px] text-ink-tertiary font-mono px-0.5 pt-1">
                <span>{filteredPlaybooks.length} correspondência{filteredPlaybooks.length === 1 ? "" : "s"}</span>
                <button
                  onClick={() => {
                    setSearchQuery("");
                  }}
                  className="text-primary hover:underline cursor-pointer font-bold"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[350px] lg:max-h-[600px] p-3 space-y-1.5 scrollbar-none">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-ink-tertiary animate-pulse">
                Carregando playbooks...
              </div>
            ) : playbooks.length === 0 ? (
              <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-4">
                <BookOpen className="w-8 h-8 text-ink-tertiary stroke-1" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ink-secondary">Nenhum playbook ainda</p>
                  <p className="text-[10px] text-ink-tertiary max-w-[160px] leading-relaxed mx-auto">
                    Crie notas operacionais estruturadas para coordenar sua rotina de marketing.
                  </p>
                </div>
                {/* Touch target 44px height */}
                <button
                  onClick={handleOpenCreateModal}
                  className="min-h-[40px] px-4 mac-btn-primary text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Criar Primeiro Playbook
                </button>
              </div>
            ) : filteredPlaybooks.length === 0 ? (
              <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3 bg-surface-base border border-hairline rounded-mac-lg animate-fade-in">
                <Search className="w-6 h-6 text-ink-tertiary" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ink-secondary">Nenhum resultado</p>
                  <p className="text-[10px] text-ink-tertiary max-w-[165px] leading-relaxed mx-auto">
                    Nenhum playbook corresponde aos seus filtros de busca por palavra.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchInTitle(true);
                    setSearchInSteps(true);
                    setSearchMatchAll(true);
                  }}
                  className="px-3 py-1.5 mac-btn-secondary text-[10px] font-bold rounded-mac-sm uppercase tracking-wider text-white transition-all cursor-pointer"
                >
                  Redefinir Busca
                </button>
              </div>
            ) : (
              filteredPlaybooks.map(pb => (
                <button
                  key={pb.id}
                  onClick={() => {
                    setSelectedId(pb.id);
                    setDeleteConfirmId(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-mac-sm border transition-all relative flex flex-col gap-1 cursor-pointer select-none ${
                    selectedId === pb.id
                      ? "bg-primary/5 border-primary/30 text-white"
                      : "bg-transparent border-transparent text-ink-secondary hover:text-white hover:bg-surface-raised hover:border-hairline"
                  }`}
                >
                  <span className="text-xs font-bold line-clamp-2 leading-relaxed text-zinc-100">
                    {pb.titulo}
                  </span>
                  
                  <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono text-ink-tertiary font-semibold uppercase tracking-wider">
                    <span className="text-primary">
                      {pb.passos.length} {pb.passos.length === 1 ? "passo" : "passos"}
                    </span>
                    <span className="text-ink-tertiary">
                      {pb.created_at ? new Date(pb.created_at).toLocaleDateString("pt-BR") : "Data indisponível"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Sidebar - Playbook Detailed viewer Column */}
        <main className="flex-1 bg-surface-base flex flex-col min-w-0" id="playbook-viewer-content">
          
          <AnimatePresence mode="wait">
            {!currentPlaybook ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-8 py-20 space-y-4 bg-surface-base"
              >
                <div className="w-14 h-14 bg-surface-raised border border-hairline rounded-mac-md flex items-center justify-center text-ink-tertiary">
                  <BookOpen className="w-6 h-6 stroke-1.5 text-primary" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-sm font-bold text-white">Nenhum playbook selecionado</h3>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                     Escolha um playbook na lista lateral para visualizar os passos operacionais ou crie um novo processo de decolagem.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentPlaybook.id}
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full overflow-hidden bg-surface-base"
              >
                {/* Header Information area */}
                <div className="p-6 border-b border-hairline bg-surface-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 justify-start">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-lg font-bold text-white leading-snug tracking-tight">
                        {currentPlaybook.titulo}
                      </h2>
                      <span className="px-2 py-0.5 bg-primary/10 border border-primary/25 text-[#FF453A] rounded-mac-md text-[9px] font-mono font-bold uppercase tracking-wider">
                        {currentPlaybook.passos.length} {currentPlaybook.passos.length === 1 ? "PASSO" : "PASSOS"}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-tertiary font-mono uppercase tracking-wider font-semibold">
                      Criado em: {currentPlaybook.created_at ? new Date(currentPlaybook.created_at).toLocaleDateString("pt-BR") : "Módulo Local"} {currentPlaybook.updated_at && `• Atualizado: ${new Date(currentPlaybook.updated_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>

                  {/* Actions area */}
                  <div className="flex items-center gap-2 shrink-0">
                    {deleteConfirmId === currentPlaybook.id ? (
                      <div className="flex items-center gap-1.5 bg-systemRed/10 border border-systemRed/25 p-1 rounded-mac-md animate-fade-in">
                        <span className="text-[9px] text-systemRed font-mono uppercase font-bold tracking-widest px-2">
                          Confirmar Exclusão?
                        </span>
                        <button
                          onClick={() => handleDeletePlaybook(currentPlaybook.id)}
                          className="px-3 py-1.5 bg-systemRed hover:bg-red-650 text-white font-bold text-[10px] uppercase tracking-wider rounded-mac-sm transition-colors cursor-pointer active:scale-95"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 bg-surface-raised hover:bg-[#202025] text-ink-secondary text-[10px] uppercase tracking-wider rounded-mac-sm transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Edit Playbook Trigger */}
                        <button
                          onClick={() => handleOpenEditModal(currentPlaybook)}
                          className="px-4 py-1.5 mac-btn-secondary text-white text-[11px] font-mono font-bold uppercase tracking-wider rounded-mac-sm transition-all cursor-pointer flex items-center gap-1.5 h-9"
                        >
                          <Pencil className="w-3.5 h-3.5 text-primary" />
                          <span>Editar</span>
                        </button>

                        {/* Prompt deletion trigger */}
                        <button
                          onClick={() => setDeleteConfirmId(currentPlaybook.id)}
                          className="p-1 w-9 h-9 bg-systemRed/10 hover:bg-systemRed/15 border border-systemRed/25 rounded-mac-sm transition-all cursor-pointer flex items-center justify-center text-systemRed"
                          title="Excluir Playbook"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Steps sequence core list rendering */}
                <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[500px] scrollbar-none">
                  {currentPlaybook.passos.length === 0 ? (
                    <div className="text-center py-12 text-ink-tertiary text-xs font-medium bg-surface-raised rounded-mac-lg border border-hairline border-dashed p-4">
                      Nenhum passo cadastrado neste playbook. Clique em Editar para começar de forma estruturada.
                    </div>
                  ) : (
                    currentPlaybook.passos.map((passo, idx) => {
                      const isStepCopied = copyState[passo.id] || false;
                      return (
                        <div key={passo.id} className="relative group animate-fade-in">
                          {/* Dotted connector lines between nodes */}
                          {idx < currentPlaybook.passos.length - 1 && (
                            <div className="absolute left-[14px] top-8 bottom-[-45px] w-0.5 border-l-2 border-dashed border-hairline pointer-events-none"></div>
                          )}

                          <div className="flex gap-4">
                            {/* Step number bullet in bold custom template theme red */}
                            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-mono font-bold text-white shrink-0 shadow-[0_0_10px_rgba(255,42,42,0.4)] z-10">
                              {passo.numero}
                            </div>

                            {/* Content box */}
                            <div className="flex-1 bg-surface-raised border border-hairline rounded-mac-lg p-4 sm:p-5 relative overflow-hidden transition-all duration-300 hover:border-white/10">
                              <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-hairline mb-3">
                                <h4 className="text-xs sm:text-sm font-bold text-white tracking-widest uppercase font-mono">
                                  {passo.titulo || `Passo ${passo.numero}`}
                                </h4>

                                {/* Copy Button inline step */}
                                <button
                                  onClick={() => handleCopyPasso(passo)}
                                  className="h-8 px-3 rounded-mac-sm mac-btn-secondary text-white font-bold transition-all text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                  title="Copiar conteúdo deste passo"
                                >
                                  {isStepCopied ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-systemGreen" />
                                      <span className="text-systemGreen">Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5 text-primary" />
                                      <span>Copiar</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Preserving HTML formatting for rich representation */}
                              {passo.conteudo ? (
                                <div 
                                  className="rte-content text-xs text-ink-primary font-sans leading-relaxed selection:bg-primary/20 bg-surface-base rounded-mac-md p-3 border border-hairline"
                                  dangerouslySetInnerHTML={{ __html: ensureHtmlContent(passo.conteudo) }}
                                />
                              ) : (
                                <div className="text-xs text-ink-tertiary italic font-sans leading-relaxed selection:bg-primary/20 bg-surface-base rounded-mac-md p-3 border border-hairline">
                                  Sem conteúdo cadastrado.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Copy All integration footer panel */}
                <div className="p-4 border-t border-hairline bg-surface-base flex justify-center items-center select-none">
                  {/* Touch optimized 44px min button */}
                  <button
                    onClick={() => handleCopyPlaybookCompleto(currentPlaybook)}
                    className="min-h-[44px] px-8 mac-btn-primary border-0 text-white text-xs font-bold uppercase tracking-widest rounded-mac-md transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                  >
                    {copyAllSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-systemGreen" />
                        <span className="text-systemGreen">Roteiro Copiado! ✓</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-white" />
                        <span>Copiar Playbook Completo</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Creation and Edition Modal Dialog Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="mac-card rounded-mac-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl relative"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-hairline flex items-center justify-between bg-surface-base">
              <h3 className="text-xs font-bold uppercase text-white tracking-widest font-mono flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {editingPlaybook ? "Editar Playbook" : "Novo Playbook de Operações"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-mac-sm hover:text-white hover:bg-white/5 text-ink-secondary transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[50vh] scrollbar-none">
              
              {/* Title input group */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
                  TÍTULO DO PLAYBOOK
                </label>
                <input
                  type="text"
                  value={modalTitulo}
                  onChange={(e) => setModalTitulo(e.target.value)}
                  placeholder="Ex: Como Criar Oferta, Checklist de Lançamento..."
                  className="w-full mac-input rounded-mac-sm px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Steps creation segment stack */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    PASSOS OPERACIONAIS
                  </label>
                  <span className="text-[10px] text-ink-tertiary font-mono">
                    {modalPassos.length} {modalPassos.length === 1 ? "passo" : "passos"} descritos
                  </span>
                </div>

                <div className="space-y-4">
                  {modalPassos.map((passo, idx) => (
                    <div 
                      key={passo.id} 
                      className="p-4 bg-surface-base border border-hairline rounded-mac-md space-y-3 relative group transition-colors hover:border-white/10"
                    >
                      {/* Step index badge & sorting helpers */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-sm shrink-0">
                            {passo.numero}
                          </span>
                          <span className="text-[10px] text-ink-secondary font-bold uppercase tracking-wider font-mono">
                            CONFIGURAÇÃO DO PASSO
                          </span>
                        </div>

                        {/* Interactive Step Sorter & Trash Actions */}
                        <div className="flex items-center gap-1">
                          
                          {/* Move up action link */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStep(idx, "up")}
                            className="w-7 h-7 bg-surface-raised hover:bg-white/5 disabled:opacity-35 disabled:pointer-events-none rounded flex items-center justify-center text-ink-secondary hover:text-white transition-colors cursor-pointer"
                            title="Mover para cima"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>

                          {/* Move down action link */}
                          <button
                            type="button"
                            disabled={idx === modalPassos.length - 1}
                            onClick={() => handleMoveStep(idx, "down")}
                            className="w-7 h-7 bg-surface-raised hover:bg-white/5 disabled:opacity-35 disabled:pointer-events-none rounded flex items-center justify-center text-ink-secondary hover:text-white transition-colors cursor-pointer"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick single-step deletion trigger */}
                          {modalPassos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(passo.id)}
                              className="w-7 h-7 bg-systemRed/10 hover:bg-systemRed/15 rounded flex items-center justify-center text-systemRed transition-colors cursor-pointer border border-systemRed/20"
                              title="Remover passo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inputs */}
                      <div className="space-y-3 pt-1">
                        <input
                          type="text"
                          value={passo.titulo}
                          onChange={(e) => handleStepFieldChange(passo.id, "titulo", e.target.value)}
                          placeholder="Mapeando gatilhos do nicho"
                          className="w-full mac-input rounded-mac-sm px-3 py-2.5 text-xs text-white focus:outline-none"
                        />

                        <RichTextEditor
                          value={passo.conteudo}
                          onChange={(html) => handleStepFieldChange(passo.id, "conteudo", html)}
                          placeholder="Instruções operacionais detalhadas, checklists ou prompts de comando... (suporta formatação rica)"
                          minHeight="120px"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adding button step trigger */}
                <button
                  type="button"
                  onClick={handleCreateStep}
                  className="w-full border border-dashed border-hairline rounded-mac-md py-4 bg-surface-base text-ink-secondary hover:border-primary/25 hover:text-white hover:bg-surface-raised transition-all text-xs font-mono uppercase tracking-wider font-bold text-center cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  <span>Adicionar Novo Passo Operacional</span>
                </button>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-5 border-t border-hairline bg-surface-base flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 mac-btn-secondary text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSavePlaybook}
                disabled={isSaving || !modalTitulo.trim() || modalPassos.length === 0}
                className="px-5 py-2.5 mac-btn-primary disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                {isSaving ? "Gravando Ficha..." : "Salvar Playbook"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
