import React, { useState } from "react";
import { 
  Zap, Copy, Check, RotateCcw, Loader2, Sparkles, AlertCircle, Info, 
  ChevronDown, ChevronUp, LayoutTemplate, ListCollapse, Clipboard, 
  ArrowRight, Lock, Eye, HelpCircle, Layers, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types corresponding to server schemas
interface OrderBump {
  nome: string;
  proposta: string;
  preco: string;
  por_que_aceitar_agora: string;
}

interface Depoimento {
  nome: string;
  perfil: string;
  depoimento: string;
  resultado_especifico: string;
}

interface Gatilho {
  gatilho: string;
  consequencia: string;
  frase_de_copy: string;
}

interface SecaoObjeção {
  objecao: string;
  resposta: string;
  frase_de_virada: string;
}

interface PerguntaFAQ {
  pergunta: string;
  resposta: string;
}

interface EstruturaCopy {
  secao_hero: {
    pre_headline: string;
    headline_principal: string;
    subheadline: string;
    cta_primario: string;
    elemento_de_prova: string;
    nota_de_urgencia: string;
  };
  secao_identificacao: {
    titulo: string;
    paragrafos: string[];
    frases_de_espelho: string[];
  };
  secao_agitacao: {
    titulo: string;
    custo_da_inacao: string;
    gatilhos_especificos: Gatilho[];
    cenario_futuro_sombrio: string;
  };
  secao_mecanismo: {
    titulo: string;
    explicacao_das_falhas: string;
    introducao_mecanismo: string;
    mecanismo_unico: {
      nome: string;
      explicacao_leiga: string;
      por_que_funciona: string;
      diferencial: string;
    };
  };
  secao_produto: {
    titulo: string;
    descricao: string;
    o_que_voce_recebe: string[];
    para_quem_e: string[];
    para_quem_nao_e: string[];
  };
  secao_prova_social: {
    titulo: string;
    introducao: string;
    depoimentos_modelo: Depoimento[];
  };
  secao_oferta: {
    titulo: string;
    ancora_de_preco: string;
    preco_real: string;
    economia: string;
    justificativa_de_preco: string;
    o_que_esta_incluso: string[];
    order_bumps: OrderBump[];
    cta_principal: string;
    urgencia_real: string;
  };
  secao_garantia: {
    titulo: string;
    copy_garantia: string;
    duracao: string;
    frase_de_fechamento: string;
  };
  secao_objecoes: {
    titulo: string;
    objecoes: SecaoObjeção[];
  };
  secao_faq: {
    titulo: string;
    perguntas: PerguntaFAQ[];
  };
  secao_fechamento: {
    titulo: string;
    paragrafo_emocional: string;
    cta_final: string;
    ps: string;
  };
}

interface LandpageResult {
  produto: string;
  modo: "landpage";
  estrutura_copy: EstruturaCopy;
  prompt_para_ai_studio: string;
}

// Quiz structures
interface OpcaoQuiz {
  texto: string;
  valor: string;
  peso: number;
  gatilho_mapeado?: string;
}

interface PerfilQuiz {
  perfil: string;
  condicao: string;
  descricao: string;
  gatilho_principal: string;
  mensagem_personalizada: string;
}

interface ObjeçãoRapida {
  objecao: string;
  resposta: string;
}

interface EtapaQuiz {
  etapa: number;
  tipo: string;
  titulo: string;
  subtitulo: string;
  pergunta: string;
  tipo_resposta: string;
  opcoes: OpcaoQuiz[];
  logica: string;
  descricao?: string;
  perfis_possiveis?: PerfilQuiz[];
  copy_transicao?: string;
  revelacao_do_mecanismo?: string;
  frase_de_virada?: string;
  cta_para_etapa_14?: string;
  headline?: string;
  subheadline?: string;
  mecanismo_resumido?: string;
  o_que_voce_recebe?: string[];
  prova_social_rapida?: string;
  ancora_de_preco?: string;
  preco_real?: string;
  copy_garantia?: string;
  objecoes_rapidas?: ObjeçãoRapida[];
  urgencia_real?: string;
  cta_principal?: string;
  cta_secundario?: string;
  order_bumps?: OrderBump[];
}

interface QuizResult {
  produto: string;
  modo: "quiz";
  configuracao_geral: {
    titulo_do_quiz: string;
    subtitulo: string;
    tempo_estimado: string;
    cor_primaria_sugerida: string;
    tom_visual: string;
  };
  etapas: EtapaQuiz[];
  barra_de_progresso: {
    estilo: string;
    mostrar_numero_etapa: boolean;
    mostrar_percentual: boolean;
  };
  prompt_para_ai_studio: string;
}

export function FunnelBuilderPanel() {
  const [mode, setMode] = useState<"landpage" | "quiz" | null>(null);
  
  // Field States
  const [dossie, setDossie] = useState("");
  const [nome, setNome] = useState("");
  const [nicho, setNicho] = useState("emagrecimento");
  const [promessa, setPromessa] = useState("");
  const [problema, setProblema] = useState("");
  const [preco, setPreco] = useState("19,90");
  const [mecanismo, setMecanismo] = useState("");
  const [plataforma, setPlataforma] = useState("Kiwify");

  // Accordion collapsible suites
  const [showMaximization, setShowMaximization] = useState(false);
  const [showObjections, setShowObjections] = useState(false);

  // Accordion fields - Maximization
  const [bumpNome, setBumpNome] = useState("");
  const [bumpProposta, setBumpProposta] = useState("");
  const [bumpPreco, setBumpPreco] = useState("");
  const [bumpPorQue, setBumpPorQue] = useState("");
  const [upsellDesc, setUpsellDesc] = useState("");

  // Accordion fields - Objections
  const [obj1, setObj1] = useState("");
  const [obj2, setObj2] = useState("");
  const [obj3, setObj3] = useState("");
  const [obj4, setObj4] = useState("");

  // Lifecycle & Results
  const [status, setStatus] = useState<"idle" | "form" | "loading" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [landpageResult, setLandpageResult] = useState<LandpageResult | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Quick fill/Demo handler
  const handleLoadDemo = (type: "landpage" | "quiz") => {
    setMode(type);
    setNome(type === "landpage" ? "Fórmula Tríplice Seca" : "Diagnóstico do Vigor Masculino");
    setNicho(type === "landpage" ? "emagrecimento" : "saude_bem_estar");
    setPromessa(type === "landpage" ? "Liquidar gordura abdominal resistente sem dietas malucas" : "Descobrir o gatilho celular travador da sua energia diária");
    setProblema(type === "landpage" ? "Inchaço constante, fadiga pós-almoço e roupas apertadas" : "Sonolência inexplicável e indisposição para o treino");
    setPreco("29,90");
    setMecanismo(type === "landpage" ? "Ativador Metil-Celular de Chá Vermelho" : "Reset Químico de Cortisol Ativo");
    setPlataforma("Kiwify");
    setDossie(
      `PÚBLICO-ALVO DETALHADO:
- Mulheres e homens de 35 a 55 anos preocupados com fôlego, vitalidade e aparência de cansaço facial.
- Reclamam de dores no corpo e dizem antes de deitar: "Estou moído hoje, parece que fui atropelado".
- Querem resolver de forma prática sem medicamentos caros e burocracia de conselhos clínicos.`
    );
    
    // Fill optional fields
    setBumpNome("Sinergia Acelerada de Limão");
    setBumpProposta("Metabolizar resultados em até 2x mais rápido com gotas matinais");
    setBumpPreco("9,90");
    setBumpPorQue("Menos de 1 real por dia para poupar semanas de agonia celular");
    setUpsellDesc("Acesso vitalício à comunidade exclusiva de bio-hackers Vusk");
    
    setObj1("Não tenho tempo para ler coisas longas");
    setObj2("Tenho medo de ser mais uma pirâmide ou golpe na web");
    setObj3("Falta de disposição impede que eu ponha em prática");
    setObj4("Acho que o precinho de R$29,90 esconde taxas esquisitas");
    
    setStatus("form");
  };

  const handleModeSelection = (selectedMode: "landpage" | "quiz") => {
    setMode(selectedMode);
    setStatus("form");
  };

  const handleReset = () => {
    setMode(null);
    setStatus("idle");
    setDossie("");
    setNome("");
    setNicho("emagrecimento");
    setPromessa("");
    setProblema("");
    setPreco("19,90");
    setMecanismo("");
    setPlataforma("Kiwify");
    setBumpNome("");
    setBumpProposta("");
    setBumpPreco("");
    setBumpPorQue("");
    setUpsellDesc("");
    setObj1("");
    setObj2("");
    setObj3("");
    setObj4("");
    setLandpageResult(null);
    setQuizResult(null);
    setErrorText("");
    setCopiedSection(null);
    setCopiedPrompt(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !promessa.trim() || !nicho) {
      setErrorText("Nome do produto, nicho e promessa são preenchimentos mandatórios!");
      return;
    }

    setStatus("loading");
    setErrorText("");
    setCopiedPrompt(false);

    // Build lists
    const esteira = {
      order_bump: bumpNome ? {
        nome: bumpNome,
        proposta: bumpProposta,
        preco: bumpPreco,
        por_que_aceitar_agora: bumpPorQue
      } : null,
      upsell: upsellDesc ? {
        descricao: upsellDesc
      } : null
    };

    const objecoes = [obj1, obj2, obj3, obj4].filter(o => o.trim().length > 0);

    const payload = {
      dossie,
      nome,
      nicho,
      promessa,
      problema,
      preco,
      mecanismo,
      plataforma,
      esteira,
      objecoes
    };

    try {
      const endpoint = mode === "landpage" ? "/api/generate-landpage" : "/api/generate-quiz";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao consultar a engine de inteligência estrutural do Vusk Operation.");
      }

      if (mode === "landpage") {
        setLandpageResult(data.result);
        setQuizResult(null);
      } else {
        setQuizResult(data.result);
        setLandpageResult(null);
      }

      setStatus("success");
      
      // Auto-scroll to results top safely
      setTimeout(() => {
        const topOfResults = document.getElementById("funnel-result-header");
        if (topOfResults) {
          topOfResults.scrollIntoView({ behavior: "smooth" });
        }
      }, 200);

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Erro desconhecido de conexão com a API de geração.");
      setStatus("error");
    }
  };

  const handleCopySectionText = (sectionKey: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyPrompt = (promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  return (
    <div id="funnel-builder-container" className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4 animate-fade-in mac-fade-in">
      {/* HEADER SECTION POPPED IN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF453A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF453A]"></span>
            </span>
            <span className="text-[10px] font-bold font-mono text-ink-tertiary tracking-widest uppercase">
              CONVERSION DESIGN SUITE
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
            Criador de Funil V5
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5 max-w-2xl font-semibold leading-relaxed">
            Configure, modele e dê vazão a estruturas de altíssima conversão de Landing Pages persuasivas e Quizzes interativos em 14 etapas validados pela psicologia de tráfego frio.
          </p>
        </div>
      </div>

      {/* ERROR HANDLER GRACEFUL BOX */}
      {status === "error" && (
        <div className="bg-systemRed/10 border border-systemRed/25 rounded-mac-lg p-4 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-systemRed mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-systemRed uppercase font-mono tracking-wider">Erro na Conexão do Serviço</h4>
            <p className="text-xs text-ink-secondary mt-1 leading-relaxed font-semibold">{errorText}</p>
            <button 
              onClick={() => setStatus("form")}
              className="mt-3 text-[10px] font-bold font-mono uppercase tracking-wider bg-systemRed/20 text-white px-3 py-1.5 rounded-mac-sm hover:bg-systemRed/35 transition-all cursor-pointer border-none"
            >
              Voltar ao Formulário
            </button>
          </div>
        </div>
      )}

      {/* STATE IDLE: MODE SELECTOR SCREEN */}
      {status === "idle" && (
        <div className="space-y-8 animate-fade-in">
          <div className="text-center max-w-lg mx-auto py-4 select-none">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-zinc-200 uppercase font-mono tracking-widest">Escolha o Tipo de Funil Desejado</h3>
            <p className="text-xs text-ink-secondary mt-1 font-semibold">
              Selecione o formato de máquina de conversão para o qual você deseja estruturar o roteiro e o código no AI Studio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* LANDPAGE OPTION CARD */}
            <div 
              onClick={() => handleModeSelection("landpage")}
              className="group relative cursor-pointer overflow-hidden rounded-mac-lg border border-hairline bg-surface-base p-6 hover:border-primary/50 hover:bg-surface-raised transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-2 text-[8px] font-bold font-mono tracking-wider text-primary uppercase bg-primary/10 border-l border-b border-hairline rounded-bl-mac-sm select-none">
                MAIS POPULAR
              </div>
              
              <div className="w-12 h-12 rounded-mac-sm bg-surface-raised flex items-center justify-center text-primary border border-hairline mb-4 group-hover:scale-105 transition-all">
                <LayoutTemplate className="w-6 h-6" />
              </div>
              
              <h4 className="text-base font-bold text-white group-hover:text-primary transition-all font-sans">
                Landing Page Persuasiva
              </h4>
              <p className="text-xs text-ink-secondary mt-2 leading-relaxed font-semibold">
                Copy completa estruturada seção por seção focada no <strong>Custo da Inação Diária</strong>. Acompanha um prompt autossuficiente para gerar e codar a página HTML inteira responsiva no Google AI Studio.
              </p>

              <div className="flex items-center gap-2 mt-6 text-xs text-ink-secondary font-mono group-hover:text-white transition-all font-bold">
                Começar Configuração <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
              </div>
            </div>

            {/* QUIZ OPTION CARD */}
            <div 
              onClick={() => handleModeSelection("quiz")}
              className="group relative cursor-pointer overflow-hidden rounded-mac-lg border border-hairline bg-surface-base p-6 hover:border-primary/50 hover:bg-surface-raised transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-2 text-[8px] font-bold font-mono tracking-wider text-[#FF453A] uppercase bg-primary/10 border-l border-b border-hairline rounded-bl-mac-sm select-none">
                SUPER CONVERSÃO
              </div>
              
              <div className="w-12 h-12 rounded-mac-sm bg-surface-raised flex items-center justify-center text-primary border border-hairline mb-4 group-hover:scale-105 transition-all">
                <ListCollapse className="w-6 h-6" />
              </div>
              
              <h4 className="text-base font-bold text-white group-hover:text-primary transition-all font-sans">
                Quiz Interativo (14 Etapas)
              </h4>
              <p className="text-xs text-ink-secondary mt-2 leading-relaxed font-semibold">
                Roteiro completo de 14 etapas incluindo validação emocional, diagnóstico, micro-pitch e oferta. Acompanha prompt estratégico para codar o widget interativo mobile-first autossuficiente.
              </p>

              <div className="flex items-center gap-2 mt-6 text-xs text-ink-secondary font-mono group-hover:text-white transition-all font-bold">
                Começar Configuração <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>

          <div className="text-center py-4 border-t border-hairline max-w-sm mx-auto">
            <p className="text-[9px] font-mono uppercase tracking-widest text-ink-tertiary mb-2 font-bold select-none">Quer testar rápido?</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => handleLoadDemo("landpage")}
                className="text-xs bg-surface-raised hover:bg-[#1a1a1c] border border-hairline px-3.5 py-2 rounded-mac-sm text-zinc-300 hover:text-white transition-all cursor-pointer font-bold font-mono"
              >
                Demo: Landpage Detox
              </button>
              <button 
                onClick={() => handleLoadDemo("quiz")}
                className="text-xs bg-surface-raised hover:bg-[#1a1a1c] border border-hairline px-3.5 py-2 rounded-mac-sm text-zinc-300 hover:text-white transition-all cursor-pointer font-bold font-mono"
              >
                Demo: Quiz Vigor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE LOADING SCREEN */}
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-24 mac-card rounded-mac-lg min-h-[450px]">
          <div className="relative flex items-center justify-center mb-6 select-none">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            <Sparkles className="w-6 h-6 text-primary absolute animate-bounce" />
          </div>
          <h3 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-widest select-none">
            Estruturando Algoritmos de Venda
          </h3>
          <p className="text-xs text-ink-secondary mt-2 font-mono text-center max-w-md px-4 leading-relaxed font-semibold">
            Processando o briefing de "{nome}" via Gemini e construindo um funil calibrado no modelo {mode === "landpage" ? "Landing Page do Custo da Inação" : "Quiz de 14 Etapas"}...
          </p>
        </div>
      )}

      {/* STATE FORM: SETUP SCREEN */}
      {status === "form" && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* LEFT WIDGET COLUMN (BLOCO A: AUDIENCE DOSSIER) */}
          <div className="space-y-6 lg:col-span-1">
            <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-hairline pb-3 select-none">
                <LayoutTemplate className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Modo Escolhido: {mode === "landpage" ? "Landpage" : "Quiz"}
                </h3>
              </div>

              {/* BIO / AUDIENCE DOSSIER TEXTAREA */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between select-none">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Dossiê do Público-Alvo
                  </label>
                  <span className="text-[9px] font-mono text-ink-tertiary uppercase font-bold">Acolhimento IA</span>
                </div>
                <textarea
                  value={dossie}
                  onChange={(e) => setDossie(e.target.value)}
                  placeholder="Cole aqui o Dossiê Científico do Público-alvo gerado anteriormente na aba 'Audiente_dossier' para turbinar as falas internas e desejos secretos do comprador..."
                  className="w-full bg-surface-base border border-hairline rounded-mac-sm p-4 text-xs text-white placeholder:text-ink-tertiary focus:outline-none focus:border-primary/50 min-h-[220px] resize-none font-mono"
                />
                <p className="text-[9px] text-ink-tertiary font-mono leading-relaxed select-none font-bold">
                  * Caso não possua o dossiê em mãos, o gerador usará termos heurísticos de alta inteligência para o nicho escolhido.
                </p>
              </div>

              <div className="pt-3 border-t border-hairline flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[10px] font-mono font-bold text-ink-tertiary hover:text-white transition-all flex items-center gap-1.5 uppercase cursor-pointer bg-transparent border-none"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-primary" /> Modificar Canal
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT EDIT CONTAINER (BLOCO B: PRODUCT DATA) */}
          <div className="space-y-6 lg:col-span-2 text-left">
            
            {/* TECHNICAL FORM CARDS */}
            <div className="border border-hairline rounded-mac-lg bg-surface-base p-6 space-y-6">
              
              <div className="border-b border-hairline pb-4 select-none">
                <h3 className="text-sm font-bold text-white tracking-tight font-sans">Dados Técnicos do Info-Produto</h3>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed font-semibold">
                  Preencha os dados e gatilhos centrais abaixo para que os copies de transição façam conexões emocionais perfeitas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Produto Nome */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Método Detox Tríplice"
                    className="w-full bg-surface-base border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 font-sans"
                  />
                </div>

                {/* Nicho Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Nicho de Atuação
                  </label>
                  <select
                    value={nicho}
                    onChange={(e) => setNicho(e.target.value)}
                    className="w-full bg-surface-base border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 font-sans cursor-pointer"
                  >
                    <option value="emagrecimento" className="bg-surface-base text-white">Emagrecimento</option>
                    <option value="saude_bem_estar" className="bg-surface-base text-white">Saúde e Bem-Estar</option>
                    <option value="saude_masculina" className="bg-surface-base text-white">Saúde Masculina</option>
                    <option value="relacionamento" className="bg-surface-base text-white">Relacionamento</option>
                    <option value="renda_extra" className="bg-surface-base text-white">Renda Extra</option>
                    <option value="financas" className="bg-surface-base text-white">Finanças & Investimentos</option>
                    <option value="cripto" className="bg-surface-base text-white">Cripto & Web3</option>
                    <option value="beleza" className="bg-surface-base text-white">Beleza & Estética</option>
                    <option value="outros" className="bg-surface-base text-white">Outros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {/* Promessa Principal */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Promessa Principal de Conversão *
                  </label>
                  <input
                    type="text"
                    required
                    value={promessa}
                    onChange={(e) => setPromessa(e.target.value)}
                    placeholder="Ex: Secar 7kg em 3 semanas tomando 1 chá natural às 19h"
                    className="w-full bg-surface-base border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Problema Central */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Problema Central do Público
                  </label>
                  <input
                    type="text"
                    value={problema}
                    onChange={(e) => setProblema(e.target.value)}
                    placeholder="Ex: Sentir inchaço ao provar roupas e indisposição logo cedo"
                    className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 bg-surface-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Preço */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Preço Final de Venda (R$)
                  </label>
                  <input
                    type="text"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    placeholder="Ex: 19,90"
                    className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 bg-surface-base"
                  />
                </div>

                {/* Mecanismo Único */}
                <div className="space-y-2 md:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Mecanismo Único
                  </label>
                  <input
                    type="text"
                    value={mecanismo}
                    onChange={(e) => setMecanismo(e.target.value)}
                    placeholder="Ex: Protocolo de Ativação Celular"
                    className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 bg-surface-base"
                  />
                </div>

                {/* Plataforma de Venda */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Plataforma de Pagamento
                  </label>
                  <select
                    value={plataforma}
                    onChange={(e) => setPlataforma(e.target.value)}
                    className="w-full bg-surface-base border border-hairline rounded-mac-sm px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="Kiwify" className="bg-surface-base text-white">Kiwify</option>
                    <option value="Kirvano" className="bg-surface-base text-white">Kirvano</option>
                    <option value="PerfectPay" className="bg-surface-base text-white">PerfectPay</option>
                    <option value="Braip" className="bg-surface-base text-white">Braip</option>
                    <option value="Monetizze" className="bg-surface-base text-white">Monetizze</option>
                    <option value="Hotmart" className="bg-surface-base text-white">Hotmart</option>
                    <option value="Outra" className="bg-surface-base text-white">Outra Plataforma</option>
                  </select>
                </div>
              </div>

              {/* BLOCO C: MAXIMIZATION SUITE [OPTIONAL COLLAPSIBLE] */}
              <div className="border border-hairline rounded-mac-md bg-surface-raised overflow-hidden">
                <div 
                  onClick={() => setShowMaximization(!showMaximization)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-raised/85 transition-all select-none"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Suíte de Maximização (Order Bumps & Upsells)</h4>
                      <p className="text-[9px] text-ink-tertiary font-mono font-bold">OPCIONAL • Aumente o ticket médio do funil</p>
                    </div>
                  </div>
                  {showMaximization ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>

                <AnimatePresence>
                  {showMaximization && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-hairline p-4 space-y-4 bg-surface-base"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Nome do Order Bump</label>
                          <input 
                            type="text" 
                            value={bumpNome} 
                            onChange={(e) => setBumpNome(e.target.value)}
                            placeholder="Ex: Manual de Atalhos Rápidos" 
                            className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Preço Bump (R$)</label>
                          <input 
                            type="text" 
                            value={bumpPreco} 
                            onChange={(e) => setBumpPreco(e.target.value)}
                            placeholder="Ex: 9,90" 
                            className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Proposta de Valor do Bump</label>
                        <input 
                          type="text" 
                          value={bumpProposta} 
                          onChange={(e) => setBumpProposta(e.target.value)}
                          placeholder="Ex: Ative os resultados em dobro adicionando o checklist à compra" 
                          className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Por que aceitar agora?</label>
                        <input 
                          type="text" 
                          value={bumpPorQue} 
                          onChange={(e) => setBumpPorQue(e.target.value)}
                          placeholder="Ex: Menos de R$ 1 real por dia para poupar semanas de esforço doentio" 
                          className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                        />
                      </div>
                      <div className="space-y-1.5 pt-2 border-t border-hairline">
                        <label className="text-[9px] font-bold uppercase text-[#FF453A] tracking-wider font-mono font-bold">Oferta Back-End de Upsell/Downsell</label>
                        <textarea 
                          value={upsellDesc} 
                          onChange={(e) => setUpsellDesc(e.target.value)}
                          placeholder="Ex: Área de membros VIP Vitalícia ou um segundo frasco com 50% de desconto no fluxo do cartão..." 
                          className="w-full bg-surface-base border border-hairline rounded-mac-sm p-3 text-xs text-white placeholder:text-ink-tertiary min-h-[60px] resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* BLOCO D: MAIN OBJECTIONS [OPTIONAL COLLAPSIBLE] */}
              <div className="border border-hairline rounded-mac-md bg-surface-raised overflow-hidden">
                <div 
                  onClick={() => setShowObjections(!showObjections)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-raised/85 transition-all select-none"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">Suite de Quebra de Objeções</h4>
                      <p className="text-[10px] text-zinc-500 font-mono font-bold">OPCIONAL • Customize as viradas de argumento</p>
                    </div>
                  </div>
                  {showObjections ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </div>

                <AnimatePresence>
                  {showObjections && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-hairline p-4 space-y-4 bg-surface-base"
                    >
                      <p className="text-[10px] text-ink-secondary leading-normal font-semibold">
                        Insira as 4 maiores objeções do público-alvo para forçar a inteligência artificial a respondê-las sistematicamente na página de vendas e nos scripts de Quiz.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Objeção 1</label>
                          <input 
                            type="text" 
                            value={obj1} 
                            onChange={(e) => setObj1(e.target.value)}
                            placeholder="Ex: Não tenho tempo de ler ou fazer" 
                            className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Objeção 2</label>
                          <input 
                            type="text" 
                            value={obj2} 
                            onChange={(e) => setObj2(e.target.value)}
                            placeholder="Ex: Tenho receio de que seja golpe ou vírus" 
                            className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Objeção 3</label>
                          <input 
                            type="text" 
                            value={obj3} 
                            onChange={(e) => setObj3(e.target.value)}
                            placeholder="Ex: Eu já tentei de tudo e nada serviu" 
                            className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">Objeção 4</label>
                          <input 
                            type="text" 
                            value={obj4} 
                            onChange={(e) => setObj4(e.target.value)}
                            placeholder="Ex: É barato demais para ser verdade" 
                            className="w-full bg-[#141416] border border-hairline rounded-mac-sm px-3 py-2 text-xs text-white bg-surface-base"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ACTION SUBMIT BUTTON ROW */}
              <div className="pt-2 border-t border-hairline flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
                <span className="text-[10px] text-ink-tertiary font-mono uppercase tracking-wider font-bold">
                  Engine: Gemini-3.5-flash
                </span>
                <button
                  type="submit"
                  className="bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-mac-sm flex items-center justify-center gap-2 hover:bg-red-650 transition-all font-mono tracking-wider shadow-[0_0_15px_rgba(255,69,58,0.35)] select-none uppercase cursor-pointer border-none"
                >
                  <Zap className="w-4 h-4 text-white" />
                  Gerar {mode === "landpage" ? "Landpage de Conversão" : "Roteiro Quiz 14 Etapas"}
                </button>
              </div>

            </div>
          </div>
        </form>
      )}

      {/* STATE SUCCESS: DISPLAY RESULTS CONTAINER */}
      {status === "success" && (
        <div className="space-y-8 animate-fade-in text-left" id="funnel-result-wrapper">
          
          {/* HEADER BACK BUTTON AND REBUILD TRIGGER */}
          <div id="funnel-result-header" className="border border-hairline bg-surface-raised p-5 rounded-mac-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-mac-sm bg-surface-base border border-hairline flex items-center justify-center text-primary">
                {mode === "landpage" ? <LayoutTemplate className="w-5 h-5" /> : <ListCollapse className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white font-sans">{nome}</h3>
                  <span className="bg-primary/10 border border-primary/25 text-primary text-[9px] font-bold px-2 py-0.5 rounded-mac-sm uppercase font-mono select-none">
                    {mode === "landpage" ? "Landpage" : "Quiz 14 Etapas"}
                  </span>
                </div>
                <p className="text-[10px] text-ink-tertiary mt-0.5 leading-tight font-mono uppercase tracking-widest font-bold">
                  Copy Estruturado & Configurado com Sucesso
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="text-xs bg-surface-base hover:bg-surface-raised border border-hairline px-4 py-2 text-zinc-300 hover:text-white rounded-mac-sm flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5 text-primary" /> Fazer Novo Funil
            </button>
          </div>

          {/* LANDPAGE RESULTS DISPLAY SECTIONS */}
          {mode === "landpage" && landpageResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* PRIMARY ARCHITECTURE COPY COLUMN */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <h3 className="text-[10px] font-bold font-mono tracking-widest uppercase text-ink-tertiary">
                    SEÇÕES DIAGRAMADAS DA LANDING PAGE
                  </h3>
                </div>

                {/* HERO BLOCK */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-start border-b border-hairline pb-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-primary uppercase tracking-widest">SEÇÃO 1</span>
                      <h4 className="text-xs font-bold text-white uppercase font-sans mt-0.5">Hero Section (Acima da Dobra)</h4>
                    </div>
                    <button
                      onClick={() => handleCopySectionText("hero", `[SEÇÃO HERO]\nPre-Headline: ${landpageResult.estrutura_copy.secao_hero.pre_headline}\nHeadline: ${landpageResult.estrutura_copy.secao_hero.headline_principal}\nSubheadline: ${landpageResult.estrutura_copy.secao_hero.subheadline}\nCTA: ${landpageResult.estrutura_copy.secao_hero.cta_primario}\nUrgência: ${landpageResult.estrutura_copy.secao_hero.nota_de_urgencia}`)}
                      className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                    >
                      {copiedSection === "hero" ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSection === "hero" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-2 mt-2 text-xs">
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">PRÉ-HEADLINE</span>
                      <span className="text-[#ededef] italic font-mono font-bold text-[10.5px]">{landpageResult.estrutura_copy.secao_hero.pre_headline}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">HEADLINE PRINCIPAL</span>
                      <p className="text-sm font-bold text-white tracking-tight leading-relaxed">{landpageResult.estrutura_copy.secao_hero.headline_principal}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">SUBHEADLINE</span>
                      <p className="text-ink-secondary leading-relaxed text-xs font-semibold">{landpageResult.estrutura_copy.secao_hero.subheadline}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2 border-t border-hairline">
                      <div>
                        <span className="text-[9px] font-mono text-ink-tertiary block font-bold">CTA PRINCIPAL</span>
                        <span className="bg-primary/10 border border-primary/25 text-primary text-[9px] font-bold px-2 py-0.5 rounded font-mono select-none uppercase">
                          {landpageResult.estrutura_copy.secao_hero.cta_primario}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-ink-tertiary block font-bold">ELEMENTO DE PROVA</span>
                        <span className="text-ink-secondary text-[11px] font-semibold">{landpageResult.estrutura_copy.secao_hero.elemento_de_prova}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* IDENTIFICAÇÃO BLOCK */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3 relative">
                  <div className="flex justify-between items-start border-b border-hairline pb-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-primary uppercase tracking-widest">SEÇÃO 2</span>
                      <h4 className="text-xs font-bold text-white uppercase font-sans mt-0.5">Identificação e Voz Empática</h4>
                    </div>
                    <button
                      onClick={() => handleCopySectionText("identia", `[SEÇÃO IDENTIFICAÇÃO]\nTítulo: ${landpageResult.estrutura_copy.secao_identificacao.titulo}\nParágrafos:\n${landpageResult.estrutura_copy.secao_identificacao.paragrafos.join("\n")}`)}
                      className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                    >
                      {copiedSection === "identia" ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSection === "identia" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">TÍTULO CONEXÃO</span>
                      <h5 className="text-zinc-150 font-bold font-sans mt-0.5">{landpageResult.estrutura_copy.secao_identificacao.titulo}</h5>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">PARÁGRAFOS EMBASADOS DOS DESEJOS</span>
                      {landpageResult.estrutura_copy.secao_identificacao.paragrafos.map((p, idx) => (
                        <p key={idx} className="text-ink-secondary leading-relaxed font-semibold">{p}</p>
                      ))}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">FRASES ESPELHO (VOZ INTERNA)</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {landpageResult.estrutura_copy.secao_identificacao.frases_de_espelho.map((f, idx) => (
                          <div key={idx} className="bg-surface-raised border border-hairline rounded-mac-sm px-3 py-2 text-zinc-200 italic font-mono text-[9px] font-bold">
                            "{f}"
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AGITAÇÃO BLOCK */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3 relative">
                  <div className="flex justify-between items-start border-b border-hairline pb-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-primary uppercase tracking-widest">SEÇÃO 3</span>
                      <h4 className="text-xs font-bold text-white uppercase font-sans mt-0.5">Agitação & Custo da Inação</h4>
                    </div>
                    <button
                      onClick={() => handleCopySectionText("agita", `[SEÇÃO AGITAÇÃO]\nTítulo: ${landpageResult.estrutura_copy.secao_agitacao.titulo}\nCusto de não agir: ${landpageResult.estrutura_copy.secao_agitacao.custo_da_inacao}\nFuturo sombrio: ${landpageResult.estrutura_copy.secao_agitacao.cenario_futuro_sombrio}`)}
                      className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                    >
                      {copiedSection === "agita" ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSection === "agita" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">CONCEITO PERSUASIVO</span>
                      <p className="text-zinc-100 font-bold font-sans">{landpageResult.estrutura_copy.secao_agitacao.titulo}</p>
                    </div>
                    <div className="bg-systemRed/5 border border-systemRed/15 rounded-mac-sm p-3 text-zinc-300 leading-relaxed font-semibold">
                      <span className="text-[9px] font-mono text-systemRed block font-bold mb-1">CUSTO DA INAÇÃO DIÁRIA</span>
                      {landpageResult.estrutura_copy.secao_agitacao.custo_da_inacao}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">GATILHOS EMOCIONAIS DETALHADOS</span>
                      <div className="grid grid-cols-1 gap-2 mt-1">
                        {landpageResult.estrutura_copy.secao_agitacao.gatilhos_especificos.map((gat, idx) => (
                          <div key={idx} className="border border-hairline bg-surface-raised rounded-mac-sm p-3 space-y-1">
                            <span className="text-white font-bold text-xs block font-sans">{gat.gatilho}</span>
                            <p className="text-ink-secondary text-[11px] font-semibold font-sans">{gat.consequencia}</p>
                            <p className="text-primary italic font-mono text-[9px] pt-1 font-bold">"{gat.frase_de_copy}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-hairline">
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">CENÁRIO FUTURO SE NADA MUDAR</span>
                      <p className="text-ink-secondary italic text-xs leading-relaxed font-semibold">{landpageResult.estrutura_copy.secao_agitacao.cenario_futuro_sombrio}</p>
                    </div>
                  </div>
                </div>

                {/* MECANISMO ÚNICO BLOCK */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3 relative">
                  <div className="flex justify-between items-start border-b border-hairline pb-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-primary uppercase tracking-widest">SEÇÃO 4</span>
                      <h4 className="text-xs font-bold text-white uppercase font-sans mt-0.5">Mecanismo Único de Cura</h4>
                    </div>
                    <button
                      onClick={() => handleCopySectionText("mecanismo", `[SEÇÃO MECANISMO]\nTítulo: ${landpageResult.estrutura_copy.secao_mecanismo.titulo}\nFalhas concorrentes: ${landpageResult.estrutura_copy.secao_mecanismo.explicacao_das_falhas}\nMecanismo: ${landpageResult.estrutura_copy.secao_mecanismo.mecanismo_unico.nome}\nPor que funciona: ${landpageResult.estrutura_copy.secao_mecanismo.mecanismo_unico.por_que_funciona}`)}
                      className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                    >
                      {copiedSection === "mecanismo" ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSection === "mecanismo" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[9px] font-mono text-ink-tertiary block font-bold">EXPLICANDO O ERRO DOS OUTROS</span>
                      <p className="text-ink-secondary leading-relaxed bg-surface-raised border border-hairline rounded-mac-sm p-3 font-semibold">{landpageResult.estrutura_copy.secao_mecanismo.explicacao_das_falhas}</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/15 rounded-mac-lg p-4 space-y-2 mt-2">
                      <span className="text-[9px] font-mono text-primary uppercase tracking-widest font-bold">A SOLUÇÃO: {landpageResult.estrutura_copy.secao_mecanismo.mecanismo_unico.nome}</span>
                      <p className="text-[#F5F5F7]/90 text-xs font-semibold leading-relaxed">{landpageResult.estrutura_copy.secao_mecanismo.mecanismo_unico.explicacao_leiga}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[10px] border-t border-hairline">
                        <div>
                          <span className="text-ink-secondary block font-bold">Por que responde rápido?</span>
                          <p className="text-ink-tertiary mt-0.5 leading-normal font-semibold">{landpageResult.estrutura_copy.secao_mecanismo.mecanismo_unico.por_que_funciona}</p>
                        </div>
                        <div>
                          <span className="text-zinc-400 block font-bold">Diferencial exclusivo:</span>
                          <p className="text-ink-tertiary mt-0.5 leading-normal font-semibold">{landpageResult.estrutura_copy.secao_mecanismo.mecanismo_unico.diferencial}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OFERTA & COMPLEMENTOS */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3 relative">
                  <div className="flex justify-between items-start border-b border-hairline pb-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-primary uppercase tracking-widest">SEÇÃO 5</span>
                      <h4 className="text-xs font-bold text-white uppercase font-sans mt-0.5">A Oferta e Suite Irresistível</h4>
                    </div>
                    <button
                      onClick={() => handleCopySectionText("oferta", `[SEÇÃO OFERTA]\nDe: ${landpageResult.estrutura_copy.secao_oferta.ancora_de_preco} por: ${landpageResult.estrutura_copy.secao_oferta.preco_real}\nJustificativa: ${landpageResult.estrutura_copy.secao_oferta.justificativa_de_preco}\nCTA: ${landpageResult.estrutura_copy.secao_oferta.cta_principal}`)}
                      className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                    >
                      {copiedSection === "oferta" ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSection === "oferta" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center bg-surface-raised p-3 rounded-mac-sm border border-hairline">
                      <div>
                        <span className="text-[9px] font-mono text-ink-tertiary block font-bold">VALOR ÂNCORA</span>
                        <span className="text-ink-tertiary line-through font-bold text-xs">{landpageResult.estrutura_copy.secao_oferta.ancora_de_preco}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-primary font-bold block uppercase">PREÇO HOJE PROMO</span>
                        <span className="text-white text-base font-extrabold font-mono">{landpageResult.estrutura_copy.secao_oferta.preco_real}</span>
                      </div>
                    </div>
                    <p className="text-ink-secondary leading-normal text-[11px] italic bg-surface-raised/40 p-2.5 rounded-mac-sm border border-hairline font-semibold">
                      {landpageResult.estrutura_copy.secao_oferta.justificativa_de_preco}
                    </p>

                    {/* Order Bumps se existirem */}
                    {landpageResult.estrutura_copy.secao_oferta.order_bumps && landpageResult.estrutura_copy.secao_oferta.order_bumps.length > 0 && (
                      <div className="border border-dashed border-primary/30 rounded-mac-lg p-4 bg-primary/5 space-y-2">
                        <span className="text-primary font-bold text-[9px] font-mono block uppercase">ORDER BUMP INTEGRADO</span>
                        {landpageResult.estrutura_copy.secao_oferta.order_bumps.map((b, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[#ededef] font-bold text-xs font-sans">{b.nome}</span>
                              <span className="text-white font-bold bg-primary px-2 py-0.5 rounded-mac-sm text-[9px] font-mono">{b.preco}</span>
                            </div>
                            <p className="text-ink-secondary text-[11px] font-semibold">{b.proposta}</p>
                            <span className="text-ink-tertiary italic text-[9px] block font-bold">Motivo: {b.por_que_aceitar_agora}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* GARANTIA BLOCK */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-2 relative">
                  <div className="flex justify-between items-start border-b border-hairline pb-2">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-primary uppercase tracking-widest">SEÇÃO 6</span>
                      <h4 className="text-xs font-bold text-white uppercase font-sans mt-0.5">Garantia Blindada Incondicional</h4>
                    </div>
                    <button
                      onClick={() => handleCopySectionText("garantia", `[SEÇÃO GARANTIA]\nTítulo: ${landpageResult.estrutura_copy.secao_garantia.titulo}\nDuração: ${landpageResult.estrutura_copy.secao_garantia.duracao}\nCopy:\n${landpageResult.estrutura_copy.secao_garantia.copy_garantia}`)}
                      className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                    >
                      {copiedSection === "garantia" ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSection === "garantia" ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-mono text-primary font-bold uppercase">{landpageResult.estrutura_copy.secao_garantia.duracao}</span>
                    <p className="text-zinc-300 leading-relaxed font-sans font-semibold">{landpageResult.estrutura_copy.secao_garantia.copy_garantia}</p>
                    <span className="text-ink-tertiary text-[10px] italic block pt-1 font-bold">"{landpageResult.estrutura_copy.secao_garantia.frase_de_fechamento}"</span>
                  </div>
                </div>

              </div>

              {/* CODES & PROMPT RIGHT DISPLAY COLUMN */}
              <div className="lg:col-span-1 space-y-6">
                <div className="flex items-center gap-2 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  <h3 className="text-[10px] font-bold font-mono tracking-widest uppercase text-ink-tertiary">
                    DIRETRIZES DE CÓDIGO DO AI STUDIO
                  </h3>
                </div>

                {/* AI STUDIO READY PROMPT CARD */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-4">
                  <div className="border-b border-hairline pb-2 select-none">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500 animate-spin" />
                      <h4 className="text-xs font-bold text-white uppercase font-sans">Prompt Autossuficiente</h4>
                    </div>
                    <p className="text-[10px] text-ink-secondary mt-1 leading-normal font-semibold">
                      Este bloco de texto contém todas as diretrizes funcionais e visuais estruturadas do seu produto cadastradas para que o robô do <strong>Live Server do AI Studio</strong> programe tudo em 1 único clique.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      readOnly
                      value={landpageResult.prompt_para_ai_studio}
                      className="w-full bg-[#0a0a0c] border border-hairline rounded-mac-sm p-3 text-[9px] font-mono text-zinc-400 focus:outline-none min-h-[280px] h-[340px] resize-none"
                    />
                    
                    <button
                      onClick={() => handleCopyPrompt(landpageResult.prompt_para_ai_studio)}
                      className="w-full bg-[#FF453A] text-white text-xs font-bold py-3.5 rounded-mac-sm flex items-center justify-center gap-2 hover:bg-red-650 transition-all font-mono tracking-wider shadow-[0_0_15px_rgba(255,69,58,0.35)] select-none uppercase cursor-pointer border-none"
                    >
                      {copiedPrompt ? <CheckCircle className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      {copiedPrompt ? "Copiado para Área!" : "Copiar Prompt e Ir para o AI Studio"}
                    </button>
                    <p className="text-[9px] text-ink-tertiary font-mono leading-relaxed text-center font-bold">
                      Insira esse prompt para criar a landing page de forma nativa e mobile-first instantaneamente.
                    </p>
                  </div>
                </div>

                {/* FAQ INDEX CARD */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase font-sans border-b border-hairline pb-1">FAQ & Objeções</h4>
                  <div className="space-y-3">
                    {landpageResult.estrutura_copy.secao_faq.perguntas.slice(0, 2).map((f, idx) => (
                      <div key={idx} className="space-y-1 text-xs">
                        <span className="text-zinc-200 font-bold block">Q: {f.pergunta}</span>
                        <p className="text-ink-secondary text-[10px] font-semibold">{f.resposta}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* QUIZ RESULTS DISPLAY SECTIONS */}
          {mode === "quiz" && quizResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* PRIMARY ARCHITECTURE QUIZ COLUMN */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  <h3 className="text-[10px] font-bold font-mono tracking-widest uppercase text-ink-tertiary">
                    ETAPAS RASTREADAS DO QUIZ CORRIDO
                  </h3>
                </div>

                {/* STEPS LOOP */}
                <div className="space-y-4">
                  {quizResult.etapas.map((etp) => (
                    <div key={etp.etapa} className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3">
                      
                      {/* STEP HEADER */}
                      <div className="flex justify-between items-start border-b border-hairline pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-primary/10 border border-primary/25 text-primary text-[9px] font-bold px-2 py-0.5 rounded-mac-sm font-mono select-none">
                              FASE {etp.etapa} / 14
                            </span>
                            <span className="text-ink-tertiary font-mono text-[9px] tracking-wider uppercase font-bold">
                              TIPO: {etp.tipo.toUpperCase()}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white font-sans mt-1">
                            {etp.titulo}
                          </h4>
                          <span className="text-ink-secondary text-[10px] block mt-0.5 font-bold">{etp.subtitulo}</span>
                        </div>
                        
                        <button
                          onClick={() => handleCopySectionText(`etp-${etp.etapa}`, `[ETAPA ${etp.etapa}]\nPergunta: ${etp.pergunta}\nOpções:\n${etp.opcoes?.map(o => `${o.texto} (Valor: ${o.valor}, peso: ${o.peso})`).join("\n") || ""}\nLógica: ${etp.logica}`)}
                          className="text-[9px] font-mono text-ink-secondary hover:text-white transition-all flex items-center gap-1 border border-hairline bg-surface-raised px-2 py-1 rounded-mac-sm cursor-pointer font-bold"
                        >
                          {copiedSection === `etp-${etp.etapa}` ? <Check className="w-3.5 h-3.5 text-systemGreen" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedSection === `etp-${etp.etapa}` ? "Copiado!" : "Copiar"}
                        </button>
                      </div>

                      {/* STEP BODY */}
                      <div className="space-y-3 mt-2 text-xs">
                        
                        {/* THE QUESTION */}
                        <div className="bg-surface-raised p-3 rounded-mac-sm border border-hairline">
                          <span className="text-[9px] font-mono text-ink-tertiary block font-bold">QUESTIONAMENTO DIRECIONADO</span>
                          <p className="text-white font-bold leading-relaxed font-sans">{etp.pergunta}</p>
                        </div>

                        {/* DESCRICAO se houver */}
                        {etp.descricao && (
                          <div className="text-[11px] text-[#ededef]/85 border-l border-primary pl-3 py-1 font-bold italic font-sans">
                            {etp.descricao}
                          </div>
                        )}

                        {/* OPCOES SE HOUVER */}
                        {etp.opcoes && etp.opcoes.length > 0 && (
                          <div>
                            <span className="text-[9px] font-mono text-ink-tertiary block font-bold">ALTERNATIVAS DE REAÇÃO</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {etp.opcoes.map((o, idx) => (
                                <div key={idx} className="border border-hairline bg-surface-base rounded-mac-sm px-3 py-2.5 flex items-center justify-between">
                                  <div>
                                    <span className="text-zinc-200 block text-[11px] leading-tight font-semibold font-sans">{o.texto}</span>
                                    {o.gatilho_mapeado && <span className="text-[8px] text-primary font-mono block mt-0.5 font-bold">Gatilho: {o.gatilho_mapeado}</span>}
                                  </div>
                                  <span className="text-ink-tertiary text-[10px] font-mono font-bold">+{o.peso} pts</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* EXCLUSIVO ETAPA 12: DIAGNÓSTICO */}
                        {etp.perfis_possiveis && (
                          <div className="space-y-3">
                            <span className="text-[9px] font-mono text-primary font-bold block uppercase tracking-widest">ALGORITMO DE SELEÇÃO DE PERFIL</span>
                            <div className="grid grid-cols-1 gap-3">
                              {etp.perfis_possiveis.map((p, idx) => (
                                <div key={idx} className="border border-hairline bg-surface-raised rounded-mac-lg p-3 space-y-1.5">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <span className="text-white font-bold font-sans text-xs">{p.perfil}</span>
                                    <span className="text-primary font-mono text-[9px] font-bold uppercase">{p.condicao}</span>
                                  </div>
                                  <p className="text-ink-secondary text-[10px] leading-relaxed font-semibold">{p.descricao}</p>
                                  <p className="text-ink-secondary text-[10px] font-semibold"><strong className="text-zinc-200 font-sans">Gatilho Oculto:</strong> {p.gatilho_principal}</p>
                                  <span className="text-systemGreen bg-systemGreen/5 border border-systemGreen/25 text-[9px] font-mono px-2 py-0.5 rounded italic inline-block mt-1 font-bold">"{p.mensagem_personalizada}"</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* EXCLUSIVO ETAPA 13: MICROPITCH */}
                        {etp.copy_transicao && (
                          <div className="bg-primary/5 border border-primary/15 p-3 rounded-mac-sm space-y-2 mt-2">
                            <span className="text-[9px] font-mono text-primary font-bold block uppercase">REBOTE PSICOLÓGICO</span>
                            <p className="text-[#ededef]/85 leading-relaxed font-semibold">{etp.copy_transicao}</p>
                            <p className="text-zinc-300 font-bold border-t border-hairline pt-2 font-mono text-[10px]">Mecanismo Aberto: {etp.revelacao_do_mecanismo}</p>
                          </div>
                        )}

                        {/* EXCLUSIVO ETAPA 14: PITCH FINAL DETALHADO */}
                        {etp.headline && (
                          <div className="bg-primary/5 border border-primary/15 rounded-mac-lg p-4 space-y-3 mt-2">
                            <span className="bg-primary text-white font-bold text-[9px] font-mono px-2 py-0.5 rounded select-none inline-block">MÁQUINA DE OFERTA DA ESTRUTURA</span>
                            <h4 className="text-white font-bold tracking-tight mt-1 font-sans">{etp.headline}</h4>
                            <p className="text-ink-secondary text-xs font-semibold">{etp.subheadline}</p>
                            
                            <div className="border-t border-hairline pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                              <div>
                                <span className="text-ink-secondary block font-bold">O que receberá:</span>
                                <div className="space-y-1 mt-1">
                                  {etp.o_que_voce_recebe?.map((itm, i) => (
                                    <span key={i} className="block text-zinc-300 font-mono font-bold">• {itm}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="text-ink-secondary block font-bold">Provas & Garantias:</span>
                                <p className="text-ink-secondary leading-normal mt-1 font-semibold">{etp.prova_social_rapida}</p>
                                <p className="text-primary mt-1 font-bold">{etp.copy_garantia}</p>
                              </div>
                            </div>

                            <div className="border-t border-hairline pt-3 flex flex-wrap justify-between items-center bg-surface-base p-2 rounded-mac-sm text-[10px]">
                              <div>
                                <span className="line-through text-ink-tertiary block font-bold">De R$ 97,00</span>
                                <span className="text-white font-bold text-xs font-mono">Por R$ {preco || "19,90"}</span>
                              </div>
                              <span className="text-ink-secondary italic font-semibold">CTA: {etp.cta_principal}</span>
                            </div>
                          </div>
                        )}

                        {/* BOT LOGIC INDICATORS */}
                        <div className="bg-surface-raised p-2.5 rounded-mac-sm border border-hairline flex gap-2">
                          <Eye className="w-3.5 h-3.5 text-ink-tertiary mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[8px] font-mono text-ink-tertiary block uppercase font-bold">LÓGICA DA ETAPA</span>
                            <p className="text-[10px] text-ink-secondary leading-tight italic font-semibold font-sans">{etp.logica}</p>
                          </div>
                        </div>

                      </div>

                    </div>
                  ))}
                </div>

              </div>

              {/* CODES & PROMPT RIGHT DISPLAY COLUMN */}
              <div className="lg:col-span-1 space-y-6">
                <div className="flex items-center gap-2 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  <h3 className="text-[10px] font-bold font-mono tracking-widest uppercase text-zinc-400">
                    DIRETRIZES DE CÓDIGO DO AI STUDIO
                  </h3>
                </div>

                {/* AI STUDIO READY PROMPT CARD */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-4">
                  <div className="border-b border-hairline pb-2 select-none">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500 animate-spin" />
                      <h4 className="text-xs font-bold text-white uppercase font-sans">Prompt Autossuficiente</h4>
                    </div>
                    <p className="text-[10px] text-ink-secondary mt-1 leading-normal font-semibold">
                      Este bloco de texto contém todas as diretrizes interativas de transições, mapeamento de pontuações, diagnósticos e mini landing pages roteirizados para que o robô do <strong>AI Studio</strong> codifique o widget completo sem travar.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      readOnly
                      value={quizResult.prompt_para_ai_studio}
                      className="w-full bg-[#0a0a0c] border border-hairline rounded-mac-sm p-3 text-[9px] font-mono text-zinc-400 focus:outline-none min-h-[280px] h-[340px] resize-none"
                    />
                    
                    <button
                      onClick={() => handleCopyPrompt(quizResult.prompt_para_ai_studio)}
                      className="w-full bg-[#FF453A] text-white text-xs font-bold py-3.5 rounded-mac-sm flex items-center justify-center gap-2 hover:bg-red-650 transition-all font-mono tracking-wider shadow-[0_0_15px_rgba(255,69,58,0.35)] select-none uppercase cursor-pointer border-none"
                    >
                      {copiedPrompt ? <CheckCircle className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      {copiedPrompt ? "Copiado para Área!" : "Copiar Prompt e Ir para o AI Studio"}
                    </button>
                    <p className="text-[9px] text-ink-tertiary font-mono leading-relaxed text-center font-bold">
                      Insira esse prompt para criar o quiz responsivo interativo de forma autocontida e imediata.
                    </p>
                  </div>
                </div>

                {/* GENERAL GLOBAL CONFIG CARD */}
                <div className="border border-hairline rounded-mac-lg bg-surface-base p-5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase font-sans border-b border-hairline pb-1 select-none">Diretivas Gerais</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-ink-tertiary text-[9px] block uppercase font-mono font-bold">Título Geral do Quiz:</span>
                      <span className="text-[#ededef]/95 font-bold block font-sans">{quizResult.configuracao_geral.titulo_do_quiz}</span>
                    </div>
                    <div>
                      <span className="text-ink-tertiary text-[9px] block uppercase font-mono font-bold">Duração Estimada:</span>
                      <span className="text-zinc-300 block font-sans font-semibold">{quizResult.configuracao_geral.tempo_estimado}</span>
                    </div>
                    <div>
                      <span className="text-ink-tertiary text-[9px] block uppercase font-mono font-bold">Estética Visual Recomendada:</span>
                      <span className="text-ink-secondary block tracking-tight text-[10.5px] font-semibold">{quizResult.configuracao_geral.tom_visual}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
