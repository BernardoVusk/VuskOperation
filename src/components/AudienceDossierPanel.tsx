import React, { useState } from "react";
import { 
  Users, Copy, Check, RotateCcw, Loader2, Sparkles, AlertCircle, Info, 
  ChevronRight, Package, Eye, ShieldAlert, HeartCrack, HelpCircle, 
  MessageSquareCode, Compass, DollarSign, Calendar, Landmark, MapPin, 
  Briefcase, Heart, Skull, Milestone, CheckCircle2, AlertTriangle, Zap,
  XCircle, CopyCheck
} from "lucide-react";

interface GatilhoEspecifico {
  nome: string;
  descricao: string;
  angulo_de_copy: string;
}

interface AttemptItem {
  tentativa: string;
  quanto_gastou: string;
  por_que_falhou: string;
  crenca_formada: string;
}

interface CultureItem {
  elemento: string;
  por_que_funciona?: string;
  por_que_repele?: string;
  como_usar?: string;
  alternativa?: string;
}

interface DossierData {
  produto: string;
  nicho: string;
  definicao_clinica: {
    titulo: string;
    descricao: string;
    gatilhos_especificos: GatilhoEspecifico[];
  };
  persona: {
    nome_ficticio: string;
    idade_range: string;
    genero: string;
    profissao: string;
    estado_civil: string;
    renda_mensal: string;
    onde_mora: string;
    rotina_destruida: string;
    momento_de_ruptura: string;
  };
  dor_latente: {
    dor_superficial: string;
    dor_real: string;
    dor_identitaria: string;
    vergonha_oculta: string;
  };
  falhas_do_mercado: {
    tentativas_anteriores: AttemptItem[];
    frustracao_acumulada: string;
  };
  fala_interna: {
    antes_de_dormir: string[];
    ao_acordar: string[];
    ao_ver_o_problema: string[];
    ao_ver_anuncio: string[];
  };
  medos_aterrorizantes: {
    medo_do_cenario_invisivel: { titulo: string; descricao: string; frase_de_copy: string };
    medo_social: { titulo: string; descricao: string; frase_de_copy: string };
    medo_de_dependencia: { titulo: string; descricao: string; frase_de_copy: string };
    medo_da_inacao: { titulo: string; descricao: string; frase_de_copy: string };
    medo_bonus: { titulo: string; descricao: string; frase_de_copy: string };
  };
  framework_cultural_br: {
    o_que_funciona: CultureItem[];
    o_que_evitar: CultureItem[];
    palavras_que_convertem: string[];
    palavras_que_afastam: string[];
  };
  arsenal_de_copy: {
    headlines_de_dor: string[];
    headlines_de_medo: string[];
    aberturas_de_vsl: string[];
    provas_sociais_ficticias: string[];
    cta_urgencia: string[];
  };
}

interface MockProduct {
  nome: string;
  nicho: string;
  promessa: string;
  problema: string;
  publico: string;
  preco: string;
}

const MOCK_PRODUCTS: MockProduct[] = [
  {
    nome: "Protocolo Detox 30 Dias",
    nicho: "emagrecimento",
    promessa: "Secar 7kg em 30 dias tomando 1 chá por dia",
    problema: "Gordura abdominal resistente que não sai com dieta tradicional",
    publico: "Mulheres 35-55 anos com metabolismo lento",
    preco: "R$19,90"
  },
  {
    nome: "Método Virilidade Plena",
    nicho: "saúde masculina",
    promessa: "Recuperar energia e libido em 21 dias com protocolo natural",
    problema: "Queda de disposition física e libido masculina com a idade",
    publico: "Homens 40-60 anos frustrados com cansaço crônico",
    preco: "R$27,00"
  },
  {
    nome: "Avaliador Recompensado",
    nicho: "renda extra",
    promessa: "Ganhar R$300/dia avaliando produtos internacionais pelo celular",
    problema: "Falta de renda complementar no fim do mês para pagar contas básicas",
    publico: "Pessoas comuns buscando renda extra sem sair de casa",
    preco: "R$9,90"
  },
  {
    nome: "LeadZap Automador",
    nicho: "SaaS",
    promessa: "Automar captação e envio de mensagens para 500 leads/dia 100% no piloto automático",
    problema: "Perda excessiva de tempo rodando processos manuais de vendas de forma lenta e ineficiente",
    publico: "Agências de marketing, donos de infoprodutos e assessores comerciais",
    preco: "R$47,00/mês"
  }
];

