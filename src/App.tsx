import { useState, useEffect } from "react";
import { Activity, LayoutDashboard, Cpu, BookOpen, Heart, Coffee, RefreshCcw, Database, FolderHeart, Menu, X, Radio, Bot, Zap, Users, Layers, Plug2 } from "lucide-react";
import { OfferHit, Tracker } from "./types";
import { FALLBACK_TRACKERS } from "./constants/fallbackTrackers";
import { MiningPanel } from "./components/MiningPanel";
import { DashboardPanel } from "./components/DashboardPanel";
import { HelpPanel } from "./components/HelpPanel";
import { CursorGlow } from "./components/CursorGlow";
import { SupabasePanel } from "./components/SupabasePanel";
import { CreativeVault } from "./components/CreativeVault";
import { MetaAdsRadar } from "./components/MetaAdsRadar";
import { AIAgentsPanel } from "./components/AIAgentsPanel";
import { CopyAnglesPanel } from "./components/CopyAnglesPanel";
import { AudienceDossierPanel } from "./components/AudienceDossierPanel";
import { FunnelBuilderPanel } from "./components/FunnelBuilderPanel";
import { PlaybookPanel } from "./components/PlaybookPanel";
import { IntegrationsPanel } from "./components/IntegrationsPanel";
import { FacebookCallbackHandler } from "./components/FacebookCallbackHandler";
import { LandingScreen } from "./components/LandingScreen";
import { useAuth } from "./hooks/useAuth";
import { OperatorContext } from "./contexts/OperatorContext";
import { isSupabaseConfigured } from "./lib/supabase";
import { fetchOffersFromSupabase } from "./lib/databaseService";

const bgHeaderImage = new URL("./assets/images/site_background_1780799392800.png", import.meta.url).href;

// Initial visual seeds to showcase premium analytics out-of-the-box (All pointing to highly-stable, active top sites)
const INITIAL_SEED_OFFERS: OfferHit[] = [
  {
    id: "seed-1",
    url: "https://formulanegocioonline.com",
    domain: "formulanegocioonline.com",
    title: "Fórmula Negócio Online - O Maior Treinamento de Marketing Digital do Brasil",
    tracker: "hotmart.com",
    platformName: "Hotmart",
    market: "BR",
    nicho: "renda_extra",
    type: "VSL",
    score: 15,
    rank: "S",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString()
  },
  {
    id: "seed-2",
    url: "https://viverdeblog.com",
    domain: "viverdeblog.com",
    title: "Viver de Blog - Produção de Conteúdo, Infoprodutos e Copywriting Profissional",
    tracker: "kiwify.com.br",
    platformName: "Kiwify",
    market: "BR",
    nicho: "renda_extra",
    type: "LOW_TICKET",
    score: 11,
    rank: "A",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
  },
  {
    id: "seed-3",
    url: "https://receitadesecarrapido.com",
    domain: "receitadesecarrapido.com",
    title: "Protocolo Secar em 30 Dias - Desafio Detox Fibras Ativas",
    tracker: "lowify.com.br",
    platformName: "Lowify",
    market: "BR",
    nicho: "emagrecimento",
    type: "LOW_TICKET",
    score: 14,
    rank: "S",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 14).toISOString()
  },
  {
    id: "seed-4",
    url: "https://desafio-bumbum-na-nuca.vercel.app",
    domain: "desafio-bumbum-na-nuca.vercel.app",
    title: "Bumbum Ativo: Projeto 4 Semanas de Tonificação Estética",
    tracker: "vercel.app",
    platformName: "Vercel Sites",
    market: "BR",
    nicho: "beleza",
    type: "DIRECT_SALES",
    score: 13,
    rank: "S",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 18).toISOString()
  },
  {
    id: "seed-5",
    url: "https://detoxsecreto.site",
    domain: "detoxsecreto.site",
    title: "Aprenda como emagrecer por apenas R$10 obtendo o PDF direto no Whatsapp!",
    tracker: "por apenas R$10 PDF whatsapp",
    platformName: "KW: R$10 PDF zap",
    market: "BR",
    nicho: "emagrecimento",
    type: "LOW_TICKET",
    score: 14,
    rank: "S",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString()
  },
  {
    id: "seed-6",
    url: "https://metodo-virilidade-plena.lovable.app",
    domain: "metodo-virilidade-plena.lovable.app",
    title: "Segredo da Testosterona Elevada aos 50 Anos - Manual Nobre",
    tracker: "lovable.app",
    platformName: "Lovable IA",
    market: "BR",
    nicho: "saude_masculina",
    type: "VSL",
    score: 14,
    rank: "S",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 28).toISOString()
  },
  {
    id: "seed-7",
    url: "https://ganhedigitando-br.site",
    domain: "ganhedigitando-br.site",
    title: "Avaliador Recompensado Oficial - Receba via Buckpay",
    tracker: "buckpay.com.br",
    platformName: "Buckpay",
    market: "BR",
    nicho: "renda_extra",
    type: "QUIZ",
    score: 15,
    rank: "S",
    scannedAt: new Date(Date.now() - 3600 * 1000 * 32).toISOString()
  }
];

