import React, { useState } from "react";
import { Link2, Sparkles, Server, ChevronRight, ChevronDown, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FacebookAdsPanel } from "./FacebookAdsPanel";

interface IntegrationItem {
  id: string;
  nome: string;
  descricao: string;
  icone: React.ReactNode;
  status: "conectado" | "nao_conectado" | "em_breve";
  hasSavedCredentials?: boolean;
}

export function IntegrationsPanel() {
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);

  // Check if credentials exist in localStorage specifically for the label indicator
  const hasFbCredentials = React.useMemo(() => {
    try {
      const saved = localStorage.getItem("vusk_fb_credentials");
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!(parsed.accessToken && parsed.adAccountId);
      }
    } catch {
      return false;
    }
    return false;
  }, [activeIntegration]);

  const handleToggleIntegration = (id: string, status: string) => {
    if (status === "em_breve") return;
    if (activeIntegration === id) {
      setActiveIntegration(null);
    } else {
      setActiveIntegration(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header da Seção */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 select-none pb-4 border-b border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF2A2A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF2A2A]"></span>
            </span>
            <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
              INTEGRAÇÕES & APIs
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight font-sans">
            Central de Integrações
          </h2>
          <p className="text-xs text-zinc-400 max-w-xl font-medium mt-0.5">
            Conecte suas plataformas e centralize seus dados de performance.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#141416] border border-white/5 rounded-xl px-3 py-1.5 text-[10.5px] font-mono text-zinc-400 font-medium">
          <Server className="w-3.5 h-3.5 text-[#FF2A2A]" />
          <span>Sincronização Segura</span>
        </div>
      </div>

      {/* Grid de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Facebook Ads Card - Ativo */}
        <div 
          onClick={() => handleToggleIntegration("facebook", "conectado")}
          className={`border rounded-2xl p-5 hover:bg-zinc-950/60 transition-all duration-300 cursor-pointer flex flex-col justify-between h-full select-none ${
            activeIntegration === "facebook" 
              ? "bg-zinc-950/80 border-[#1877F2]/40 ring-1 ring-[#1877F2]/10" 
              : "bg-zinc-950/40 border-white/5 hover:border-white/10"
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center font-extrabold text-white text-xl font-sans shadow-lg shadow-[#1877F2]/20">
                f
              </div>
              
              {/* Badges */}
              <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold">
                {hasFbCredentials && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    Credenciais Salvas
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full ${
                  hasFbCredentials
                    ? "bg-[#1877F2]/10 border border-[#1877F2]/20 text-white" 
                    : "bg-zinc-800 text-zinc-400"
                }`}>
                  {hasFbCredentials ? "Conectado" : "Não Conectado"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-white tracking-wide font-sans flex items-center gap-1.5">
                Facebook Ads {activeIntegration === "facebook" ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                Dados de campanhas, conjuntos, anúncios e métricas de performance agregadas com conversão.
              </p>
            </div>
          </div>
          
          <div className="mt-4 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
            <span>Marketing API (v19.0)</span>
            <span className={activeIntegration === "facebook" ? "text-primary" : "text-zinc-400"}>
              {activeIntegration === "facebook" ? "Recolher Painel ▲" : "Configurar & Visualizar ▼"}
            </span>
          </div>
        </div>

        {/* Hotmart Card - Em Breve */}
        <div className="border border-white/5 bg-zinc-950/20 opacity-50 rounded-2xl p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone - Chama laranja */}
              <div className="h-10 w-10 rounded-full bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-lg">
                🔥
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-white/5 text-[9px] font-bold text-zinc-500 font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-300 tracking-wide font-sans">
                Hotmart
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Importe faturamento, reembolsos, taxas de conversão de checkout e relatórios periódicos de vendas.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-white/[0.02] text-[10px] text-zinc-600 font-mono font-bold tracking-wider">
            API WEBHOOKS & SALES
          </div>
        </div>

        {/* Kiwify Card - Em Breve */}
        <div className="border border-white/5 bg-zinc-950/20 opacity-50 rounded-2xl p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center font-extrabold text-indigo-400 text-lg font-sans">
                K
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-white/5 text-[9px] font-bold text-zinc-500 font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-300 tracking-wide font-sans">
                Kiwify
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Sincronize pedidos aceitos, gerados e recusados, e monitore carrinhos abandonados em tempo de execução.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-white/[0.02] text-[10px] text-zinc-600 font-mono font-bold tracking-wider">
            WEBHOOK NOTIFIER API
          </div>
        </div>

        {/* UTMify Card - Em Breve */}
        <div className="border border-white/5 bg-zinc-950/20 opacity-50 rounded-2xl p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-400 text-base">
                📈
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-white/5 text-[9px] font-bold text-zinc-500 font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-300 tracking-wide font-sans">
                UTMify Track
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Sincronize tags de rastreamento avançado, tráfego de páginas, links de criativos e dados UTM integrados.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-white/[0.02] text-[10px] text-zinc-600 font-mono font-bold tracking-wider">
            TRACKING PIXEL GRAPH
          </div>
        </div>

        {/* Google Analytics Card - Em Breve */}
        <div className="border border-white/5 bg-zinc-950/20 opacity-50 rounded-2xl p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-500 text-lg">
                📊
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-white/5 text-[9px] font-bold text-zinc-500 font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-300 tracking-wide font-sans">
                Google Analytics 4
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Monitore visualizações de páginas, funis de navegação de visitantes do site, engajamento e demografia.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-white/[0.02] text-[10px] text-zinc-600 font-mono font-bold tracking-wider">
            GA4 DATA REPORTING API
          </div>
        </div>

        {/* Eduzz / Monetizze Card - Em Breve */}
        <div className="border border-white/5 bg-zinc-950/20 opacity-50 rounded-2xl p-5 flex flex-col justify-between h-full select-none cursor-not-allowed">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {/* Logo / Ícone */}
              <div className="h-10 w-10 rounded-full bg-yellow-600/10 border border-yellow-600/20 flex items-center justify-center text-yellow-500 text-lg">
                💰
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-white/5 text-[9px] font-bold text-zinc-500 font-mono">
                EM BREVE
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-zinc-300 tracking-wide font-sans">
                Eduzz & Monetizze
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                Consolide assinaturas ativas, pagamentos recorrentes faturados e relatórios de coprodução automatizados.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-white/[0.02] text-[10px] text-zinc-600 font-mono font-bold tracking-wider">
            COMMERCE INTEGRATION GATEWAY
          </div>
        </div>

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
