import React, { useState } from "react";
import { Zap, Copy, Check, RotateCcw, Loader2, Sparkles, AlertCircle, Info, ChevronRight, HelpCircle, Package } from "lucide-react";
import { motion } from "motion/react";

interface AngleItem {
  id: string;
  nome: string;
  emoji: string;
  headline: string;
  variacoes: string[];
}

interface MockProduct {
  nome: string;
  nicho: string;
  promessa: string;
  publico: string;
  objecao: string;
  preco: string;
}

const MOCK_PRODUCTS: MockProduct[] = [
  {
    nome: "Protocolo Detox 30 Dias",
    nicho: "emagrecimento",
    promessa: "Secar 7kg em 30 dias tomando 1 chá por dia",
    publico: "Mulheres 35-55 anos que não conseguem emagrecer",
    objecao: "Já tentei dieta e não funciona pra mim",
    preco: "R$19,90"
  },
  {
    nome: "Método Virilidade Plena",
    nicho: "saúde masculina",
    promessa: "Recuperar energia e libido em 21 dias com protocolo natural",
    publico: "Homens 40-60 anos com queda de disposição",
    objecao: "Isso é coisa da cabeça, não tem solução natural",
    preco: "R$27,00"
  },
  {
    nome: "Avaliador Recompensado",
    nicho: "renda extra",
    promessa: "Ganhar R$300/dia avaliando produtos pelo celular",
    publico: "Pessoas que buscam renda extra sem sair de casa",
    objecao: "Parece golpe, não vou cair nisso",
    preco: "R$9,90"
  }
];