function isRealCommercialOffer(hit: OfferHit): boolean {
  if (!hit || !hit.url) return false;
  const normUrl = hit.url.toLowerCase();
  const normTitle = (hit.title || "").toLowerCase();
  const normDomain = (hit.domain || "").toLowerCase();

  // Platform/Tracker main domains and technical/admin subdomains
  const platformKeywords = ["hotmart", "kiwify", "eduzz", "monetizze", "kirvano", "cakto", "greenn", "lastlink", "braip", "perfectpay", "ticto", "ampliopay", "ggcheckout", "pepper", "clickbank", "digistore24", "warriorplus", "jvzoo", "cartpanda", "yampi", "doppus", "kiwipay"];
  
  // Suffix subdomains to reject
  const bannedPrefixes = ["blog.", "suporte.", "ajuda.", "help.", "support.", "dashboard.", "office.", "admin.", "sandbox.", "portal.", "status.", "news.", "pay.", "checkout."];
  if (bannedPrefixes.some(sub => normDomain.startsWith(sub))) {
    return false;
  }

  // If the domain is exactly the tracker platform's base or contains them in an platform-owned hostname structure
  const isDirectPlatform = platformKeywords.some(keyword => {
    // Exact domain match like "kiwify.com.br"
    return normDomain === keyword + ".com" || 
           normDomain === keyword + ".com.br" || 
           normDomain === keyword + ".net" || 
           normDomain === keyword + ".io" ||
           normDomain === "www." + keyword + ".com" ||
           normDomain === "www." + keyword + ".com.br";
  });
  if (isDirectPlatform) {
    return false;
  }

  // Exclude error conditions
  const errorWords = ["404", "not found", "forbidden", "suspended", "site suspenso", "em construção", "coming soon", "index of /", "error", "erro", "nginx", "apache"];
  if (errorWords.some(word => normTitle.includes(word) || normUrl.includes(word))) {
    return false;
  }

  // Exclude technical paths or pages that are NOT sales funnels
  const policyAndDocs = ["/politica-de-privacidade", "/privacy-policy", "/termos-de-uso", "/terms", "/contact", "/contato", "/fale-conosco", "/ajuda", "/suporte", "/blog", "/faq"];
  if (policyAndDocs.some(path => normUrl.includes(path))) {
    return false;
  }

  return true;
}