export function AudienceDossierPanel() {
  const [internalTab, setInternalTab] = useState<"manual" | "saved">("manual");
  
  // Fields state
  const [nome, setNome] = useState("");
  const [nicho, setNicho] = useState("emagrecimento");
  const [promessa, setPromessa] = useState("");
  const [problema, setProblema] = useState("");
  const [publico, setPublico] = useState("");
  const [preco, setPreco] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [dossier, setDossier] = useState<DossierData | null>(null);
  
  // Tracking copies feedback
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleSelectMock = async (prod: MockProduct) => {
    setNome(prod.nome);
    setNicho(prod.nicho);
    setPromessa(prod.promessa);
    setProblema(prod.problema);
    setPublico(prod.publico);
    setPreco(prod.preco);

    setInternalTab("manual");
    await generateDossier(prod);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !promessa.trim() || !problema.trim()) {
      setErrorText("Nome do produto, promessa principal e problema central são obrigatórios.");
      setStatus("error");
      return;
    }
    const current: MockProduct = {
      nome, nicho, promessa, problema, publico, preco
    };
    await generateDossier(current);
  };

  const generateDossier = async (prod: MockProduct) => {
    setStatus("loading");
    setErrorText("");

    try {
      const res = await fetch("/api/generate-audience-dossier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome: prod.nome,
          nicho: prod.nicho,
          promessa: prod.promessa,
          problema: prod.problema,
          publico: prod.publico,
          preco: prod.preco
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro misterioso ao computar o dossiê.");
      }

      setDossier(data.dossier);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Erro de conexão com o servidor. Tente novamente.");
      setStatus("error");
    }
  };

  const handleCopySectionContent = (sectionId: string, plainText: string) => {
    navigator.clipboard.writeText(plainText.trim());
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  // Helper formatting for copies
  const getClinicaText = () => {
    if (!dossier) return "";
    let str = `--- DEFINIÇÃO CLÍNICA: ${dossier.definicao_clinica.titulo} ---\n\n`;
    str += `${dossier.definicao_clinica.descricao}\n\n`;
    str += `GATILHOS DE DETALHE:\n`;
    dossier.definicao_clinica.gatilhos_especificos.forEach((g, idx) => {
      str += `${idx + 1}. ${g.nome}\nDescrição: ${g.descricao}\nCopy Atack: "${g.angulo_de_copy}"\n\n`;
    });
    return str;
  };

  const getPersonaText = () => {
    if (!dossier) return "";
    return `--- PERSONA REVELADA: ${dossier.persona.nome_ficticio} ---\n
Demografia:
- Idade: ${dossier.persona.idade_range}
- Gênero: ${dossier.persona.genero}
- Profissão: ${dossier.persona.profissao}
- Estado Civil: ${dossier.persona.estado_civil}
- Renda Mensal: ${dossier.persona.renda_mensal}
- Onde mora: ${dossier.persona.onde_mora}\n
Rotina Destruída:
${dossier.persona.rotina_destruida}\n
Momento Crítico de Ruptura:
${dossier.persona.momento_de_ruptura}`;
  };

  const getDorText = () => {
    if (!dossier) return "";
    return `--- ANÁLISE PROFUNDA DE DOR ---\n
1. Dor Superficial (O que diz):
"${dossier.dor_latente.dor_superficial}"\n
2. Dor Real (O que sente):
"${dossier.dor_latente.dor_real}"\n
3. Dor Identitária (Reflexo de Autoimagem):
"${dossier.dor_latente.dor_identitaria}"\n
4. Vergonha Oculta (O segredo não compartilhado):
"${dossier.dor_latente.vergonha_oculta}"`;
  };

  const getFalhasText = () => {
    if (!dossier) return "";
    let str = `--- HISTÓRICO DE FALHAS DO MERCADO ---\n\n`;
    dossier.falhas_do_mercado.tentativas_anteriores.forEach((t, i) => {
      str += `TENTATIVA #${i + 1}: ${t.tentativa}\n- Gasto: ${t.quanto_gastou}\n- Motivo da Falha: ${t.por_que_falhou}\n- Crença resultante: "${t.crenca_formada}"\n\n`;
    });
    str += `Frustração Acumulada no Subconsciente:\n${dossier.falhas_do_mercado.frustracao_acumulada}`;
    return str;
  };

  const getFalasText = () => {
    if (!dossier) return "";
    let str = `--- MONÓLOGOS INTERNOS DO COMPRADOR ---\n\n`;
    str += `ANTES DE DORMIR:\n` + dossier.fala_interna.antes_de_dormir.map(f => `  - "${f}"`).join("\n") + "\n\n";
    str += `AO ACORDAR:\n` + dossier.fala_interna.ao_acordar.map(f => `  - "${f}"`).join("\n") + "\n\n";
    str += `AO CONFRONTAR O PROBLEMA (Espelho/Balança/Rotina):\n` + dossier.fala_interna.ao_ver_o_problema.map(f => `  - "${f}"`).join("\n") + "\n\n";
    str += `AO VER O ANÚNCIO DO PRODUTO:\n` + dossier.fala_interna.ao_ver_anuncio.map(f => `  - "${f}"`).join("\n");
    return str;
  };

  const getMedosText = () => {
    if (!dossier) return "";
    let str = `--- MEDOS VISCERAIS ATERRORIZANTES ---\n\n`;
    const m = dossier.medos_aterrorizantes;
    const items = [m.medo_do_cenario_invisivel, m.medo_social, m.medo_de_dependencia, m.medo_da_inacao, m.medo_bonus];
    items.forEach((item, i) => {
      str += `MEDO #${i + 1}: ${item.titulo}\nDescrição: ${item.descricao}\nCopy Pronta: "${item.frase_de_copy}"\n\n`;
    });
    return str;
  };

  const getCultureText = () => {
    if (!dossier) return "";
    let str = `--- FRAMEWORK CULTURAL BRASILEIRO ---\n\nO QUE FUNCIONA EM ALTA CONVERSÃO:\n`;
    dossier.framework_cultural_br.o_que_funciona.forEach(item => {
      str += `- ${item.elemento}\n  Por que converte: ${item.por_que_funciona}\n  Como usar: ${item.como_usar}\n\n`;
    });
    str += `O QUE DEVE SER EVITADO:\n`;
    dossier.framework_cultural_br.o_que_evitar.forEach(item => {
      str += `- ${item.elemento}\n  Por que repele: ${item.por_que_repele}\n  Alternativa: ${item.alternativa}\n\n`;
    });
    str += `Palavras de Alta Conversão: ${dossier.framework_cultural_br.palavras_que_convertem.join(", ")}\n\n`;
    str += `Palavras-gatilho de Bloqueio: ${dossier.framework_cultural_br.palavras_que_afastam.join(", ")}`;
    return str;
  };

  const getArsenalText = () => {
    if (!dossier) return "";
    let str = `--- ARSENAL COMPLETO DE COPY (PRONTO PARA CRIATIVOS) ---\n\n`;
    str += `HEADLINES DE DOR:\n` + dossier.arsenal_de_copy.headlines_de_dor.map((h, i) => `${i + 1}. "${h}"`).join("\n") + "\n\n";
    str += `HEADLINES DE MEDO:\n` + dossier.arsenal_de_copy.headlines_de_medo.map((h, i) => `${i + 1}. "${h}"`).join("\n") + "\n\n";
    str += `ABERTURAS HIPNÓTICAS DE VSL:\n` + dossier.arsenal_de_copy.aberturas_de_vsl.map((h, i) => `Opção ${i + 1}: "${h}"`).join("\n\n") + "\n\n";
    str += `PROVAS SOCIAIS INSPIRACIONAIS (ESTILO BRASILEIRO):\n` + dossier.arsenal_de_copy.provas_sociais_ficticias.map((h, i) => `Exemplo ${i + 1}:\n"${h}"`).join("\n\n") + "\n\n";
    str += `CHAMADAS PARA AÇÃO DE URGÊNCIA (LOW TICKET):\n` + dossier.arsenal_de_copy.cta_urgencia.map((h, i) => `${i + 1}. ${h}`).join("\n");
    return str;
  };

  const getDossierTotalText = () => {
    if (!dossier) return "";
    return `==========================================\n DOSSIÊ PSICOLÓGICO DE PÚBLICO: ${dossier.produto.toUpperCase()} \n==========================================\n\n`
      + getClinicaText() + "\n\n"
      + getPersonaText() + "\n\n"
      + getDorText() + "\n\n"
      + getFalhasText() + "\n\n"
      + getFalasText() + "\n\n"
      + getMedosText() + "\n\n"
      + getCultureText() + "\n\n"
      + getArsenalText();
  };

  const handleCopyBlock = (label: string, array: string[]) => {
    const formatted = array.map((item, idx) => `${idx + 1}. ${item}`).join("\n");
    navigator.clipboard.writeText(formatted);
    setCopiedSection(label);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const handleCopySingleText = (label: string, valStr: string) => {
    navigator.clipboard.writeText(valStr);
    setCopiedSection(label);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const resetForm = () => {
    setStatus("idle");
    setDossier(null);
    setErrorText("");
  };

  return (
    <div id="audience-dossier-panel" className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4 animate-fade-in mac-fade-in">
      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF453A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF453A]"></span>
            </span>
            <span className="text-[10px] font-bold font-mono text-ink-tertiary tracking-widest uppercase">
              PSYCHOLOGICAL MAPPING ENGINE
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight font-sans">
            Dossiê Psicológico do Público-Alvo
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5 max-w-3xl font-semibold leading-relaxed">
            Mapeie ganchos comportamentais clínicos e viscerais baseados nos maiores dores de seu prospecto brasileiro. Substitua objeções fracas por copy de alta conversão.
          </p>
        </div>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-20 mac-card rounded-mac-lg min-h-[460px]">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            <Users className="w-6 h-6 text-primary absolute animate-[pulse_1.5s_infinite]" />
          </div>
          <h3 className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-widest">
            Decompondo Atitudes Humanas
          </h3>
          <p className="text-xs text-ink-secondary mt-2 font-mono text-center max-w-md px-4 font-bold">
            Construindo dossiê psicológico visceral para "{nome || "seu produto"}"...
          </p>
          <p className="text-[10px] text-ink-tertiary font-mono mt-1 font-semibold">
            Mapeando crenças limitantes e framework cultural BR. Isso pode levar alguns segundos.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="p-6 bg-surface-raised border border-systemRed/25 rounded-mac-lg max-w-2xl mx-auto text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-systemRed/10 border border-systemRed/25 text-systemRed rounded-mac-md flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">Falha de Mapeamento</h3>
            <p className="text-xs text-ink-secondary leading-relaxed font-sans font-semibold">{errorText}</p>
          </div>
          <button
            onClick={resetForm}
            className="px-6 py-2 rounded-mac-sm bg-primary hover:bg-red-650 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer ml-auto mr-auto"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {status === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SELECTOR CARDS */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-surface-raised border border-hairline p-0.5 rounded-mac-sm flex gap-1">
              <button
                type="button"
                onClick={() => setInternalTab("manual")}
                className={`flex-1 py-2 text-center rounded-mac-sm text-[10px] font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                  internalTab === "manual"
                    ? "bg-primary text-white"
                    : "text-ink-tertiary hover:text-white"
                }`}
              >
                Formulário Rápido
              </button>
              <button
                type="button"
                onClick={() => setInternalTab("saved")}
                className={`flex-1 py-2 text-center rounded-mac-sm text-[10px] font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                  internalTab === "saved"
                    ? "bg-primary text-white"
                    : "text-ink-tertiary hover:text-white"
                }`}
              >
                Produtos Salvos
              </button>
            </div>

            <div className="mac-card rounded-mac-lg p-5 space-y-4 select-none">
              <div className="flex gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase font-mono text-white">
                    O Problema Clínico
                  </h4>
                  <p className="text-[10px] text-ink-secondary leading-relaxed font-sans font-semibold">
                    Nossa IA decompõe o problema superficial em gatilhos específicos cruéis da rotina real. Se você entende o segredo vergonhoso do cliente, sua copy custa menos e converte 5x mais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FORMS BLOCK CONTAINER */}
          <div className="lg:col-span-8 mac-card p-5 md:p-6 rounded-mac-lg">
            {internalTab === "manual" ? (
              <form onSubmit={handleManualSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                      Nome do Produto <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Protocolo Detox 30 Dias"
                      className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white placeholder-ink-tertiary transition-all font-sans bg-surface-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                      Nicho <span className="text-primary">*</span>
                    </label>
                    <select
                      value={nicho}
                      onChange={(e) => setNicho(e.target.value)}
                      className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white transition-all font-sans cursor-pointer bg-surface-base"
                    >
                      <option value="emagrecimento" className="bg-surface-base">Emagrecimento</option>
                      <option value="saúde masculina" className="bg-surface-base">Saúde Masculina</option>
                      <option value="saúde e bem-estar" className="bg-surface-base">Saúde e Bem-Estar</option>
                      <option value="renda extra" className="bg-surface-base">Renda Extra</option>
                      <option value="relacionamento" className="bg-surface-base">Relacionamento</option>
                      <option value="finanças" className="bg-surface-base">Finanças</option>
                      <option value="beleza" className="bg-surface-base">Beleza</option>
                      <option value="SaaS" className="bg-surface-base">SaaS</option>
                      <option value="outros" className="bg-surface-base">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Promessa Principal <span className="text-primary">*</span>
                  </label>
                  <textarea
                    required
                    value={promessa}
                    onChange={(e) => setPromessa(e.target.value)}
                    placeholder="Ex: Emagrecer 7kg em 30 dias sem academia ou dietas malucas"
                    className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white placeholder-ink-tertiary transition-all font-sans min-h-[80px] resize-none bg-surface-base"
                  ></textarea>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                    Problema Central que Resolve <span className="text-primary">*</span>
                  </label>
                  <textarea
                    required
                    value={problema}
                    onChange={(e) => setProblema(e.target.value)}
                    placeholder="Ex: Gordura abdominal persistente que não some de jeito nenhum mesmo fechando a boca"
                    className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white placeholder-ink-tertiary transition-all font-sans min-h-[80px] resize-none bg-surface-base"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                      Público-Alvo Inicial
                    </label>
                    <input
                      type="text"
                      value={publico}
                      onChange={(e) => setPublico(e.target.value)}
                      placeholder="Ex: Mulheres 35-55 anos com rotina corrida"
                      className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white placeholder-ink-tertiary transition-all font-sans bg-surface-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
                      Preço do Produto (Ticket)
                    </label>
                    <input
                      type="text"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="Ex: R$ 19,90"
                      className="w-full mac-input rounded-mac-sm px-4 py-2.5 text-xs text-white placeholder-ink-tertiary transition-all font-sans bg-surface-base"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={!nome.trim() || !promessa.trim() || !problema.trim() || status === "loading"}
                    className={`w-full py-2.5 px-4 rounded-mac-sm text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 select-none cursor-pointer ${
                      !nome.trim() || !promessa.trim() || !problema.trim()
                        ? "bg-surface-raised border border-hairline text-ink-tertiary cursor-not-allowed"
                        : "bg-primary text-white border-none shadow-[0_0_15px_rgba(255,69,58,0.35)] hover:shadow-[0_0_22px_rgba(255,69,58,0.5)] active:scale-95"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-white" />
                    <span>Gerar Dossiê Psicológico</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                    Escolha de Produtos Rápidos
                  </h3>
                  <p className="text-xs text-ink-secondary font-sans font-semibold">
                    Demonstre a ferramenta selecionando um dos produtos pré-avaliados. O dossiê é gerado em tempo recorde.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {MOCK_PRODUCTS.map((prod, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectMock(prod)}
                      className="p-4 bg-surface-base/60 hover:bg-surface-raised/80 border border-hairline hover:border-primary/25 rounded-mac-lg flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all active:scale-[0.99] select-none text-left"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary shrink-0" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">{prod.nome}</h4>
                          <span className="px-2 py-0.5 rounded-mac-sm bg-primary/10 border border-primary/25 text-[9px] font-mono font-bold text-primary uppercase">
                            {prod.nicho}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-secondary font-sans line-clamp-1 font-semibold">
                          <strong className="text-ink-tertiary text-[10px] font-mono tracking-wider uppercase font-semibold">Promessa:</strong> "{prod.promessa}"
                        </p>
                        <p className="text-[11px] text-ink-secondary font-sans line-clamp-1 font-semibold">
                          <strong className="text-ink-tertiary text-[10px] font-mono tracking-wider uppercase font-semibold">Problema:</strong> "{prod.problema}"
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-center text-primary font-mono text-[9px] font-bold uppercase tracking-wider shrink-0">
                        <span>Analisar Agora</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* PROMOTION PREVIEW FOOTER */}
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-mac-lg flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-left space-y-0.5">
                    <p className="text-[11px] font-bold uppercase text-white font-mono tracking-wider">
                      Ficha de Oferta Em Breve
                    </p>
                    <p className="text-[10px] text-ink-secondary leading-relaxed font-sans font-semibold">
                      Em breve você poderá cadastrar seus produtos na Ficha de Oferta do Vusk Operation e salvá-los permanentemente no banco para geração recorrente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "success" && dossier && (
        <div className="space-y-8 animate-fade-in text-left">
          {/* FLOATING ACTION RESULT OVERVIEW BAR */}
          <div className="bg-surface-raised border border-hairline p-4 md:p-5 rounded-mac-lg flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl">
            <div>
              <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-widest block mb-0.5">
                DOSSIÊ CLÍNICO ATIVO
              </span>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight font-sans">{dossier.produto}</h3>
                <span className="px-2.5 py-0.5 rounded-mac-sm bg-primary/10 border border-primary/25 text-[9px] font-mono font-bold text-primary uppercase select-none">
                  {dossier.nicho}
                </span>
              </div>
              <p className="text-[10px] text-ink-tertiary font-mono mt-0.5 font-semibold">
                Formato: Dossiê Psicológico de Resposta Direta • Elaborado por Inteligência Artificial
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleCopySectionContent("total", getDossierTotalText())}
                className={`px-4 py-2 rounded-mac-sm font-mono text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none cursor-pointer active:scale-95 ${
                  copiedSection === "total"
                    ? "bg-systemGreen/10 border border-systemGreen/25 text-systemGreen"
                    : "bg-surface-base hover:bg-surface-raised border border-hairline text-white"
                }`}
              >
                {copiedSection === "total" ? (
                  <>
                    <CopyCheck className="w-3.5 h-3.5" />
                    <span>Dossiê Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Dossiê Completo</span>
                  </>
                )}
              </button>

              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-mac-sm bg-surface-base hover:bg-surface-raised border border-hairline text-ink-secondary font-mono text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none cursor-pointer active:scale-95 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary" />
                <span>Analisar Outra Oferta</span>
              </button>
            </div>
          </div>

          {/* SEÇÃO 1 — DEFINIÇÃO CLÍNICA */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔬</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 1 — Definição Clínica
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("clinica", getClinicaText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "clinica" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-base md:text-lg font-bold text-[#ededef] tracking-tight font-sans">
                {dossier.definicao_clinica.titulo}
              </h3>
              <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed font-sans max-w-5xl font-semibold">
                {dossier.definicao_clinica.descricao}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {dossier.definicao_clinica.gatilhos_especificos.map((gat, i) => (
                <div 
                  key={i} 
                  className="bg-surface-base hover:bg-surface-raised border border-hairline transition-all duration-300 p-4 rounded-mac-lg flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-mono font-bold text-primary block uppercase tracking-wider">
                      GATILHO #{i + 1}
                    </span>
                    <h4 className="text-sm font-bold text-white tracking-snug font-sans">{gat.nome}</h4>
                    <p className="text-xs text-ink-secondary font-sans leading-relaxed font-semibold">{gat.descricao}</p>
                  </div>
                  
                  <div className="bg-surface-raised p-3 rounded-mac-sm border border-hairline text-left">
                    <span className="text-[8px] font-mono font-extrabold text-primary uppercase block tracking-wider mb-1">
                      ÂNGULO DE COPY SUGERIDO:
                    </span>
                    <p className="text-xs text-zinc-300 italic font-sans font-semibold line-clamp-2">
                      "{gat.angulo_de_copy}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SEÇÃO 2 — PERSONA & ROTINA DESTRUÍDA */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">👤</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 2 — Persona Mapeada
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("persona", getPersonaText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "persona" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column Profile metadata */}
              <div className="lg:col-span-4 bg-surface-base border border-hairline rounded-mac-md p-5 flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary text-xl font-bold select-none">
                  {dossier.persona.nome_ficticio.substring(0, 2).toUpperCase()}
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white font-sans">{dossier.persona.nome_ficticio}</h4>
                  <p className="text-[10px] font-mono font-bold text-ink-tertiary uppercase tracking-widest mt-0.5">
                    REPRESENTANTE GERAL
                  </p>
                </div>

                <div className="w-full border-t border-hairline pt-3 text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-ink-tertiary font-mono font-bold uppercase tracking-wide">IDADE:</span>
                    <span className="text-ink-secondary font-bold">{dossier.persona.idade_range}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-ink-tertiary font-mono font-bold uppercase tracking-wide">GÊNERO:</span>
                    <span className="text-ink-secondary font-bold">{dossier.persona.genero}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-ink-tertiary font-mono font-bold uppercase tracking-wide">OCUPAÇÃO:</span>
                    <span className="text-ink-secondary font-bold">{dossier.persona.profissao}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-ink-tertiary font-mono font-bold uppercase tracking-wide">ESTADO CIVIL:</span>
                    <span className="text-ink-secondary font-bold">{dossier.persona.estado_civil}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-ink-tertiary font-mono font-bold uppercase tracking-wide">RENDA ESTIM.:</span>
                    <span className="text-ink-secondary font-bold">{dossier.persona.renda_mensal}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10.5px]">
                    <span className="text-ink-tertiary font-mono font-bold uppercase tracking-wide">LOCALIDADE:</span>
                    <span className="text-ink-secondary font-bold line-clamp-1">{dossier.persona.onde_mora}</span>
                  </div>
                </div>
              </div>

              {/* Right Column details */}
              <div className="lg:col-span-8 text-left space-y-6">
                <div className="space-y-2">
                  <span className="text-[9px] font-mono font-extrabold text-primary uppercase tracking-widest block select-none">
                    A ROTINA DESTRUÍDA
                  </span>
                  <div className="p-4 bg-surface-base rounded-mac-lg border border-hairline text-xs sm:text-sm text-zinc-300 leading-relaxed italic font-semibold font-sans">
                    "{dossier.persona.rotina_destruida}"
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-mono font-extrabold text-primary uppercase tracking-widest block select-none">
                    O MOMENTO DE RUPTURA (GATILHO DE COMPRA)
                  </span>
                  <div className="border-l-2 border-primary pl-4 py-2 text-xs sm:text-sm text-[#F5F5F7]/85 leading-relaxed font-sans font-bold">
                    {dossier.persona.momento_de_ruptura}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3 — DOR LATENTE */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💔</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 3 — A Dor Latente
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("dor", getDorText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "dor" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Dor Superficial */}
              <div className="bg-surface-base hover:bg-surface-raised border border-hairline p-4 rounded-mac-lg text-left flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 rounded-mac-sm text-[8px] font-bold font-mono bg-systemBlue/10 border border-systemBlue/25 text-systemBlue uppercase select-none">
                    DOR SUPERFICIAL
                  </span>
                  <h4 className="text-[10px] font-mono font-bold text-ink-tertiary uppercase">O que ela diz verbalmente</h4>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans font-semibold">
                  "{dossier.dor_latente.dor_superficial}"
                </p>
              </div>

              {/* Card 2: Dor Real */}
              <div className="bg-surface-base hover:bg-surface-raised border border-hairline p-4 rounded-mac-lg text-left flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 rounded-mac-sm text-[8px] font-bold font-mono bg-systemRed/10 border border-systemRed/25 text-systemRed uppercase select-none">
                    DOR REAL
                  </span>
                  <h4 className="text-[10px] font-mono font-bold text-ink-tertiary uppercase">O que realmente sente no íntimo</h4>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans font-semibold">
                  "{dossier.dor_latente.dor_real}"
                </p>
              </div>

              {/* Card 3: Dor Identitária */}
              <div className="bg-surface-base hover:bg-surface-raised border border-hairline p-4 rounded-mac-lg text-left flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 rounded-mac-sm text-[8px] font-bold font-mono bg-systemPurple/10 border border-systemPurple/25 text-systemPurple uppercase select-none">
                    DOR IDENTITÁRIA
                  </span>
                  <h4 className="text-[10px] font-mono font-bold text-ink-tertiary uppercase">Como se enxerga como pessoa</h4>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans font-semibold">
                  "{dossier.dor_latente.dor_identitaria}"
                </p>
              </div>

              {/* Card 4: Vergonha Oculta */}
              <div className="bg-surface-base hover:bg-surface-raised border border-hairline p-4 rounded-mac-lg text-left flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="px-2 py-0.5 rounded-mac-sm text-[8px] font-bold font-mono bg-surface-raised border border-hairline text-ink-secondary uppercase select-none font-semibold">
                    VERGONHA OCULTA
                  </span>
                  <h4 className="text-[10px] font-mono font-bold text-ink-tertiary uppercase">O que não confia a ninguém</h4>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans font-bold">
                  "{dossier.dor_latente.vergonha_oculta}"
                </p>
              </div>
            </div>
          </section>

          {/* SEÇÃO 4 — FALHAS DO MERCADO */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚠️</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 4 — O Ciclo de Erros e Falhas do Mercado
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("falhas", getFalhasText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "falhas" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            {/* vertical timeline layout */}
            <div className="relative pl-6 sm:pl-8 space-y-6 text-left border-l border-primary/20">
              {dossier.falhas_do_mercado.tentativas_anteriores.map((tent, i) => (
                <div key={i} className="relative">
                  {/* Circle locator icon */}
                  <span className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border border-primary bg-surface-base flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
                    <span className="w-1.5 h-1.5 bg-primary absolute rounded-full"></span>
                  </span>

                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5">
                      <h4 className="text-sm font-bold text-white font-sans uppercase">
                        {i + 1}. {tent.tentativa}
                      </h4>
                      <span className="px-2 py-0.5 rounded-mac-sm bg-primary/10 border border-primary/25 text-primary text-[9px] font-bold font-mono uppercase tracking-wider self-start sm:self-center select-none">
                        Custo Estimado: {tent.quanto_gastou}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold leading-relaxed font-sans">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-ink-tertiary tracking-wider uppercase block">
                          POR QUE FALHOU DE VERDADE:
                        </span>
                        <p className="text-ink-secondary mt-0.5">{tent.por_que_falhou}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono font-bold text-ink-tertiary tracking-wider uppercase block">
                          CRENÇA LIMITANTE QUE ESTABELECEU:
                        </span>
                        <p className="text-zinc-300 italic mt-0.5 font-bold">"{tent.crenca_formada}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Frustração acumulada */}
            <div className="p-4 bg-primary/5 rounded-mac-lg border border-primary/15 text-left space-y-1 mt-4">
              <span className="text-[9px] font-mono font-extrabold text-primary uppercase tracking-widest block select-none">
                FRUSTRAÇÃO ACUMULADA NO SUBCONSCIENTE
              </span>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-bold font-sans">
                {dossier.falhas_do_mercado.frustracao_acumulada}
              </p>
            </div>
          </section>

          {/* SEÇÃO 5 — FALA INTERNA RECORRENTE */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💬</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 5 — Diálogos e Pensamentos Internos
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("falas", getFalasText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "falas" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Antes de Dormir */}
              <div className="bg-surface-base border border-hairline rounded-mac-md p-4 space-y-3.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌙</span>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Antes de Dormir (Escuridão)
                  </h4>
                </div>
                <ul className="space-y-2.5 text-xs text-ink-secondary font-bold italic">
                  {dossier.fala_interna.antes_de_dormir.map((f, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-primary font-mono select-none">"</span>
                      <span>{f}</span>
                      <span className="text-primary font-mono select-none">"</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ao Acordar */}
              <div className="bg-surface-base border border-hairline rounded-mac-md p-4 space-y-3.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">☀️</span>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Ao Acordar (Fadiga)
                  </h4>
                </div>
                <ul className="space-y-2.5 text-xs text-ink-secondary font-bold italic">
                  {dossier.fala_interna.ao_acordar.map((f, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-primary font-mono select-none">"</span>
                      <span>{f}</span>
                      <span className="text-primary font-mono select-none">"</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ao Ver o Problema */}
              <div className="bg-surface-base border border-hairline rounded-mac-md p-4 space-y-3.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">🪞</span>
                  <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Ao Confrontar o Problema
                  </h4>
                </div>
                <ul className="space-y-2.5 text-xs text-ink-secondary font-bold italic">
                  {dossier.fala_interna.ao_ver_o_problema.map((f, i) => (
                    <li key={i} className="flex gap-2 leading-relaxed">
                      <span className="text-primary font-mono select-none">"</span>
                      <span>{f}</span>
                      <span className="text-primary font-mono select-none">"</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Ao ver o anuncio */}
            <div className="p-4 bg-surface-base border border-hairline rounded-mac-md text-left space-y-2">
              <span className="text-[9px] font-mono font-extrabold text-primary uppercase tracking-widest block select-none">
                RELAÇÃO E CRÍTICA AO VER O ANÚNCIO DE SEU PRODUTO
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {dossier.fala_interna.ao_ver_anuncio.map((f, i) => (
                  <div key={i} className="bg-surface-raised p-3 border border-hairline rounded-mac-sm">
                    <span className="text-[9px] font-mono text-ink-tertiary font-bold block mb-1">REAGENTE DE COMPRA #{i + 1}</span>
                    <p className="text-xs text-zinc-300 italic font-semibold font-sans">"{f}"</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SEÇÃO 6 — MEDOS ATERRORIZANTES */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">😨</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 6 — Os 5 Medos Aterrorizantes e Viscerais
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("medos", getMedosText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "medos" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { emoji: "🌘", id: "invisivel", ...dossier.medos_aterrorizantes.medo_do_cenario_invisivel },
                { emoji: "🗣️", id: "social", ...dossier.medos_aterrorizantes.medo_social },
                { emoji: "🧬", id: "dependencia", ...dossier.medos_aterrorizantes.medo_de_dependencia },
                { emoji: "⌛", id: "inacao", ...dossier.medos_aterrorizantes.medo_da_inacao },
                { emoji: "💥", id: "bonus", ...dossier.medos_aterrorizantes.medo_bonus }
              ].map((m, idx) => (
                <div 
                  key={idx} 
                  className="bg-surface-base hover:bg-surface-raised border border-hairline hover:border-[#FF453A]/45 hover:-translate-y-0.5 transition-all duration-300 p-4 rounded-mac-lg flex flex-col justify-between text-left space-y-4"
                >
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-lg select-none">{m.emoji}</span>
                      <span className="text-[8px] font-mono font-bold bg-surface-raised px-2 py-0.5 rounded border border-hairline text-ink-tertiary">
                        MEDO #{idx + 1}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">{m.titulo}</h4>
                    <p className="text-[11px] text-ink-secondary font-sans leading-relaxed font-semibold">{m.descricao}</p>
                  </div>

                  <div className="bg-surface-raised p-3 rounded-mac-sm border border-hairline space-y-1 text-left">
                    <span className="text-[8px] font-mono font-extrabold text-primary uppercase block tracking-wider">
                      COPY COMPORTAMENTAL:
                    </span>
                    <p className="text-[11px] text-[#ededef] italic font-semibold leading-relaxed">
                      "{m.frase_de_copy}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SEÇÃO 7 — FRAMEWORK CULTURAL BR */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 relative space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🇧🇷</span>
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                  Seção 7 — Framework Comportamental BR
                </span>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("culture", getCultureText())}
                className="text-[10px] font-mono text-ink-tertiary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-bold"
              >
                {copiedSection === "culture" ? "Copiado! ✓" : "Copiar Seção"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* O que funciona */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-mac-sm bg-systemGreen/10 border border-systemGreen/25 text-[10px] font-mono font-bold text-systemGreen uppercase select-none">
                    O QUE FUNCIONA EM ALTA CONVERSÃO
                  </span>
                </div>

                <div className="space-y-3">
                  {dossier.framework_cultural_br.o_que_funciona.map((item, i) => (
                    <div key={i} className="p-3 bg-systemGreen/5 border border-systemGreen/10 rounded-mac-lg text-left space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide font-sans">{item.elemento}</h4>
                      <p className="text-[11px] text-ink-secondary font-sans leading-relaxed font-semibold">
                        <strong className="text-ink-tertiary font-bold font-sans">Por que converte:</strong> {item.por_que_funciona}
                      </p>
                      <p className="text-[11px] text-systemGreen font-sans leading-relaxed font-semibold">
                        <strong className="text-systemGreen/80 font-bold uppercase font-mono text-[9px] tracking-wider block">Como operacionalizar em copy:</strong> "{item.como_usar}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* O que evitar */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-mac-sm bg-systemRed/10 border border-systemRed/25 text-[10px] font-mono font-bold text-systemRed uppercase select-none">
                    O QUE EVITAR DE QUALQUER MANEIRA
                  </span>
                </div>

                <div className="space-y-3">
                  {dossier.framework_cultural_br.o_que_evitar.map((item, i) => (
                    <div key={i} className="p-3 bg-systemRed/5 border border-systemRed/10 rounded-mac-lg text-left space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide font-sans">{item.elemento}</h4>
                      <p className="text-[11px] text-ink-secondary font-sans leading-relaxed font-semibold">
                        <strong className="text-ink-tertiary font-bold font-sans">Por que destrói vendas:</strong> {item.por_que_repele}
                      </p>
                      <p className="text-[11px] text-systemRed font-sans leading-relaxed font-semibold">
                        <strong className="text-systemRed/80 font-bold uppercase font-mono text-[9px] tracking-wider block">O que fazer no lugar (Alternativa):</strong> {item.alternativa}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags de Palavras do Vocabulário do Prospecto */}
            <div className="pt-4 border-t border-hairline space-y-4">
              <div className="text-left space-y-2">
                <span className="text-[9px] font-mono font-bold text-ink-tertiary uppercase tracking-widest block">
                  VOCABULÁRIO DE CONEXÃO: PALAVRAS QUE ABREM A CARTEIRA
                </span>
                <div className="flex flex-wrap gap-2">
                  {dossier.framework_cultural_br.palavras_que_convertem.map((pal, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 text-xs font-semibold font-sans bg-systemGreen/10 border border-systemGreen/25 text-systemGreen rounded-mac-sm select-all"
                    >
                      {pal}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-left space-y-2">
                <span className="text-[9px] font-mono font-bold text-ink-tertiary uppercase tracking-widest block">
                  ALERTA VERMELHO: PALAVRAS QUE REPELEM E CRIAM SKEPTICISMO
                </span>
                <div className="flex flex-wrap gap-2">
                  {dossier.framework_cultural_br.palavras_que_afastam.map((pal, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 text-xs font-semibold font-sans bg-surface-base border border-hairline text-ink-tertiary line-through rounded-mac-sm select-all"
                    >
                      {pal}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 8 — ARSENAL DE COPY */}
          <section className="mac-card rounded-mac-lg p-5 md:p-6 border border-white/10 relative space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🎁</span>
                <div className="text-left">
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-white block">
                    Seção 8 — Arsenal Recomendado de Copy
                  </span>
                  <span className="px-2 py-0.5 rounded-mac-sm text-[8px] font-bold font-mono bg-systemGreen/10 border border-systemGreen/25 text-systemGreen uppercase select-none mt-0.5 block w-fit">
                    BÔNUS PRONTO PARA COPIAR E TESTAR
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => handleCopySectionContent("arsenal", getArsenalText())}
                className={`px-3 py-1.5 rounded-mac-sm text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 ${
                  copiedSection === "arsenal"
                    ? "bg-systemGreen/10 text-systemGreen"
                    : "text-ink-secondary hover:text-white bg-surface-base border border-hairline"
                }`}
              >
                {copiedSection === "arsenal" ? "Copiado! ✓" : "Copiar Arsenal Completo"}
              </button>
            </div>

            {/* BLOCK 1: headlines de dor */}
            <div className="bg-surface-base p-4 sm:p-5 rounded-mac-lg border border-hairline space-y-3 relative text-left">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wide">
                  🔥 Headlines de Dor Extrema
                </span>
                <button
                  onClick={() => handleCopyBlock("headlines_dor", dossier.arsenal_de_copy.headlines_de_dor)}
                  className="px-2.5 py-1 text-[9px] font-mono uppercase border border-hairline bg-surface-raised hover:bg-surface-raised/80 transition-colors rounded-mac-sm text-ink-secondary hover:text-white cursor-pointer font-bold"
                >
                  {copiedSection === "headlines_dor" ? "Copiado! ✓" : "Copiar"}
                </button>
              </div>
              <ol className="space-y-2 text-xs sm:text-sm text-zinc-300 font-semibold leading-relaxed font-sans">
                {dossier.arsenal_de_copy.headlines_de_dor.map((item, id) => (
                  <li key={id} className="p-3 bg-surface-raised/40 rounded-mac-sm border border-hairline flex items-center">
                    <strong className="text-primary font-mono text-xs mr-2 bg-primary/5 px-2 py-0.5 border border-primary/20 rounded">#{id + 1}</strong> 
                    <span>"{item}"</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* BLOCK 2: headlines de medo */}
            <div className="bg-surface-base p-4 sm:p-5 rounded-mac-lg border border-hairline space-y-3 relative text-left">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wide">
                  😨 Headlines Atacando o Medo Futuro
                </span>
                <button
                  onClick={() => handleCopyBlock("headlines_medo", dossier.arsenal_de_copy.headlines_de_medo)}
                  className="px-2.5 py-1 text-[9px] font-mono uppercase border border-hairline bg-surface-raised hover:bg-surface-raised/80 transition-colors rounded-mac-sm text-ink-secondary hover:text-white cursor-pointer font-bold"
                >
                  {copiedSection === "headlines_medo" ? "Copiado! ✓" : "Copiar"}
                </button>
              </div>
              <ol className="space-y-2 text-xs sm:text-sm text-zinc-300 font-semibold leading-relaxed font-sans">
                {dossier.arsenal_de_copy.headlines_de_medo.map((item, id) => (
                  <li key={id} className="p-3 bg-surface-raised/40 rounded-mac-sm border border-hairline flex items-center">
                    <strong className="text-primary font-mono text-xs mr-2 bg-primary/5 px-2 py-0.5 border border-primary/20 rounded">#{id + 1}</strong> 
                    <span>"{item}"</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* BLOCK 3: aberturas de vsl */}
            <div className="bg-surface-base p-4 sm:p-5 rounded-mac-lg border border-hairline space-y-3 relative text-left">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wide">
                  📢 Ganchos de Abertura para VSL
                </span>
                <button
                  onClick={() => handleCopyBlock("aberturas_vsl", dossier.arsenal_de_copy.aberturas_de_vsl)}
                  className="px-2.5 py-1 text-[9px] font-mono uppercase border border-hairline bg-surface-raised hover:bg-surface-raised/80 transition-colors rounded-mac-sm text-ink-secondary hover:text-white cursor-pointer font-bold"
                >
                  {copiedSection === "aberturas_vsl" ? "Copiado! ✓" : "Copiar"}
                </button>
              </div>
              <div className="space-y-4 font-sans leading-relaxed text-xs sm:text-sm text-zinc-300">
                {dossier.arsenal_de_copy.aberturas_de_vsl.map((item, id) => (
                  <div key={id} className="p-3 bg-surface-raised/40 rounded-mac-sm border border-hairline space-y-1">
                    <span className="text-[9px] font-mono text-primary font-bold tracking-widest block uppercase">GANCHO #{id + 1}</span>
                    <p className="italic font-semibold">"{item}"</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* BLOCK 4: Provas Sociais */}
              <div className="bg-surface-base p-4 sm:p-5 rounded-mac-lg border border-hairline space-y-3 relative text-left flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wide">
                      ✅ Conversas e Depoimentos (WhatsApp Style)
                    </span>
                    <button
                      onClick={() => handleCopyBlock("provas_sociais", dossier.arsenal_de_copy.provas_sociais_ficticias)}
                      className="px-2.5 py-1 text-[9px] font-mono uppercase border border-hairline bg-surface-raised hover:bg-surface-raised/80 transition-colors rounded-mac-sm text-ink-secondary hover:text-white cursor-pointer font-bold"
                    >
                      {copiedSection === "provas_sociais" ? "Copiado! ✓" : "Copiar"}
                    </button>
                  </div>
                  <div className="space-y-3 font-sans leading-relaxed text-xs text-zinc-300">
                    {dossier.arsenal_de_copy.provas_sociais_ficticias.map((item, id) => (
                      <div key={id} className="p-3 bg-surface-raised/30 rounded-mac-sm border border-hairline">
                        <p className="italic font-semibold">"{item}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* BLOCK 5: CTAs urgência */}
              <div className="bg-surface-base p-4 sm:p-5 rounded-mac-lg border border-hairline space-y-3 relative text-left flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center select-none">
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wide">
                      ⚡ CTAs com Urgência e Garantias (Low Ticket)
                    </span>
                    <button
                      onClick={() => handleCopyBlock("cta_urgencia", dossier.arsenal_de_copy.cta_urgencia)}
                      className="px-2.5 py-1 text-[9px] font-mono uppercase border border-hairline bg-surface-raised hover:bg-surface-raised/80 transition-colors rounded-mac-sm text-ink-secondary hover:text-white cursor-pointer font-bold"
                    >
                      {copiedSection === "cta_urgencia" ? "Copiado! ✓" : "Copiar"}
                    </button>
                  </div>
                  <ul className="space-y-2 font-mono text-xs text-zinc-300 leading-relaxed">
                    {dossier.arsenal_de_copy.cta_urgencia.map((item, id) => (
                      <li key={id} className="p-2.5 bg-surface-raised/35 rounded-mac-sm border border-hairline flex gap-2.5 items-start">
                        <span className="text-primary font-bold">▶</span>
                        <span className="font-semibold">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