export function CopyAnglesPanel() {
  const [internalTab, setInternalTab] = useState<"manual" | "saved">("manual");
  const [nome, setNome] = useState("");
  const [nicho, setNicho] = useState("emagrecimento");
  const [promessa, setPromessa] = useState("");
  const [publico, setPublico] = useState("");
  const [objecao, setObjecao] = useState("");
  const [preco, setPreco] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");
  const [angles, setAngles] = useState<AngleItem[]>([]);
  const [productAnalyzed, setProductAnalyzed] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSelectMock = async (prod: MockProduct) => {
    // Fill state
    setNome(prod.nome);
    setNicho(prod.nicho);
    setPromessa(prod.promessa);
    setPublico(prod.publico);
    setObjecao(prod.objecao);
    setPreco(prod.preco);

    // Switch view to manual so the user sees the pre-filled form in background or visual unity
    setInternalTab("manual");

    // Start generating automatically
    await triggerGeneration(prod);
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !promessa.trim()) {
      setErrorText("Nome do produto e promessa principal são campos obrigatórios.");
      setStatus("error");
      return;
    }
    const currentProductData: MockProduct = {
      nome,
      nicho,
      promessa,
      publico,
      objecao,
      preco
    };
    await triggerGeneration(currentProductData);
  };

  const triggerGeneration = async (prod: MockProduct) => {
    setStatus("loading");
    setErrorText("");
    setProductAnalyzed(prod.nome);

    try {
      const res = await fetch("/api/generate-angles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome: prod.nome,
          nicho: prod.nicho,
          promessa: prod.promessa,
          publico: prod.publico,
          objecao: prod.objecao,
          preco: prod.preco
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro misterioso ao computar ângulos com inteligência artificial.");
      }

      setAngles(data.angles);
      setStatus("success");
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Erro de conexão. Verifique se o servidor local está operacional.");
      setStatus("error");
    }
  };

  const handleCopyText = (angle: AngleItem) => {
    const textToCopy = `[ÂNGULO: ${angle.emoji} ${angle.nome}]\n\nHeadline:\n"${angle.headline}"\n\n3 Variações de Copy para Testar:\n1. ${angle.variacoes[0] || ""}\n2. ${angle.variacoes[1] || ""}\n3. ${angle.variacoes[2] || ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(angle.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const resetForm = () => {
    setStatus("idle");
    setErrorText("");
  };

  return (
    <div id="copy-angles-container" className="space-y-6 max-w-7xl mx-auto px-1 sm:px-4">
      {/* SECTION HEADER BLOCK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF453A] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF453A]"></span>
            </span>
            <span className="text-[10px] font-bold font-mono text-zinc-400 tracking-widest uppercase">
              COPY INTELLIGENCE
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight font-sans">
            Ângulos de Copy com IA
          </h2>
          <p className="text-zinc-400 text-xs md:text-sm mt-1 max-w-2xl font-medium leading-relaxed">
            Decomponha e gere automaticamente 8 ganchos psicológicos fundamentais para testar criativos, ganchos e otimizar anúncios de alta conversão.
          </p>
        </div>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-950/20 border border-white/5 rounded-3xl min-h-[400px]">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-primary animate-spin"></div>
            <Zap className="w-6 h-6 text-primary absolute animate-bounce" />
          </div>
          <h3 className="text-sm font-sans font-extrabold text-zinc-100 uppercase tracking-widest">
            Alinhando Redes Neurais
          </h3>
          <p className="text-xs text-zinc-400 mt-2 font-mono text-center max-w-sm px-4">
            Gerando 8 estruturas psicológicas de copy integradas para "{productAnalyzed}"...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="p-6 bg-[#1a0a0a] border border-[#FF453A]/20 rounded-3xl max-w-2xl mx-auto text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5Packed">
            <h3 className="text-sm font-bold font-mono uppercase text-white tracking-wider">Falha de Geração</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">{errorText}</p>
          </div>
          <button
            onClick={resetForm}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-mono text-[11px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,42,42,0.3)] active:scale-95 cursor-pointer ml-auto mr-auto"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {status === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* TABS SELECTOR FOR FORMS */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-zinc-950/40 border border-white/5 p-1 rounded-2xl flex gap-1">
              <button
                type="button"
                onClick={() => setInternalTab("manual")}
                className={`flex-1 py-3 text-center rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                  internalTab === "manual"
                    ? "bg-[#1f1f23] text-white border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Formulário Rápido
              </button>
              <button
                type="button"
                onClick={() => setInternalTab("saved")}
                className={`flex-1 py-3 text-center rounded-xl text-[10px] font-bold font-mono tracking-wider uppercase transition-all cursor-pointer ${
                  internalTab === "saved"
                    ? "bg-[#1f1f23] text-white border border-white/5"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Produtos Salvos
              </button>
            </div>

            <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl space-y-4 select-none">
              <div className="flex gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Os ângulos gerados são baseados em gatilhos humanos comprovados que atacam objeções do público-alvo com ganchos rápidos.
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE TAB VIEWS */}
          <div className="lg:col-span-8 bg-zinc-950/40 border border-white/5 p-5 md:p-6 rounded-3xl">
            {internalTab === "manual" ? (
              <form onSubmit={handleSubmitManual} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                      Nome do Produto <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Protocolo Detox 30 Dias"
                      className="w-full bg-[#141416] border border-white/5 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-base text-white placeholder-zinc-500 transition-all font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                      Nicho de Atuação <span className="text-primary">*</span>
                    </label>
                    <select
                      value={nicho}
                      onChange={(e) => setNicho(e.target.value)}
                      className="w-full bg-[#141416] border border-white/5 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3.5 text-base text-white transition-all font-sans cursor-pointer"
                    >
                      <option value="emagrecimento">Emagrecimento</option>
                      <option value="saúde masculina">Saúde Masculina</option>
                      <option value="saúde e bem-estar">Saúde e Bem-Esta</option>
                      <option value="renda extra">Renda Extra</option>
                      <option value="relacionamento">Relacionamento</option>
                      <option value="finanças">Finanças</option>
                      <option value="beleza">Beleza</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                    Promessa Principal <span className="text-primary">*</span>
                  </label>
                  <textarea
                    required
                    value={promessa}
                    onChange={(e) => setPromessa(e.target.value)}
                    placeholder="Ex: Secar 7kg em 30 dias tomando 1 chá natural pela manhã"
                    className="w-full bg-[#141416] border border-white/5 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-base text-white placeholder-zinc-500 transition-all font-sans min-h-[85px] resize-none"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                      Público-Alvo
                    </label>
                    <input
                      type="text"
                      value={publico}
                      onChange={(e) => setPublico(e.target.value)}
                      placeholder="Ex: Mulheres 35-55 anos com dificuldade de emagrecer"
                      className="w-full bg-[#141416] border border-white/5 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-base text-white placeholder-zinc-500 transition-all font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                      Objeção Principal
                    </label>
                    <input
                      type="text"
                      value={objecao}
                      onChange={(e) => setObjecao(e.target.value)}
                      placeholder="Ex: Já tentei dieta e não funciona para mim"
                      className="w-full bg-[#141416] border border-white/5 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-base text-white placeholder-zinc-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider font-mono">
                      Preço do Produto (Ticket)
                    </label>
                    <input
                      type="text"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="Ex: R$ 19,90"
                      className="w-full bg-[#141416] border border-white/5 focus:border-primary/50 focus:outline-none rounded-xl px-4 py-3 text-base text-white placeholder-zinc-500 transition-all font-sans"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={!nome.trim() || !promessa.trim() || status === "loading"}
                      className={`w-full py-3.5 px-4 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 select-none cursor-pointer ${
                        !nome.trim() || !promessa.trim()
                          ? "bg-zinc-800 text-zinc-500 border border-transparent cursor-not-allowed"
                          : "bg-primary text-white border border-primary/20 shadow-[0_0_15px_rgba(255,42,42,0.3)] hover:shadow-[0_0_22px_rgba(255,42,42,0.5)] active:scale-95"
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>Gerar Ângulos com IA</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="space-y-1.5 mb-2">
                  <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wide">
                    Produtos Exemplo da Ficha
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Escolha um dos produtos demonstrativos abaixo para gerar instantaneamente a modelagem dos 8 ângulos de copy psicológicos.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {MOCK_PRODUCTS.map((prod, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectMock(prod)}
                      className="p-4 bg-zinc-900/60 hover:bg-[#1f1f23]/60 border border-white/5 hover:border-primary/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-all active:scale-[0.99] select-none"
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2.5">
                          <Package className="w-4 h-4 text-primary shrink-0" />
                          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{prod.nome}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-mono font-bold text-primary uppercase">
                            {prod.nicho}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-sans line-clamp-1">
                          <strong className="text-zinc-300">Promessa:</strong> "{prod.promessa}"
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          Ticket: {prod.preco} • Público: {prod.publico}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 self-end md:self-center text-primary font-mono text-[9px] font-bold uppercase tracking-wider">
                        <span>Gerar agora</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* SUTIL ANNOUNCEMENT NOTICE */}
                <div className="p-4 bg-primary/5 border border-primary/15 rounded-2xl flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="text-left space-y-0.5">
                    <p className="text-[11px] font-bold uppercase text-white font-mono tracking-wider">
                      Ficha de Oferta Em Breve
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      Em breve você poderá cadastrar seus produtos na Ficha de Oferta do Vusk Operation e salvá-los permanentemente no banco para geração recorrente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-6">
          {/* HEADER RESULT BOX WITH RESET OPTION */}
          <div className="bg-[#101012]/80 border border-white/5 p-4 md:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl">
            <div className="text-left">
              <span className="text-[9px] font-mono font-bold text-primary uppercase tracking-widest block mb-0.5">
                PRODUTO ATIVO ANALISADO
              </span>
              <h3 className="text-lg font-extrabold text-white tracking-tight">{productAnalyzed}</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                Modelo utilizado: gemini-3.5-flash • 8 ângulos de copy gerados com sucesso
              </p>
            </div>

            <button
              onClick={resetForm}
              className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-white/5 hover:border-white/10 text-zinc-300 font-mono text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 select-none cursor-pointer self-start sm:self-center active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Gerar para outro Produto</span>
            </button>
          </div>

          {/* GRID OF 8 CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {angles.map((angle, k) => {
              const isCopied = copiedId === angle.id;

              return (
                <div
                  key={angle.id || k}
                  className="bg-zinc-950/40 hover:bg-zinc-900/10 border border-white/5 hover:border-primary/20 transition-all duration-300 rounded-3xl p-5 md:p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-4">
                    {/* Header angle */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{angle.emoji}</span>
                        <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-sans">
                          {k + 1}. {angle.nome}
                        </h4>
                      </div>
                      
                      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2.5 py-1 rounded-full border border-white/5 select-none">
                        Ganhos #{k + 1}
                      </span>
                    </div>

                    {/* Headline display text */}
                    <div className="text-left">
                      <span className="text-[8px] font-mono text-zinc-500 tracking-wider uppercase block select-none mb-1">
                        HEADLINE PRINCIPAL
                      </span>
                      <p className="text-base font-extrabold text-[#ededef] tracking-tight leading-snug">
                        "{angle.headline}"
                      </p>
                    </div>

                    <div className="border-t border-white/5 select-none my-1"></div>

                    {/* Variations list */}
                    <div className="text-left space-y-2.5">
                      <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-primary block select-none">
                        3 Variações para Testar:
                      </span>
                      
                      <ol className="space-y-2 text-xs text-zinc-400 font-medium font-sans leading-relaxed">
                        {angle.variacoes && angle.variacoes.map((item, id) => (
                          <li key={id} className="flex gap-2.5 text-left items-start bg-zinc-950/20 p-2.5 rounded-xl border border-white/[0.02]">
                            <span className="text-primary font-bold font-mono text-[10px] mt-0.5 shrink-0 bg-primary/5 border border-primary/10 w-5 h-5 rounded-md flex items-center justify-center">
                              {id + 1}
                            </span>
                            <span className="text-zinc-300 block">{item}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Copy CTA panel */}
                  <div className="pt-3 border-t border-white/[0.03] select-none flex items-center justify-end shrink-0">
                    <button
                      onClick={() => handleCopyText(angle)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                        isCopied
                          ? "bg-emerald-600/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-zinc-900 border border-white/5 hover:border-primary/20 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Tudo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