export default function App() {
  const isFacebookCallback = window.location.pathname === "/auth/facebook/callback";

  if (isFacebookCallback) {
    return <FacebookCallbackHandler />;
  }

  const { isAuthenticated, isChecking, currentOperator, authenticate, logout } = useAuth();
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        setShowApp(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setShowApp(false);
    }
  }, [isAuthenticated]);

  const [activeTab, setActiveTab] = useState<"mining" | "vault" | "radar" | "playbooks" | "agents" | "angles" | "audience" | "funnel" | "help" | "integrations">("mining");
  const [apiKey, setApiKey] = useState("");
  const [days, setDays] = useState(30);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load from local storage, or fallback to beautiful seeded demo offers
  const [offerHits, setOfferHits] = useState<OfferHit[]>(() => {
    try {
      const cached = localStorage.getItem("minerador_pro_hits");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = parsed.filter(isRealCommercialOffer);
          return sanitized.length > 0 ? sanitized : INITIAL_SEED_OFFERS;
        }
      }
    } catch (err) {
      console.error("Local storage read error, defaulting to seed database:", err);
    }
    return INITIAL_SEED_OFFERS;
  });

  const [trackers, setTrackers] = useState<Tracker[]>(FALLBACK_TRACKERS);
  const [trackersLoading, setTrackersLoading] = useState(false);

  // Pull latest records on app start if Supabase is linked
  useEffect(() => {
    if (!isAuthenticated) return;
    async function syncOnStart() {
      if (isSupabaseConfigured) {
        try {
          const remoteRecords = await fetchOffersFromSupabase();
          if (remoteRecords && remoteRecords.length > 0) {
            setOfferHits(remoteRecords);
            localStorage.setItem("minerador_pro_hits", JSON.stringify(remoteRecords));
          }
        } catch (err) {
          console.error("Auto syncing from Supabase failed on mount:", err);
        }
      }
    }
    syncOnStart();
  }, [isAuthenticated]);

  // Fetch trackers list from server catalog
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadTrackers() {
      try {
        const res = await fetch("/api/trackers");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.trackers) {
            setTrackers(data.trackers);
          }
        }
      } catch (err) {
        console.warn("Failed to load trackers catalog from express node server (falling back to client-side trackers):", err);
      } finally {
        setTrackersLoading(false);
      }
    }
    loadTrackers();
  }, [isAuthenticated]);

  // Sync Initial seed back into local storage if state loaded seeds
  useEffect(() => {
    if (!isAuthenticated) return;
    if (offerHits.length > 0) {
      localStorage.setItem("minerador_pro_hits", JSON.stringify(offerHits));
    }
  }, [offerHits, isAuthenticated]);

  if (isChecking) {
    return (
      <div className="w-screen h-screen bg-[#060607] flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingScreen onAuthenticated={authenticate} />;
  }

  return (
    <OperatorContext.Provider value={currentOperator || "Bernardo"}>
      <div className={`min-h-screen bg-[#060607] text-white flex flex-col md:flex-row font-sans selection:bg-primary/30 selection:text-white relative overflow-x-hidden transition-opacity duration-500 ${showApp ? "opacity-100" : "opacity-0"}`}>
      {/* Background Dots */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-0"></div>

      {/* Sidebar para telas médias e maiores (Desktop/Tablet) */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-[#0B0B0C]/90 backdrop-blur-md border-r border-white/5 z-45 select-none overflow-y-auto">
        {/* Banner de cabeçalho no sidebar */}
        <div 
          className="p-6 border-b border-white/5 relative overflow-hidden bg-cover bg-center h-28 flex flex-col justify-end"
          style={{ backgroundImage: `linear-gradient(to bottom, rgba(11, 11, 12, 0.3), rgba(11, 11, 12, 0.95)), url(${bgHeaderImage})` }}
        >
          {/* Subtle neon glowing accent strip under header in sidebar */}
          <div className="absolute bottom-0 left-0 right-0 h-[10px] bg-gradient-to-t from-primary/10 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-2 z-10">
            {/* Custom Neon Glow Brand Indicator */}
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center relative shadow-[0_0_12px_rgba(255,42,42,0.6)]">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            </div>
            <div>
              <div className="font-sans font-extrabold text-xs tracking-wider uppercase text-white flex items-center gap-1">
                VUSK<span className="text-primary font-bold"> </span>OPERATION
                <span className="text-[9px] text-zinc-500 font-mono font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/5">v5</span>
              </div>
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5 select-none text-left">
                Operador: <span className="text-red-500 font-bold">{currentOperator}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Links verticais do menu no sidebar */}
        <nav className="flex-1 p-5 space-y-3 pt-6">
          {/* Grupo 1 */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 font-mono px-3 block mb-1">
              Mineração
            </span>
            <button
              onClick={() => setActiveTab("mining")}
              id="tab-mining"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer select-none text-left border ${
                activeTab === "mining"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0 text-primary" />
              <span>Varredura Ativa</span>
            </button>
          </div>

          <div className="h-px bg-white/[0.04] my-2" />

          {/* Grupo 2 */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 font-mono px-3 block mb-1">
              Tráfego Pago
            </span>
            <button
              onClick={() => setActiveTab("vault")}
              id="tab-vault"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer select-none text-left border ${
                activeTab === "vault"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <FolderHeart className="w-4 h-4 shrink-0 text-primary" />
              <span>Cofre Criativos</span>
            </button>

            <button
              onClick={() => setActiveTab("radar")}
              id="tab-radar"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer select-none text-left border ${
                activeTab === "radar"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <Radio className="w-4 h-4 shrink-0 text-primary animate-pulse" />
              <span>Radar Meta Ads</span>
            </button>
          </div>

          <div className="h-px bg-white/[0.04] my-2" />

          {/* Grupo 3 */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 font-mono px-3 block mb-1">
              IA
            </span>
            <button
              onClick={() => setActiveTab("agents")}
              id="tab-agents"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer select-none text-left border ${
                activeTab === "agents"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <Bot className="w-4 h-4 shrink-0 text-primary" />
              <span>Agentes IA</span>
            </button>

            <button
              onClick={() => setActiveTab("audience")}
              id="tab-audience"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center justify-between cursor-pointer select-none border ${
                activeTab === "audience"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0 text-primary" />
                <span>Público-Alvo</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-[#FF2A2A] text-[8px] font-bold text-white uppercase font-mono tracking-wider select-none shrink-0 transform scale-90">
                IA
              </span>
            </button>

            <button
              onClick={() => setActiveTab("funnel")}
              id="tab-funnel"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center justify-between cursor-pointer select-none border ${
                activeTab === "funnel"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 shrink-0 text-primary" />
                <span>Criador de Funil</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-primary text-[8px] font-bold text-white uppercase font-mono tracking-wider select-none shrink-0 transform scale-90">
                IA
              </span>
            </button>

            <button
              onClick={() => setActiveTab("angles")}
              id="tab-angles"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center justify-between cursor-pointer select-none border ${
                activeTab === "angles"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 shrink-0 text-primary" />
                <span>Ângulos de Copy</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-primary text-[8px] font-bold text-white uppercase font-mono tracking-wider select-none shrink-0 transform scale-90">
                IA
              </span>
            </button>
          </div>

          <div className="h-px bg-white/[0.04] my-2" />

          {/* Grupo 4 */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 font-mono px-3 block mb-1">
              Playbooks
            </span>
            <button
              onClick={() => setActiveTab("playbooks")}
              id="tab-playbooks"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer select-none text-left border ${
                activeTab === "playbooks"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0 text-primary" />
              <span>Playbooks</span>
            </button>
          </div>

          <div className="h-px bg-white/[0.04] my-2" />

          {/* GRUPO INTEGRAÇÕES */}
          <div className="space-y-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600 font-mono px-3 block mb-1">
              Integrações
            </span>
            <button
              onClick={() => setActiveTab("integrations")}
              id="tab-integrations"
              className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center justify-between cursor-pointer select-none border ${
                activeTab === "integrations"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                  : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <Plug2 className="w-4 h-4 shrink-0 text-[#1877F2]" />
                <span>Integrações</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-[#1877F2]/20 text-[8px] font-bold text-[#1877F2] uppercase font-mono tracking-wider">
                NOVO
              </span>
            </button>
          </div>

          <div className="h-px bg-white/[0.04] my-2" />

          {/* Guia Prático */}
          <button
            onClick={() => setActiveTab("help")}
            id="tab-help"
            className={`w-full px-4 py-3 rounded-xl text-xs font-sans font-semibold tracking-wide transition-all duration-300 flex items-center gap-3 cursor-pointer select-none text-left border ${
              activeTab === "help"
                ? "bg-primary border-primary/20 text-white shadow-[0_0_15px_rgba(255,42,42,0.4)] font-bold"
                : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03] hover:border-white/5"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0 text-primary" />
            <span>Guia Prático</span>
          </button>
        </nav>

        {/* Footer info/Database configuration in Sidebar */}
        <div className="p-4 border-t border-white/5 space-y-3 bg-[#080809]/40 select-none">
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block px-1 font-mono">
            Status da Infra
          </span>

          <button
            onClick={() => setIsSupabaseOpen(true)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-[10px] font-sans font-bold tracking-wider transition-all uppercase cursor-pointer ${
              isSupabaseConfigured 
                ? "bg-[#10B981]/10 border-[#10B981]/15 text-[#10B981] hover:bg-[#10B981]/15 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
                : "bg-amber-500/10 border-amber-500/15 text-amber-500 hover:bg-amber-500/15"
            }`}
          >
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5" />
              <span>SUPABASE</span>
            </span>
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/30 font-extrabold uppercase">
              {isSupabaseConfigured ? "OK" : "Vincular"}
            </span>
          </button>

          <div className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/5 rounded-xl select-none">
            <span className="text-[10px] text-zinc-400 font-sans tracking-wide">STATUS ONLINE</span>
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-red-500/15 text-[10px] font-sans font-bold tracking-wider text-red-500 hover:bg-red-500/10 transition-all uppercase cursor-pointer"
          >
            Sair do Perfil
          </button>
        </div>
      </aside>

      {/* Top Navbar para telas móveis (Smartphone/Tablet menores que 768px) */}
      <header className="md:hidden flex h-16 w-full items-center justify-between px-4 sticky top-0 z-50 bg-[#0B0B0C]/90 backdrop-blur-md border-b border-white/5 select-none animate-fade-in pr-2">
        <div className="flex items-center gap-2">
          {/* Brand logotype */}
          <div className="w-4.5 h-4.5 rounded-full bg-primary flex items-center justify-center relative shadow-[0_0_10px_rgba(255,42,42,0.6)]">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </div>
          <span className="font-sans font-black text-xs uppercase tracking-wider text-white">
            VUSK<span className="text-primary font-extrabold"> </span>OPERATION
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Database Toggle trigger */}
          <button
            onClick={() => setIsSupabaseOpen(true)}
            className={`flex items-center justify-center w-11 h-11 rounded-full border text-[9px] font-sans font-bold transition-all cursor-pointer ${
              isSupabaseConfigured 
                ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]" 
                : "bg-amber-500/10 border-amber-500/20 text-amber-500"
            }`}
            title={isSupabaseConfigured ? "Supabase Vinculado" : "Conectar Supabase"}
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Touch-optimized Hamburguer Menu Trigger (mínimo 44x44px target) */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-white transition-all cursor-pointer active:scale-95"
            aria-label="Alternar menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-red-500" /> : <Menu className="w-5 h-5 text-zinc-300" />}
          </button>
        </div>
      </header>

      {/* Slide-out Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0A0A0B]/98 backdrop-blur-lg flex flex-col justify-between pt-24 p-6 animate-fade-in select-none">
          <nav className="space-y-3 pt-4 overflow-y-auto max-h-[65vh] pr-1">
            {[
              {
                title: "Mineração",
                items: [{ id: "mining", label: "Varredura Ativa", icon: Cpu }]
              },
              {
                title: "Tráfego Pago",
                items: [
                  { id: "vault", label: "Cofre Criativos", icon: FolderHeart },
                  { id: "radar", label: "Radar Meta Ads", icon: Radio }
                ]
              },
              {
                title: "IA",
                items: [
                  { id: "agents", label: "Agentes IA", icon: Bot },
                  { id: "audience", label: "Público-Alvo", icon: Users },
                  { id: "funnel", label: "Criador de Funil", icon: Layers },
                  { id: "angles", label: "Ângulos de Copy", icon: Zap }
                ]
              },
              {
                title: "Playbooks",
                items: [{ id: "playbooks", label: "Playbooks", icon: BookOpen }]
              },
              {
                title: "Integrações",
                items: [{ id: "integrations", label: "Integrações", icon: Plug2, hasBadge: true }]
              }
            ].map((group, gIdx) => (
              <div key={group.title} className="space-y-2">
                {gIdx > 0 && <div className="h-px bg-white/[0.04] my-2" />}
                <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest px-2 mb-2 block font-bold">
                  {group.title}
                </span>
                <div className="space-y-2">
                  {group.items.map((tab) => {
                    const TabIcon = tab.icon;
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full px-5 py-4 rounded-2xl text-xs font-sans font-bold tracking-wide transition-all duration-300 flex items-center justify-between border cursor-pointer active:scale-[0.98] ${
                          isSelected
                            ? "bg-primary border-primary/20 text-white shadow-[0_0_20px_rgba(255,42,42,0.45)]"
                            : "text-zinc-400 hover:text-white bg-white/5 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <TabIcon className={`w-4.5 h-4.5 shrink-0 ${tab.id === "integrations" ? "text-[#1877F2]" : "text-primary"}`} />
                          <span>{tab.label}</span>
                        </div>
                        {tab.id === "integrations" && (
                          <span className="px-1.5 py-0.5 rounded bg-[#1877F2]/20 text-[8px] font-bold text-[#1877F2] uppercase font-mono tracking-wider">
                            NOVO
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="h-px bg-white/[0.04] my-2" />

            <button
              onClick={() => {
                setActiveTab("help");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-5 py-4 rounded-2xl text-xs font-sans font-bold tracking-wide transition-all duration-300 flex items-center gap-4 text-left border cursor-pointer active:scale-[0.98] ${
                activeTab === "help"
                  ? "bg-primary border-primary/20 text-white shadow-[0_0_20px_rgba(255,42,42,0.45)]"
                  : "text-zinc-400 hover:text-white bg-white/5 border-transparent"
              }`}
            >
              <BookOpen className="w-4.5 h-4.5 shrink-0 text-primary" />
              <span>Guia Prático</span>
            </button>
          </nav>

          <div className="space-y-4 pb-8">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block font-mono">
                Status de Rede
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Canal de Varredura</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#10B981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                  ONLINE
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSupabaseOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-center gap-2.5 px-5 py-4 rounded-full border text-[11px] font-sans font-bold tracking-widest transition-all uppercase cursor-pointer ${
                isSupabaseConfigured 
                  ? "bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]" 
                  : "bg-amber-500/10 border-amber-500/20 text-amber-500"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>{isSupabaseConfigured ? "Supabase Vinculado" : "Vincular Supabase"}</span>
            </button>

            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-full border border-red-500/20 text-[11px] font-sans font-bold tracking-widest text-[#FF2A2A] hover:bg-red-500/10 transition-all uppercase cursor-pointer"
            >
              Sair do Perfil ({currentOperator})
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo à Direita (Com recuo correspondente à largura da sidebar fixa no desktop) */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 md:pl-64 z-10 relative pb-12">
        {/* Primary content area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 space-y-12 z-10 relative">
          
          {/* Spatial Luxury Hero Headings Section */}
          <div className="text-center space-y-4 max-w-4xl mx-auto py-4 relative select-none">
            {/* Ambient red haze background gradient behind title text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none z-0"></div>

            {/* Modern Hero Eyebrow Micro-label */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-zinc-400 font-bold tracking-widest uppercase z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]"></span>
              01 — Inteligência Competitiva de Campanhas
            </div>

            <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.15] z-10 relative">
              Encontre Ofertas Ocultas <span className="italic text-zinc-400 font-light block sm:inline">através de Escaneamento</span> <span className="text-primary text-transparent bg-clip-text bg-gradient-to-r from-primary via-rose-500 to-amber-500 shadow-sm relative block sm:inline">Neon Ativo</span>
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed font-medium pt-1">
              O Vusk Operation mapeia scripts de rastreamento de alta tração como <strong className="text-white bg-white/5 px-1.5 py-0.5 rounded font-bold">UTMify</strong> e checkout gateways para revelar funis ocultos nas ad networks brasileiras e modelar ângulos de copy persuasivos integrando inteligência artificial.
            </p>

            <div className="pt-2 flex justify-center items-center gap-4 sm:gap-6 text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[#10B981]">✓</span> {trackersLoading ? "Carregando..." : `${trackers.length} Fontes Mapeadas`}
              </div>
              <div className="w-1 h-1 bg-white/10 rounded-full"></div>
              <div>
                <span className="font-semibold text-primary">★</span> {offerHits.length} Funis Coletados
              </div>
            </div>
          </div>

          {/* Tab contents conditional switch wrapped in premium containers */}
          <div className="space-y-6">
            {activeTab === "mining" && (
              <MiningPanel
                apiKey={apiKey}
                setApiKey={setApiKey}
                days={days}
                setDays={setDays}
                offerHits={offerHits}
                setOfferHits={setOfferHits}
                trackers={trackers}
              />
            )}

            {activeTab === "vault" && <CreativeVault />}

            {activeTab === "playbooks" && <PlaybookPanel />}

            {activeTab === "radar" && <MetaAdsRadar />}

            {activeTab === "agents" && <AIAgentsPanel />}

            {activeTab === "audience" && <AudienceDossierPanel />}

            {activeTab === "funnel" && <FunnelBuilderPanel />}

            {activeTab === "angles" && <CopyAnglesPanel />}

            {activeTab === "help" && <HelpPanel />}

            {activeTab === "integrations" && <IntegrationsPanel />}
          </div>
        </main>

        {/* Clean, luxury footer with minimalist visual rhythm */}
        <footer className="mt-28 pt-12 border-t border-white/5 text-center space-y-4 pb-8 z-10 relative select-none">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shadow-[0_0_10px_rgba(255,42,42,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            </div>
            <span className="font-sans font-bold text-xs uppercase tracking-widest text-white">
              VUSK<span className="text-primary font-bold"> </span>OPERATION
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 max-w-md mx-auto leading-relaxed font-medium px-4">
            Mapeamento tecnológico avançado de gateways de pagamento e funis de afiliados em tempo real. Projetado sob diretrizes de conformidade corporativa e inteligência de mercado digital.
          </div>
          <div className="text-[9px] text-zinc-650 uppercase tracking-widest mt-1">
            © {new Date().getFullYear()} Vusk Operation. Todos os direitos reservados.
          </div>
        </footer>
      </div>

      {/* Subtle cursor follow red aura trace */}
      <CursorGlow />

      {/* Supabase details modal overlay */}
      {isSupabaseOpen && (
        <SupabasePanel
          offerHits={offerHits}
          setOfferHits={setOfferHits}
          onClose={() => setIsSupabaseOpen(false)}
        />
      )}
      </div>
    </OperatorContext.Provider>
  );
}
