import React, { useState } from "react";
import { Link2, Sparkles, Server, ChevronRight, ChevronDown, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FacebookAdsPanel } from "./FacebookAdsPanel";
import { useOperator } from "../contexts/OperatorContext";

interface IntegrationItem {
  id: string;
  nome: string;
  descricao: string;
  icone: React.ReactNode;
  status: "conectado" | "nao_conectado" | "em_breve";
  hasSavedCredentials?: boolean;
}

export function IntegrationsPanel() {
  const operator = useOperator();
  const CREDENTIALS_KEY = `vusk_fb_credentials_${operator.toLowerCase()}`;
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);

  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem("vusk_custom_gemini_key") || "";
  });
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveGeminiKey = (key: string) => {
    localStorage.setItem("vusk_custom_gemini_key", key.trim());
    setGeminiKey(key.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Check if credentials exist in localStorage specifically for the label indicator
  const hasFbCredentials = React.useMemo(() => {
    try {
      const saved = localStorage.getItem(CREDENTIALS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.accessToken && parsed.adAccountId);
      }
    } catch {
      return false;
    }
    return false;
  }, [activeIntegration, CREDENTIALS_KEY]);

  const handleToggleIntegration = (id: string, status: string) => {
    if (status === "em_breve") return;
    if (activeIntegration === id) {
      setActiveIntegration(null);
    } else {
      setActiveIntegration(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in mac-fade-in">
      {/* Header da Seção */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none pb-4 border-b border-hairline">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF453A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF453A]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              INTEGRAÇÕES & APIs
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
            Central de Integrações
          </h2>
          <p className="text-xs text-ink-secondary max-w-xl font-semibold mt-0.5">
            Conecte suas plataformas e centralize seus dados de performance.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-raised border border-hairline rounded-mac-sm px-3 py-1.5 text-[10.5px] font-mono text-ink-secondary font-semibold">
          <Server className="w-3.5 h-3.5 text-[#FF453A]" />
          <span>Sincronização Segura</span>
        </div>
      </div>

      {/* Grid de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Gemini API Card - Ativo */}
        <div 
          onClick={() => handleToggleIntegration("gemini", "conectado")}
          className={`mac-card rounded-mac-lg p-5 hover:bg-surface-raised transition-all duration-300 cursor-pointer flex flex-col justify-between h-full select-none ${
            activeIntegration === "gemini" 
              ? "bg-[#684DEC]/5 border-[#684DEC]/40" 
              : "bg-surface-base border-hairline hover:border-white/10"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-[#684DEC] flex items-center justify-center font-bold text-white text-base font-sans shadow-lg shadow-[#684DEC]/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              
              {/* Badges */}
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                {geminiKey && (
                  <span className="px-2 py-0.5 rounded-mac-sm bg-systemGreen/10 border border-systemGreen/25 text-systemGreen">
                    Chave Ativa
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-mac-sm ${
                  geminiKey
                    ? "bg-[#684DEC]/10 border border-[#684DEC]/20 text-white" 
                    : "bg-surface-raised border border-hairline text-[#F5F5F7]/50"
                }`}>
                  {geminiKey ? "Integrado" : "Padrão Sistema"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-wide font-sans flex items-center gap-1.5">
                Google Gemini API {activeIntegration === "gemini" ? <ChevronDown className="w-3.5 h-3.5 text-ink-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />}
              </h3>
              <p className="text-[11px] text-ink-secondary leading-relaxed font-semibold">
                Insira sua chave de API pessoal para alimentar as inteligências artificiais com infraestrutura direta e sem limites de cota da plataforma.
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-3.5 border-t border-hairline flex items-center justify-between text-[10px] text-ink-tertiary font-mono font-bold uppercase tracking-wider">
            <span>Core Model: gemini-3.5-flash</span>
            <span className={activeIntegration === "gemini" ? "text-[#684DEC]" : "text-ink-secondary"}>
              {activeIntegration === "gemini" ? "Recolher Painel ▲" : "Configurar Chave ▼"}
            </span>
          </div>
        </div>

        {/* Facebook Ads Card - Ativo */}
        <div 
          onClick={() => handleToggleIntegration("facebook", "conectado")}
          className={`mac-card rounded-mac-lg p-5 hover:bg-surface-raised transition-all duration-300 cursor-pointer flex flex-col justify-between h-full select-none ${
            activeIntegration === "facebook" 
              ? "bg-[#1877F2]/5 border-[#1877F2]/40" 
              : "bg-surface-base border-hairline hover:border-white/10"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center font-bold text-white text-xl font-sans shadow-lg shadow-[#1877F2]/20">
                f
              </div>
              
              {/* Badges */}
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                {hasFbCredentials && (
                  <span className="px-2 py-0.5 rounded-mac-sm bg-systemGreen/10 border border-systemGreen/25 text-systemGreen">
                    Credenciais Salvas
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-mac-sm ${
                  hasFbCredentials
                    ? "bg-[#1877F2]/10 border border-[#1877F2]/20 text-white" 
                    : "bg-surface-raised border border-hairline text-[#F5F5F7]/50"
                }`}>
                  {hasFbCredentials ? "Conectado" : "Não Conectado"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-wide font-sans flex items-center gap-1.5">
                Facebook Ads {activeIntegration === "facebook" ? <ChevronDown className="w-3.5 h-3.5 text-ink-secondary" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-tertiary" />}
              </h3>
              <p className="text-[11px] text-ink-secondary leading-relaxed font-semibold">
                Dados de campanhas, conjuntos, anúncios e métricas de performance agregadas com conversão.
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-3.5 border-t border-hairline flex items-center justify-between text-[10px] text-ink-tertiary font-mono font-bold uppercase tracking-wider">
            <span>Marketing API (v19.0)</span>
            <span className={activeIntegration === "facebook" ? "text-primary" : "text-ink-secondary"}>
              {activeIntegration === "facebook" ? "Recolher Painel ▲" : "Configurar & Visualizar ▼"}
            </span>
          </div>
        </div>

        {/* Hotmart Card - Em Breve */}
        <div className="border border-hairline bg-surface-raised/20 opacity-45 rounded-mac-lg p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone - Chama laranja */}
              <div className="h-10 w-10 rounded-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-lg">
                🔥
              </div>
              <span className="px-2 py-0.5 rounded-mac-sm bg-surface-raised border border-hairline text-[9px] font-bold text-ink-tertiary font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-ink-secondary tracking-wide font-sans">
                Hotmart
              </h3>
              <p className="text-[11px] text-ink-tertiary leading-relaxed font-sans">
                Importe faturamento, reembolsos, taxas de conversão de checkout e relatórios periódicos de vendas.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-hairline text-[10px] text-ink-tertiary font-mono font-bold tracking-wider">
            API WEBHOOKS & SALES
          </div>
        </div>

        {/* Kiwify Card - Em Breve */}
        <div className="border border-hairline bg-surface-raised/20 opacity-45 rounded-mac-lg p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center font-bold text-indigo-400 text-lg font-sans">
                K
              </div>
              <span className="px-2 py-0.5 rounded-mac-sm bg-surface-raised border border-hairline text-[9px] font-bold text-ink-tertiary font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-ink-secondary tracking-wide font-sans">
                Kiwify
              </h3>
              <p className="text-[11px] text-ink-tertiary leading-relaxed font-sans">
                Sincronize pedidos aceitos, gerados e recusados, e monitore carrinhos abandonados em tempo de execução.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-hairline text-[10px] text-ink-tertiary font-mono font-bold tracking-wider">
            WEBHOOK NOTIFIER API
          </div>
        </div>

        {/* UTMify Card - Em Breve */}
        <div className="border border-hairline bg-surface-raised/20 opacity-45 rounded-mac-lg p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-400 text-base">
                📈
              </div>
              <span className="px-2 py-0.5 rounded-mac-sm bg-surface-raised border border-hairline text-[9px] font-bold text-ink-tertiary font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-ink-secondary tracking-wide font-sans">
                UTMify Track
              </h3>
              <p className="text-[11px] text-ink-tertiary leading-relaxed font-sans">
                Sincronize tags de rastreamento avançado, tráfego de páginas, links de criativos e dados UTM integrados.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-hairline text-[10px] text-ink-tertiary font-mono font-bold tracking-wider">
            TRACKING PIXEL GRAPH
          </div>
        </div>

        {/* Google Analytics Card - Em Breve */}
        <div className="border border-hairline bg-surface-raised/20 opacity-45 rounded-mac-lg p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-500 text-lg">
                📊
              </div>
              <span className="px-2 py-0.5 rounded-mac-sm bg-surface-raised border border-hairline text-[9px] font-bold text-ink-tertiary font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-ink-secondary tracking-wide font-sans">
                Google Analytics 4
              </h3>
              <p className="text-[11px] text-ink-tertiary leading-relaxed font-sans">
                Monitore visualizações de páginas, funis de navegação de visitantes do site, engajamento e demografia.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-hairline text-[10px] text-ink-tertiary font-mono font-bold tracking-wider">
            GA4 DATA REPORTING API
          </div>
        </div>

        {/* Eduzz / Monetizze Card - Em Breve */}
        <div className="border border-hairline bg-surface-raised/20 opacity-45 rounded-mac-lg p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-yellow-600/10 border border-yellow-600/20 flex items-center justify-center text-yellow-500 text-lg">
                💰
              </div>
              <span className="px-2 py-0.5 rounded-mac-sm bg-surface-raised border border-hairline text-[9px] font-bold text-ink-tertiary font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-ink-secondary tracking-wide font-sans">
                Eduzz & Monetizze
              </h3>
              <p className="text-[11px] text-[#F5F5F7]/30 leading-relaxed font-sans">
                Consolide assinaturas ativas, pagamentos recorrentes faturados e relatórios de coprodução automatizados.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-hairline text-[10px] text-ink-tertiary font-mono font-bold tracking-wider">
            COMMERCE INTEGRATION GATEWAY
          </div>
        </div>

        {/* Painel Expansível Inline (Google Gemini) */}
        {activeIntegration === "gemini" && (
          <div className="col-span-full">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-2"
            >
              <div className="border border-hairline bg-surface-raised rounded-mac-lg p-6 space-y-4 text-left">
                <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-mac p-4 text-left">
                  <Info className="w-4 h-4 text-[#684DEC] mt-0.5 shrink-0" />
                  <div className="text-xs space-y-1 leading-relaxed">
                    <p className="font-bold text-white">Chave de API do Gemini Privada (Recomendado)</p>
                    <p className="text-ink-secondary">
                      Ao configurar sua própria chave que começa com <code className="bg-black/45 px-1 py-0.5 rounded text-white font-mono select-all">AQ...</code> ou as tradicionais, todas as consultas do Vusk serão processadas diretamente na sua cota do Google. Isso resolve erros de conexões e instabilidades de rede no servidor!
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] text-ink-secondary font-mono font-semibold uppercase tracking-wider select-none">
                    Gemini API Key (Começa com AQ... ou AIza...)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="Cole sua chave aqui..."
                      className="flex-1 bg-[#1C1C1E] border border-white/10 rounded-mac px-3.5 py-2 text-xs text-white font-mono focus:border-[#684DEC] focus:outline-none placeholder-ink-tertiary/60 transition"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveGeminiKey(geminiKey)}
                        className="px-4 py-2 bg-[#684DEC] hover:bg-[#684DEC]/90 text-white font-sans font-bold text-xs rounded-mac transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#684DEC]/20 active:scale-95"
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                        {isSaved ? "Salvo!" : "Salvar Chave"}
                      </button>
                      
                      {geminiKey && (
                        <button
                          onClick={() => {
                            localStorage.removeItem("vusk_custom_gemini_key");
                            setGeminiKey("");
                            setIsSaved(true);
                            setTimeout(() => setIsSaved(false), 2000);
                          }}
                          className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500/80 border border-red-500/20 font-sans font-bold text-xs rounded-mac transition cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Painel Expansível Inline (Facebook Ads) */}
        {activeIntegration === "facebook" && (
          <div className="col-span-full">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="mt-2"
            >
              <FacebookAdsPanel />
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
