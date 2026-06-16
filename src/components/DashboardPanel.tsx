import React, { useState } from "react";
import { Search, Download, Camera, Eye, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { OfferHit } from "../types";
import { UrlConnectionStatus } from "./UrlConnectionStatus";

interface DashboardPanelProps {
  offerHits: OfferHit[];
  setOfferHits: React.Dispatch<React.SetStateAction<OfferHit[]>>;
}

export function classifyHitGroup(hit: OfferHit): 'gateways' | 'ai_pages' | 'keywords' | 'trackers' {
  const url = (hit.url || "").toLowerCase();
  const title = (hit.title || "").toLowerCase();
  const tracker = (hit.tracker || "").toLowerCase();
  const platform = (hit.platformName || "").toLowerCase();

  // 1. Gateways Check
  if (
    url.includes("lowify") || title.includes("lowify") || tracker.includes("lowify") || platform.includes("lowify") ||
    url.includes("buckpay") || title.includes("buckpay") || tracker.includes("buckpay") || platform.includes("buckpay") ||
    url.includes("wiapy") || title.includes("wiapy") || tracker.includes("wiapy") || platform.includes("wiapy")
  ) {
    return 'gateways';
  }

  // 2. AI Pages Check
  if (
    url.includes("xpages.co") || tracker.includes("xpages") || platform.includes("xpages") ||
    url.includes("vercel") || tracker.includes("vercel") || platform.includes("vercel") ||
    url.includes("lovable") || tracker.includes("lovable") || platform.includes("lovable") ||
    url.includes("bolt.host") || url.includes("bolt.new") || tracker.includes("bolt") || platform.includes("bolt") ||
    url.includes("replit") || tracker.includes("replit") || platform.includes("replit")
  ) {
    return 'ai_pages';
  }

  // 3. Keywords Check
  const fullText = `${title} ${url}`.toLowerCase();
  if (
    fullText.includes("por apenas r$10 pdf whatsapp") ||
    fullText.includes("por apenas r$10") ||
    fullText.includes("pdf whatsapp") ||
    fullText.includes("pdf apenas 10") ||
    fullText.includes("receba tudo pelo whatsapp") ||
    fullText.includes("receba pelo whatsapp") ||
    /curso apenas \d+/.test(fullText) ||
    fullText.includes("curso apenas")
  ) {
    return 'keywords';
  }

  return 'trackers';
}

export function DashboardPanel({ offerHits, setOfferHits }: DashboardPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("all");
  const [selectedMarket, setSelectedMarket] = useState("all");
  const [selectedRank, setSelectedRank] = useState("all");
  const [selectedFunnel, setSelectedFunnel] = useState("all");
  const [selectedTypeGroup, setSelectedTypeGroup] = useState("all");
  const [sortBy, setSortBy] = useState("score-desc");

  // Screenshot Modal state
  const [activeScreenshot, setActiveScreenshot] = useState<OfferHit | null>(null);

  // Technical Details / Gemini Re-analysis Modal state
  const [activeDetail, setActiveDetail] = useState<OfferHit | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisResult, setReanalysisResult] = useState<any | null>(null);

  // Filter items
  const filteredHits = offerHits.filter((hit) => {
    const textStr = `${hit.url} ${hit.title} ${hit.platformName}`.toLowerCase();
    const matchesSearch = textStr.includes(searchQuery.toLowerCase());
    const matchesNiche = selectedNiche === "all" || hit.nicho === selectedNiche;
    const matchesMarket = selectedMarket === "all" || hit.market === selectedMarket;
    const matchesRank = selectedRank === "all" || hit.rank === selectedRank;
    const matchesFunnel = selectedFunnel === "all" || hit.type === selectedFunnel;
    const matchesGroup = selectedTypeGroup === "all" || classifyHitGroup(hit) === selectedTypeGroup;

    return matchesSearch && matchesNiche && matchesMarket && matchesRank && matchesFunnel && matchesGroup;
  });

  // Sort items
  const sortedHits = [...filteredHits].sort((a, b) => {
    if (sortBy === "funnel-asc") {
      const typeComparison = a.type.localeCompare(b.type);
      if (typeComparison !== 0) return typeComparison;
      return b.score - a.score;
    }
    if (sortBy === "funnel-desc") {
      const typeComparison = b.type.localeCompare(a.type);
      if (typeComparison !== 0) return typeComparison;
      return b.score - a.score;
    }
    if (sortBy === "score-desc") {
      return b.score - a.score;
    }
    if (sortBy === "score-asc") {
      return a.score - b.score;
    }
    if (sortBy === "date-desc") {
      return new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime();
    }
    return 0;
  });

  const countStats = {
    total: filteredHits.length,
    elite: filteredHits.filter((h) => h.rank === "S").length,
    topo: filteredHits.filter((h) => h.rank === "A").length,
    alta: filteredHits.filter((h) => h.rank === "B" || h.rank === "C").length,
  };

  const triggerCsvDownload = () => {
    if (filteredHits.length === 0) return;
    const headers = ["ID", "URL", "Dominio", "Titulo", "Checkout Tracker", "Plataforma", "Nicho", "Funil", "Score", "Rank", "Origem", "Identificada Em"];
    const rows = filteredHits.map((h) => [
      h.id,
      h.url,
      h.domain,
      `"${(h.title || "").replace(/"/g, '""')}"`,
      h.tracker,
      h.platformName,
      h.nicho,
      h.type,
      h.score,
      h.rank,
      h.market,
      h.scannedAt,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `minerador_pro_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearDatabase = async () => {
    if (window.confirm("Deseja realmente apagar o histórico salvo de ofertas mineradas?")) {
      setOfferHits([]);
      localStorage.removeItem("minerador_pro_hits");

      const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || localStorage.getItem("minerador_supabase_url");
      const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("minerador_supabase_key");
      if (rawUrl && rawKey) {
        try {
          const { clearAllFromSupabase } = await import("../lib/databaseService");
          await clearAllFromSupabase();
        } catch (err) {
          console.error("Failed to clear Supabase table in background:", err);
        }
      }
    }
  };

  const handleGeminiReanalysis = async (hit: OfferHit) => {
    setIsReanalyzing(true);
    setReanalysisResult(null);

    try {
      const customKey = localStorage.getItem("vusk_custom_gemini_key") || "";
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-gemini-key": customKey
        },
        body: JSON.stringify({
          url: hit.url,
          title: hit.title,
          trackerId: hit.tracker.split(".")[0],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReanalysisResult(data);
        setOfferHits((prev) => {
          const updated = prev.map((item) => {
            if (item.id === hit.id) {
              const updatedItem: OfferHit = {
                ...item,
                nicho: data.nicho,
                type: data.type,
                score: data.score,
                rank: data.rank,
                title: data.headline || item.title,
              };

              // Persist single upsert update of the newly analyzed parameters into Supabase
              const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || localStorage.getItem("minerador_supabase_url");
              const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("minerador_supabase_key");
              if (rawUrl && rawKey) {
                import("../lib/databaseService").then(({ upsertOfferToSupabase }) => {
                  upsertOfferToSupabase(updatedItem).catch(err => console.error("Single row sync fail:", err));
                });
              }

              return updatedItem;
            }
            return item;
          });
          localStorage.setItem("minerador_pro_hits", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReanalyzing(false);
    }
  };
  return (
    <div className="space-y-8 animate-fade-in relative z-10 text-white font-sans">
      {/* 1. Stat cards top Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Results */}
        <div className="mac-card p-5 sm:p-6 min-h-24 flex flex-col justify-between relative overflow-hidden group">
          <div className="text-[10px] text-ink-tertiary font-bold tracking-widest uppercase">Total Mapeado</div>
          <div className="text-3xl font-extrabold text-white font-sans mt-2 tracking-tight group-hover:text-primary transition-colors">{countStats.total}</div>
          <div className="text-[10px] text-ink-secondary font-medium mt-1">Ofertas em cache</div>
        </div>

        {/* Elite */}
        <div className="mac-card p-5 sm:p-6 min-h-24 flex flex-col justify-between relative overflow-hidden group">
          <div className="text-[10px] text-primary font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#FF453A]"></span>
            Classe S · Elite
          </div>
          <div className="text-3xl font-extrabold text-white font-sans mt-2 tracking-tight">{countStats.elite}</div>
          <div className="text-[10px] text-ink-secondary font-medium mt-1">Alta conversão (≥ 12)</div>
        </div>

        {/* Topo */}
        <div className="mac-card p-5 sm:p-6 min-h-24 flex flex-col justify-between relative overflow-hidden group hover:border-systemBlue/30 transition-all duration-250">
          <div className="text-[10px] text-systemBlue font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-systemBlue shadow-[0_0_6px_rgba(10,132,255,0.5)]"></span>
            Classe A · Escala
          </div>
          <div className="text-3xl font-extrabold text-white font-sans mt-2 tracking-tight">{countStats.topo}</div>
          <div className="text-[10px] text-ink-secondary font-medium mt-1">Propostas validadas (8-11)</div>
        </div>

        {/* Alta */}
        <div className="mac-card p-5 sm:p-6 min-h-24 flex flex-col justify-between relative overflow-hidden group hover:border-systemYellow/30 transition-all duration-250">
          <div className="text-[10px] text-systemYellow font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-systemYellow shadow-[0_0_6px_rgba(255,214,10,0.5)]"></span>
            Classe B/C · Ativo
          </div>
          <div className="text-3xl font-extrabold text-white font-sans mt-2 tracking-tight">{countStats.alta}</div>
          <div className="text-[10px] text-ink-secondary font-medium mt-1">Em tração inicial (4-7)</div>
        </div>
      </div>

      {/* 2. Controls and Filters row */}
      <div className="mac-card p-6 space-y-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Pesquisar por link de checkout, palavra correspondente ou plataforma..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mac-input text-white pl-11 pr-4 py-3 outline-none text-xs transition-all h-11 placeholder:text-ink-tertiary"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 flex-1">
            <select
              title="Filtro de nicho"
              value={selectedNiche}
              onChange={(e) => setSelectedNiche(e.target.value)}
              className="mac-input text-ink-primary/80 px-3 py-2 text-xs cursor-pointer h-11"
            >
              <option value="all">Todos os nichos</option>
              <option value="emagrecimento">Emagrecimento</option>
              <option value="saude_masculina">Saúde Masculina</option>
              <option value="saude_bem_estar">Saúde/Bem-Estar</option>
              <option value="renda_extra">Renda Extra</option>
              <option value="relacionamento">Relacionamento</option>
              <option value="financas">Finanças</option>
              <option value="cripto">Criptomoedas</option>
              <option value="beleza">Beleza / Estética</option>
              <option value="outros">Outros Nichos</option>
            </select>

            <select
              title="Filtro de região"
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="mac-input text-ink-primary/80 px-3 py-2 text-xs cursor-pointer h-11"
            >
              <option value="all">BR + Gringa</option>
              <option value="BR">Nacional (BR)</option>
              <option value="Gringa">Gringa (Internac.)</option>
            </select>

            <select
              title="Filtro de rank"
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="mac-input text-ink-primary/80 px-3 py-2 text-xs cursor-pointer h-11"
            >
              <option value="all">Todas prioridades</option>
              <option value="S">Classe [S] Elite</option>
              <option value="A">Classe [A] Topo</option>
              <option value="B">Classe [B] Alta</option>
              <option value="C">Classe [C] Baixa</option>
            </select>

            <select
              title="Filtro de funil"
              value={selectedFunnel}
              onChange={(e) => setSelectedFunnel(e.target.value)}
              className="mac-input text-ink-primary/80 px-3 py-2 text-xs cursor-pointer h-11"
            >
              <option value="all font-sans">Todos os funis</option>
              <option value="VSL">VSL (Vídeo Vendas)</option>
              <option value="QUIZ">Quiz / Pesquisa</option>
              <option value="LOW_TICKET">Low Ticket / Ebook</option>
              <option value="DIRECT_SALES">Venda Direta / LP</option>
            </select>

            <select
              title="Filtrar por Categoria"
              value={selectedTypeGroup}
              onChange={(e) => setSelectedTypeGroup(e.target.value)}
              className="mac-input text-ink-primary/80 px-3 py-2 text-xs cursor-pointer h-11"
            >
              <option value="all">Todas Categorias</option>
              <option value="gateways">Gateways</option>
              <option value="ai_pages">Páginas de IA</option>
              <option value="keywords">Palavras-Chaves</option>
              <option value="trackers">Checkout Trackers</option>
            </select>

            <select
              title="Ordenar por"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mac-input text-ink-primary/80 px-3 py-2 text-xs cursor-pointer h-11"
            >
              <option value="score-desc">Score: Maior → Menor</option>
              <option value="score-asc">Score: Menor → Maior</option>
              <option value="funnel-asc">Funil: A → Z [Grupo]</option>
              <option value="funnel-desc">Funil: Z → A [Grupo]</option>
              <option value="date-desc">Recentes Primeiro</option>
            </select>

            <button
              onClick={triggerCsvDownload}
              disabled={filteredHits.length === 0}
              className="mac-btn-primary text-white font-bold text-[10px] uppercase px-4 h-11 flex items-center justify-center gap-1.5 enabled:cursor-pointer disabled:opacity-30 tracking-wider font-sans shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-ink-tertiary pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-systemGreen"></span>
            Filtrando {filteredHits.length} de {offerHits.length} correspondências coletadas
          </div>
          {offerHits.length > 0 && (
            <button
              onClick={clearDatabase}
              className="text-primary hover:text-red-450 font-bold uppercase tracking-wider transition-colors cursor-pointer text-[10px] font-sans"
            >
              Apagar Histórico
            </button>
          )}
        </div>
      </div>

      {/* 3. Tabela & Card grids */}
      {filteredHits.length === 0 ? (
        <div className="mac-card p-16 text-center text-ink-tertiary font-medium">
          <p className="text-sm">Nenhum criativo ou funil localizado para os parâmetros de filtro.</p>
          <p className="text-[11px] text-ink-tertiary mt-2">Ative ou reinicie a varredura ativa de faturamentos sequenciais.</p>
        </div>
      ) : (
        <div className="mac-card overflow-hidden">
          <div className="hidden md:block overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse font-sans">
              <thead>
                <tr className="bg-surface-raised border-b border-hairline text-[10px] text-ink-tertiary font-bold uppercase tracking-widest h-12 select-none">
                  <th className="px-6 py-3 font-bold">Rank</th>
                  <th className="px-4 py-3 font-bold">Score</th>
                  <th className="px-4 py-3 font-bold">Link da Oferta / Headings</th>
                  <th className="px-4 py-3 font-bold">Nicho</th>
                  <th className="px-4 py-3 font-bold">Formato Funil</th>
                  <th className="px-4 py-3 font-bold">Gateway & Tracker</th>
                  <th className="px-6 py-3 font-bold text-right">Análise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs text-ink-primary/80">
                {sortedHits.map((hit) => {
                  let badgeColors = "text-systemGreen bg-systemGreen/10 border border-systemGreen/25 rounded-mac-sm";
                  if (hit.rank === "A") badgeColors = "text-primary bg-primary/10 border border-primary/25 rounded-mac-sm";
                  if (hit.rank === "B") badgeColors = "text-systemYellow bg-systemYellow/10 border border-systemYellow/25 rounded-mac-sm";
                  if (hit.rank === "C") badgeColors = "text-ink-tertiary bg-surface-raised border border-hairline rounded-mac-sm";

                  return (
                    <tr key={hit.id} className="hover:bg-white/[0.02] border-b border-hairline last:border-0 transition-all duration-200 group">
                      <td className="px-6 py-4 whitespace-nowrap font-mono font-bold">
                        <span className={`px-2.5 py-1 text-[10px] font-bold ${badgeColors} shadow-sm select-none`}>
                          {hit.rank}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-sans font-extrabold text-white text-sm">
                        {hit.score}
                      </td>
                      <td className="px-4 py-4 max-w-lg">
                        <div className="flex flex-col gap-1 items-start min-w-0">
                          <div className="text-primary hover:text-primary-hover font-mono text-xs font-semibold hover:underline break-all truncate max-w-md">
                            <a href={hit.url} target="_blank" rel="noopener noreferrer">
                              {hit.url}
                            </a>
                          </div>
                          <UrlConnectionStatus url={hit.url} />
                        </div>
                        <div className="text-xs text-ink-secondary max-w-md truncate mt-1 font-medium font-sans">
                          {hit.title || "Headline não capturada"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-[10px] uppercase font-bold bg-surface-raised px-2.5 py-1 rounded-mac-sm border border-hairline text-ink-secondary group-hover:border-primary/30 transition-all">
                          {hit.nicho.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-mono text-[11px] text-ink-secondary uppercase font-semibold">
                        {hit.type}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-ink-secondary">
                        <div className="flex flex-col gap-1 items-start font-sans font-semibold">
                          <span className="text-[11px] text-white font-semibold">{hit.platformName} · <span className="font-mono text-ink-tertiary font-medium">{hit.market}</span></span>
                          {(() => {
                            const group = classifyHitGroup(hit);
                            if (group === "gateways") {
                              return <span className="text-[8px] uppercase px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold font-mono tracking-wider">Gateway Faturamento</span>;
                            }
                            if (group === "ai_pages") {
                              return <span className="text-[8px] uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold font-mono tracking-wider">Página de IA</span>;
                            }
                            if (group === "keywords") {
                              return <span className="text-[8px] uppercase px-1.5 py-0.5 rounded-full bg-[#FFD60A]/10 border border-[#FFD60A]/20 text-[#FFD60A] font-bold font-mono tracking-wider">Ganchos WhatsApp</span>;
                            }
                            return <span className="text-[8px] uppercase px-1.5 py-0.5 rounded-full bg-surface-raised border border-hairline text-ink-secondary font-mono tracking-wider">Checkout Tracker</span>;
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                        <button
                          title="Visualizar Screenshot"
                          onClick={() => setActiveScreenshot(hit)}
                          className="p-2.5 mac-btn-secondary text-ink-secondary hover:text-white inline-flex items-center active:scale-95 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Análise Estratégica AI"
                          onClick={() => {
                            setActiveDetail(hit);
                            setReanalysisResult(null);
                          }}
                          className="p-2.5 mac-btn-secondary text-ink-secondary hover:text-white inline-flex items-center active:scale-95 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile visible layout layout */}
          <div className="block md:hidden divide-y divide-hairline">
            {sortedHits.map((hit) => {
              let badgeColors = "text-systemGreen bg-systemGreen/10 border border-systemGreen/25 rounded-mac-sm";
              if (hit.rank === "A") badgeColors = "text-primary bg-primary/10 border border-primary/25 rounded-mac-sm";
              if (hit.rank === "B") badgeColors = "text-systemYellow bg-systemYellow/10 border border-systemYellow/25 rounded-mac-sm";
              if (hit.rank === "C") badgeColors = "text-ink-tertiary bg-surface-raised border border-hairline rounded-mac-sm";

              return (
                <div key={hit.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 text-[10px] font-mono font-bold ${badgeColors}`}>
                      RANK {hit.rank} · Score {hit.score}
                    </span>
                    <span className="text-[10px] font-bold text-ink-secondary bg-surface-raised px-2 py-0.5 border border-hairline rounded-mac-sm uppercase">
                      {hit.market} · {hit.platformName}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <a
                      href={hit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-hover font-mono text-xs font-semibold break-all block hover:underline"
                    >
                      {hit.url}
                    </a>
                    <div className="pt-1 select-none">
                      <UrlConnectionStatus url={hit.url} />
                    </div>
                    <p className="text-xs text-ink-secondary font-medium leading-relaxed mt-1">{hit.title || "Headline não capturada"}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 select-none">
                    <span className="text-[9px] font-semibold bg-surface-raised px-2.5 py-1 rounded-mac-sm border border-hairline text-ink-secondary uppercase tracking-widest">
                      🏷 {hit.nicho.replace("_", " ")}
                    </span>
                    <span className="text-[9px] font-semibold bg-surface-raised px-2.5 py-1 rounded-mac-sm border border-hairline text-ink-secondary uppercase tracking-widest">
                      {hit.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-hairline">
                    <button
                      onClick={() => setActiveScreenshot(hit)}
                      className="py-3 mac-btn-secondary text-white text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold font-sans uppercase tracking-wider active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-primary" /> Captura
                    </button>
                    <button
                      onClick={() => {
                        setActiveDetail(hit);
                        setReanalysisResult(null);
                      }}
                      className="py-3 mac-btn-secondary text-white text-xs flex items-center justify-center gap-1.5 cursor-pointer font-bold font-sans uppercase tracking-wider active:scale-95"
                    >
                      <Eye className="w-4 h-4 text-primary" /> Análise AI
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Screenshot display */}
      {activeScreenshot && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 mac-glass animate-fade-in">
          <div className="relative mac-card max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink-secondary font-mono uppercase tracking-widest truncate mr-4">
                Captura de Domínio: {activeScreenshot.domain}
              </h3>
              <button
                onClick={() => setActiveScreenshot(null)}
                className="text-[10px] text-white font-bold uppercase tracking-wider px-3.5 py-1.5 mac-btn-secondary cursor-pointer select-none"
              >
                fechar janela
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center bg-surface-base/40">
              {activeScreenshot.screenshotUrl ? (
                <div className="relative max-h-[500px] overflow-auto border border-hairline rounded-mac-md bg-black group max-w-full">
                  <img
                    src={activeScreenshot.screenshotUrl}
                    alt={`${activeScreenshot.domain}`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = "none";
                      const fall = document.getElementById(`screenshot-fallback-${activeScreenshot.id}`);
                      if (fall) {
                        fall.style.display = "block";
                      }
                    }}
                    className="max-w-full h-auto mx-auto object-contain select-none"
                  />
                  <div
                    id={`screenshot-fallback-${activeScreenshot.id}`}
                    style={{ display: "none" }}
                    className="p-12 text-center text-xs font-sans text-ink-tertiary space-y-4"
                  >
                    <p className="font-bold text-primary tracking-wide text-xs">[ captura em processamento público ]</p>
                    <p className="max-w-md mx-auto leading-relaxed bg-surface-raised p-4 border border-hairline rounded-mac-md text-ink-secondary text-xs font-medium">
                      Como o escaneamento do urlscan é assíncrono e passível de filas, a captura do UUID <span className="text-white font-mono">{activeScreenshot.uuid}</span> está em renderização nos servidores públicos.
                    </p>
                    <a
                      href={`https://urlscan.io/result/${activeScreenshot.uuid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mac-btn-secondary px-4 py-2 text-primary text-[10px] font-bold uppercase tracking-widest font-sans cursor-pointer"
                    >
                      Verificar direto no urlscan.io
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-xs font-sans text-ink-tertiary border border-dashed border-hairline rounded-mac-md max-w-md">
                  <p className="font-bold text-primary mb-2 tracking-wide uppercase text-[10px]">[Processando Resolução]</p>
                  <p className="mb-4 leading-relaxed text-ink-secondary text-xs font-medium">
                    O screenshot da Lading Page está sendo indexado. Caso o tráfego do anunciante seja recente, a captura pode demorar um pouco na fila geral do repositório.
                  </p>
                  <a
                    href={activeScreenshot.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mac-btn-primary px-5 py-2.5 text-white text-xs uppercase font-extrabold text-center tracking-wider cursor-pointer font-sans"
                  >
                    Visitar Oferta na Web
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Technical Details & Gemini AI Audit */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 mac-glass animate-fade-in font-sans">
          <div className="relative mac-card max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-hairline flex items-center justify-between">
              <h3 className="text-xs font-bold text-ink-secondary font-sans uppercase tracking-widest flex items-center gap-1.5 select-none text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Insights de Conversão AI
              </h3>
              <button
                onClick={() => setActiveDetail(null)}
                className="text-[10px] text-white font-bold uppercase tracking-wider px-3.5 py-1.5 mac-btn-secondary cursor-pointer select-none"
              >
                fechar painel
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-none">
              <div className="space-y-3 font-mono text-xs p-5 bg-surface-raised border border-hairline rounded-mac-md">
                <div className="flex justify-between border-b border-hairline pb-2">
                  <span className="text-ink-tertiary font-semibold uppercase">DOMÍNIO:</span>
                  <span className="text-white font-extrabold">{activeDetail.domain}</span>
                </div>
                <div className="flex justify-between border-b border-hairline pb-2">
                  <span className="text-ink-tertiary font-semibold uppercase">PLATAFORMA:</span>
                  <span className="text-ink-secondary font-bold uppercase">{activeDetail.platformName}</span>
                </div>
                <div className="flex justify-between border-b border-hairline pb-2 font-bold text-primary">
                  <span className="text-ink-secondary font-bold uppercase text-[11px]">Rank Real:</span>
                  <span className="text-sm font-extrabold">Classe [{activeDetail.rank}] / Score {activeDetail.score}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-tertiary font-semibold uppercase">Classificado:</span>
                  <span className="text-primary uppercase font-bold text-[11px]">
                    {activeDetail.nicho} ({activeDetail.type})
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest block">Headline Identificada na LP</span>
                <p className="text-xs border-l-2 border-primary pl-4 py-0.5 italic text-ink-primary/80 font-medium leading-relaxed font-sans">
                  "{activeDetail.title || "Nenhuma meta headline encontrada"}"
                </p>
              </div>

              <div className="border-t border-hairline pt-5 space-y-4">
                <div className="block text-[11px] text-ink-secondary leading-relaxed font-medium">
                  Solicite uma auditoria complementar em fração de segundos. O Gemini avaliará o arranjo mercadológico deste funil contra criativos concorrentes brasileiros.
                </div>

                {!isReanalyzing ? (
                  <button
                    onClick={() => handleGeminiReanalysis(activeDetail)}
                    className="w-full mac-btn-primary text-white font-bold py-3 px-5 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> Auditar Funil (Gemini AI)
                  </button>
                ) : (
                  <div className="p-4 bg-surface-raised border border-hairline rounded-mac-md flex items-center justify-center gap-2.5 text-primary text-xs font-bold uppercase tracking-wider">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Engajando Modelos de Linguagem...</span>
                  </div>
                )}

                {reanalysisResult && (
                  <div className="p-5 bg-surface-base border border-[#FF453A]/25 rounded-mac-lg space-y-4 font-sans text-xs text-ink-primary/80 leading-relaxed mac-fade-in relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="text-primary uppercase tracking-widest text-[9px] border-b border-hairline pb-2 flex items-center gap-1.5 font-extrabold relative z-10">
                      <Sparkles className="w-3.5 h-3.5" /> Relatório Completo Gemini AI:
                    </div>
                    
                    <div className="relative z-10">
                      <span className="text-ink-tertiary text-[9px] font-bold uppercase tracking-wider block">Headline Recomendada</span>
                      <p className="text-white italic mt-1.5 bg-surface-raised p-3 border border-hairline rounded-mac-md text-xs font-serif leading-relaxed">
                        "{reanalysisResult.headline}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div>
                        <span className="text-ink-tertiary text-[9px] font-bold uppercase tracking-wider block">Score Projetado</span>
                        <div className="text-systemGreen font-bold text-xs mt-1">
                          RANK {reanalysisResult.rank} · {reanalysisResult.score} pontos
                        </div>
                      </div>
                      <div>
                        <span className="text-ink-tertiary text-[9px] font-bold uppercase tracking-wider block">Classificação Heurística</span>
                        <div className="text-white font-bold text-xs mt-1 uppercase">
                          {reanalysisResult.nicho} · {reanalysisResult.type}
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <span className="text-ink-tertiary text-[9px] font-bold uppercase tracking-wider block">Justificativa & Engenharia Reversa</span>
                      <p className="text-ink-secondary text-xs leading-relaxed mt-1 font-medium">{reanalysisResult.justification}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
