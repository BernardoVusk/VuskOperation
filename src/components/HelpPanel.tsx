import React from "react";
import { HelpCircle, Check, Key, ShieldCheck, HeartPulse, Sparkles, BookOpen } from "lucide-react";

export function HelpPanel() {
  const steps = [
    {
      num: "01",
      title: "Crie sua conta gratuita no urlscan.io",
      desc: "Acesse o repositório em urlscan.io e conclua a criação do seu perfil. É um validador público de rotas de DNS para ad-techs, de uso integral e gratuito.",
      badge: "Passo Inicial"
    },
    {
      num: "02",
      title: "Gere seu Token de Autenticação",
      desc: "Navegue para Settings > API Keys no painel do urlscan. Crie uma chave descritiva com escopo público e copie o token seguro gerado pelo gateway.",
      badge: "Configuração"
    },
    {
      num: "03",
      title: "Insira a Chave de API na Varredura",
      desc: "Cole a credencial no espaço opcional do minerador. Clique em iniciar para engajar o robô sequencial e monitorar os cascades de ofertas em tempo real.",
      badge: "Execução"
    },
  ];

  const classifications = [
    {
      rank: "S",
      title: "Elite Máxima (Score ≥ 12)",
      desc: "Excelente robustez técnica e copy altamente persuasiva. Envolve criativos em VSL, múltiplos quizzes e scripts ativos de alto carregamento contra perdas.",
    },
    {
      rank: "A",
      title: "Conversão Excepcional (Score 8 - 11)",
      desc: "Funis estruturados com domínio próprio limpo, excelente engajamento mental recente, apontando para checkouts de autoridade líder (Kiwify ou Hotmart).",
    },
    {
      rank: "B",
      title: "Tração Estável (Score 5 - 7)",
      desc: "Sistemas de vendas diretas validados e landing pages diretas, excelentes para nichos bem qualificados sem dependência de quiz longo.",
    },
    {
      rank: "C",
      title: "Validação Inicial (Score ≤ 4)",
      desc: "Propostas padrão empregando modelos reutilizados comuns do ecossistema de afiliação ou páginas de suporte normais.",
    },
  ];

  const supportedPlatforms = [
    "Hotmart", "Kiwify", "Eduzz", "Monetizze", "Kirvano", "Cakto", "Greenn", "Lastlink", 
    "Braip", "Perfectpay", "Ticto", "Ampliopay", "GGCheckout", "Pepper", "ClickBank", 
    "Digistore24", "WarriorPlus", "JVZoo", "CartPanda", "Yampi", "Doppus", "KiwiPay"
  ];

  return (
    <div className="space-y-10 animate-fade-in mac-fade-in">
      {/* Overview Intro Banner Box */}
      <div className="mac-card rounded-mac-lg p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative subtle ambient soft glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="inline-flex items-center gap-2 text-[10px] text-primary font-bold tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,42,42,0.8)]"></span>
          Documentação & Heurística
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
          Guia do Usuário <span className="italic text-[#F5F5F7]/60 font-light">& Algoritmo de Inteligência</span>
        </h2>
        
        <p className="text-sm text-ink-secondary max-w-3xl leading-relaxed font-semibold">
          O <strong className="text-white font-semibold">Vusk Operation</strong> opera como um ad-finder heurístico não intrusivo. Ele monitora de forma sequencial scripts públicos de redirecionamento, registrando links que possuam código de afiliação ativo antes de expirarem ou serem pausados pelos anunciantes nas ad networks.
        </p>
      </div>

      {/* Steps Layout Grid */}
      <div>
        <div className="inline-flex items-center gap-2 text-[10px] text-ink-secondary font-bold tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-systemGreen shadow-[0_0_6px_#30D158]"></span>
          Fluxo de Trabalho de Três Etapas
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="mac-card rounded-mac-lg p-6 flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-3xl font-bold font-mono text-primary/10 group-hover:text-primary/20 transition-colors duration-300">
                    {s.num}
                  </span>
                  <span className="text-[9px] font-mono uppercase bg-surface-raised px-2.5 py-0.5 rounded-mac-sm border border-hairline text-ink-secondary font-semibold tracking-wider">
                    {s.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white tracking-wide mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-ink-secondary leading-relaxed font-semibold">
                  {s.desc}
                </p>
              </div>
              <div className="pt-6 flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-primary mt-4 border-t border-hairline">
                <Key className="w-3 h-3 text-primary" />
                <span>Procedimento Seguro</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring Heuristic Parameters Block */}
      <div className="mac-card rounded-mac-lg p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 text-[10px] text-ink-secondary font-bold tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#FF453A]"></span>
          Estrutura Heurística das Campanhas
        </div>
        
        <h3 className="text-xl font-bold text-white tracking-tight mb-2">
          Análise de Ranks <span className="italic text-ink-tertiary font-light">& Classificação de Tráfego</span>
        </h3>
        
        <p className="text-xs text-ink-secondary mb-8 max-w-2xl leading-relaxed">
          Cada correspondência minerada passa pela nossa validação de metadados integrada ao Gemini AI, estimando o potencial de conversão baseado em VSL, nicho e velocidade da página:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classifications.map((c, i) => (
            <div key={i} className="p-5 bg-surface-raised/40 border border-hairline rounded-mac-md flex items-start gap-4 hover:border-white/10 transition-colors duration-200">
              <div className="w-10 h-10 flex-shrink-0 font-mono font-bold text-xs border border-primary/25 bg-primary/5 text-primary rounded-mac-sm flex items-center justify-center shadow-[0_0_10px_rgba(255,42,42,0.1)]">
                [{c.rank}]
              </div>
              <div className="space-y-1 min-w-0">
                <span className="text-xs font-bold text-white uppercase tracking-wide block">
                  {c.title}
                </span>
                <p className="text-[11px] text-ink-secondary font-semibold leading-relaxed">
                  {c.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monitored Platforms catalog bottom section */}
      <div className="mac-card rounded-mac-lg p-6 sm:p-8 relative">
        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Fontes Monitoradas Ativamente ({supportedPlatforms.length})
        </h3>
        <p className="text-xs text-ink-secondary mb-6 leading-relaxed max-w-xl font-semibold">
          O algoritmo monitora em lote e sequencialmente as maiores ad networks mundiais, localizando checkouts das principais plataformas nacionais e internacionais:
        </p>

        <div className="flex flex-wrap gap-2">
          {supportedPlatforms.map((p, i) => (
            <span
              key={i}
              className="text-xs font-bold bg-surface-raised px-4 py-2 rounded-mac-lg border border-hairline text-ink-primary hover:border-primary/30 hover:text-white transition-all cursor-default select-none shadow-sm"
            >
              ✓ {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
