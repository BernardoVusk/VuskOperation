import express from "express";
import path from "path";
import dns from "dns";
import http from "http";
import https from "https";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const app = express();
const PORT = 3000;

// Limite alto pois /api/agents/chat e /api/compliance-check aceitam imagens em base64 (~1.37x o tamanho original)
app.use(express.json({ limit: "15mb" }));

// Cliente Supabase do servidor, usado pelas ferramentas dos Agentes IA (memória/RAG + ações) para
// ler/escrever dados reais do operador. Mesma anon key pública usada no client: as RLS policies
// do projeto já são públicas (sistema single-operator), então não há escalonamento de privilégio aqui.
const supabaseServerUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServerAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServer = supabaseServerUrl && supabaseServerAnonKey
  ? createClient(supabaseServerUrl, supabaseServerAnonKey)
  : null;

// AUTH: senha do operador validada no servidor contra hash em variável de ambiente
// (nunca fica em texto plano no bundle do client, diferente da versão anterior).
function getOperatorPasswordHash(operator: string): string | undefined {
  return process.env[`AUTH_HASH_${operator.toUpperCase()}`];
}

function verifyOperatorPassword(password: string, storedHash: string): boolean {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;
  const derivedKey = crypto.scryptSync(password, salt, 64);
  const storedKey = Buffer.from(hashHex, "hex");
  return derivedKey.length === storedKey.length && crypto.timingSafeEqual(derivedKey, storedKey);
}

app.post("/api/auth/login", (req, res) => {
  const { operator, password } = req.body;
  if (!operator || !password) {
    return res.status(400).json({ success: false, error: "Operador e senha são obrigatórios." });
  }

  const storedHash = getOperatorPasswordHash(operator);
  if (!storedHash || !verifyOperatorPassword(password, storedHash)) {
    return res.status(401).json({ success: false, error: "Senha incorreta." });
  }

  return res.json({ success: true, operator });
});

// Lazy-initialized Gemini Client with strict support for new "AQ" keys and classic "AIzaSy" keys
function getGemini(customKey?: string): GoogleGenAI | null {
  let key = customKey || process.env.GEMINI_API_KEY || process.env.VUSK_GEMINI_KEY;
  if (!key) {
    console.warn("GEMINI_API_KEY / VUSK_GEMINI_KEY environment variable is not defined. Falling back to heuristic/simulation scoring.");
    return null;
  }

  // Sanitize the key: strip surrounding whitespace and common copy-paste errors (like quotes added in Vercel configuration)
  key = key.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Explicitly validate both key formats to reassure user compatibility
  const isClassicKey = key.startsWith("AIzaSy");
  const isNewAQKey = key.startsWith("AQ") || key.startsWith("AQ.");

  if (isNewAQKey) {
    console.log(`[Gemini API Key] Successfully processed and validated modern AQ-prefixed Gemini key (Length: ${key.length}).`);
  } else if (isClassicKey) {
    console.log(`[Gemini API Key] Successfully processed and validated classic AIza-prefixed Gemini key (Length: ${key.length}).`);
  } else {
    console.warn(`[Gemini API Key Warning] Key format does not match regular signature prefixes (AIzaSy or AQ). Proceeding anyway (Length: ${key.length}).`);
  }

  try {
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize Gemini Client with provided key:", err);
    return null;
  }
}

// Extract custom key dynamically from headers or body
function getGeminiFromReq(req: express.Request): GoogleGenAI | null {
  const customKey = (req.headers["x-gemini-key"] as string) || (req.body?.customApiKey as string);
  return getGemini(customKey);
}

// Retenta automaticamente quando o Gemini responde 503/UNAVAILABLE (pico de demanda no modelo,
// erro transitório e comum, não relacionado à nossa requisição) antes de propagar o erro.
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2, baseDelayMs = 900): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const isOverloaded = String(err?.message || "").includes("UNAVAILABLE") || String(err?.message || "").includes('"code":503');
      if (!isOverloaded || attempt === maxRetries) throw err;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
}

// Trackers Catalog (Including checkout trackers, gateways, AI hosts, and keyword expressions)
const TRACKERS = [
  { id: "utmify", name: "UTMify Track", domain: "cdn.utmify.com.br", market: "BR", group: "tracker" },
  { id: "hotmart", name: "Hotmart", domain: "hotmart.com", market: "BR", group: "tracker" },
  { id: "kiwify", name: "Kiwify", domain: "kiwify.com.br", market: "BR", group: "tracker" },
  { id: "eduzz", name: "Eduzz", domain: "eduzz.com", market: "BR", group: "tracker" },
  { id: "monetizze", name: "Monetizze", domain: "monetizze.com.br", market: "BR", group: "tracker" },
  { id: "kirvano", name: "Kirvano", domain: "kirvano.com", market: "BR", group: "tracker" },
  { id: "cakto", name: "Cakto", domain: "cakto.com", market: "BR", group: "tracker" },
  { id: "greenn", name: "Greenn", domain: "greenn.com.br", market: "BR", group: "tracker" },
  { id: "lastlink", name: "Lastlink", domain: "lastlink.com", market: "BR", group: "tracker" },
  { id: "braip", name: "Braip", domain: "braip.com", market: "BR", group: "tracker" },
  { id: "perfectpay", name: "Perfectpay", domain: "perfectpay.com.br", market: "BR", group: "tracker" },
  { id: "ticto", name: "Ticto", domain: "ticto.app", market: "BR", group: "tracker" },
  { id: "ampliopay", name: "Ampliopay", domain: "ampliopay.com", market: "BR", group: "tracker" },
  { id: "ggcheckout", name: "GGCheckout", domain: "ggcheckout.com", market: "BR", group: "tracker" },
  { id: "pepper", name: "Pepper", domain: "pepper.com.br", market: "BR", group: "tracker" },
  { id: "clickbank", name: "ClickBank", domain: "clickbank.net", market: "Gringa", group: "tracker" },
  { id: "digistore24", name: "Digistore24", domain: "digistore24.com", market: "Gringa", group: "tracker" },
  { id: "warriorplus", name: "WarriorPlus", domain: "warriorplus.com", market: "Gringa", group: "tracker" },
  { id: "jvzoo", name: "JVZoo", domain: "jvzoo.com", market: "Gringa", group: "tracker" },
  { id: "cartpanda", name: "CartPanda", domain: "cartpanda.com", market: "BR", group: "tracker" },
  { id: "yampi", name: "Yampi", domain: "yampi.io", market: "BR", group: "tracker" },
  { id: "doppus", name: "Doppus", domain: "doppus.com", market: "BR", group: "tracker" },
  { id: "kiwipay", name: "KiwiPay", domain: "kiwipay.com.br", market: "BR", group: "tracker" },

  // --- GATEWAYS ---
  { id: "lowify", name: "Lowify", domain: "lowify.com.br", market: "BR", group: "gateway" },
  { id: "buckpay", name: "Buckpay", domain: "buckpay.com.br", market: "BR", group: "gateway" },
  { id: "wiapy", name: "Wiapy", domain: "wiapy.co", market: "BR", group: "gateway" },

  // --- AI PAGES ---
  { id: "xpages", name: "XPages", domain: "xpages.co", market: "BR", group: "ai_page" },
  { id: "vercel", name: "Vercel Sites", domain: "vercel.app", market: "BR", group: "ai_page" },
  { id: "lovable", name: "Lovable IA", domain: "lovable.app", market: "BR", group: "ai_page" },
  { id: "bolthost", name: "Bolt Host IA", domain: "bolt.host", market: "BR", group: "ai_page" },
  { id: "replit", name: "Replit Space", domain: "replit.app", market: "BR", group: "ai_page" },

  // --- KEYWORDS ---
  { id: "keyword_pdf_wa", name: "KW: R$10 PDF zap", domain: "por apenas R$10 PDF whatsapp", market: "BR", group: "keyword" },
  { id: "keyword_pdf_10", name: "KW: pdf apenas 10", domain: "pdf apenas 10", market: "BR", group: "keyword" },
  { id: "keyword_curso_27", name: "KW: curso apenas 27", domain: "curso apenas 27", market: "BR", group: "keyword" },
  { id: "keyword_receba_wa", name: "KW: Receba WhatsApp", domain: "Receba tudo pelo WhatsApp", market: "BR", group: "keyword" }
];

// Rich set of historic actual offers for high-fidelity fallback execution
const SIMULATED_OFFERS_DATABASE: Record<string, Array<{
  url: string;
  title: string;
  nicho: string;
  type: string;
  score: number;
  rank: string;
}>> = {
  utmify: [
    { url: "https://metodoratodecomisao.com", title: "Rato de Comissão - Método Secreto de Comissões Rápidas", nicho: "renda_extra", type: "VSL", score: 15, rank: "S" },
    { url: "https://protocolofigadogordo.com", title: "Protocolo Fígado Saudável: Reverta Acúmulo de Gordura Naturalmente com Chás", nicho: "emagrecimento", type: "QUIZ", score: 14, rank: "S" },
    { url: "https://desafiodas3semanas.online", title: "Desafio 21 Dias Emagrecimento Extra - Guia de Nutrição Termogênica", nicho: "emagrecimento", type: "LOW_TICKET", score: 13, rank: "S" },
    { url: "https://rendarapitasegredo.com", title: "Lucrando com Inteligência Artificial no Celular - Método Prático", nicho: "renda_extra", type: "VSL", score: 12, rank: "A" }
  ],
  hotmart: [
    { url: "https://formulanegocioonline.com", title: "Fórmula Negócio Online - O Maior Treinamento do Mercado", nicho: "renda_extra", type: "VSL", score: 14, rank: "S" },
    { url: "https://segredosdaaudiencia.com.br", title: "Mentoria Segredos da Audiência - Tráfego Orgânico e Pago", nicho: "renda_extra", type: "DIRECT_SALES", score: 13, rank: "S" },
    { url: "https://viverdeblog.com", title: "Como Criar um Blog de Sucesso de Alto Giro com SEO Inteligente", nicho: "renda_extra", type: "LOW_TICKET", score: 12, rank: "S" }
  ],
  kiwify: [
    { url: "https://tiagoorganico.com.br", title: "Protocolo Vitalidade Verde Completo com Tiago Orgânico", nicho: "saude_bem_estar", type: "VSL", score: 12, rank: "A" },
    { url: "https://financeone.com.br", title: "O Segredo do Investimento Acelerado - Portal Finance One", nicho: "financas", type: "QUIZ", score: 11, rank: "A" },
    { url: "https://mepoupe.com", title: "Desfudendo suas Finanças Pessoais com Canal Me Poupe", nicho: "financas", type: "LOW_TICKET", score: 13, rank: "S" }
  ],
  eduzz: [
    { url: "https://www.infomoney.com.br", title: "InfoMoney - Carteira Recomendada e Estratégias Secretas", nicho: "financas", type: "DIRECT_SALES", score: 11, rank: "A" },
    { url: "https://jovensdenegocios.com", title: "Jovens de Negócios PLR Academy: Como faturar na internet", nicho: "renda_extra", type: "VSL", score: 12, rank: "A" }
  ],
  monetizze: [
    { url: "https://www.natura.com.br", title: "Seja um Consultor de Alta Perfomance e Monte seu Império Natura", nicho: "beleza", type: "LOW_TICKET", score: 11, rank: "A" },
    { url: "https://www.belezanaweb.com.br", title: "Beleza na Web - Cosméticos Importados de Alta Escala", nicho: "beleza", type: "DIRECT_SALES", score: 10, rank: "B" }
  ],
  kirvano: [
    { url: "https://viverdeblog.com", title: "Desafio Cashback Organico - Venda todos os dias na internet", nicho: "renda_extra", type: "VSL", score: 11, rank: "A" },
    { url: "https://formulanegocioonline.com", title: "Plano de Marketing Digital Acelerado e Funil de Vendas", nicho: "renda_extra", type: "LOW_TICKET", score: 14, rank: "S" }
  ],
  cakto: [
    { url: "https://exame.com", title: "Exame Pro - Planejamento Estratégico e Finanças Corporativas", nicho: "financas", type: "DIRECT_SALES", score: 11, rank: "A" },
    { url: "https://www.tuasaude.com", title: "Tua Saúde Portal - Como Emagrecer Saudável com Alimentos Naturais", nicho: "emagrecimento", type: "VSL", score: 12, rank: "S" }
  ],
  greenn: [
    { url: "https://empiricus.com.br", title: "Estratégia Dividendos Secretos de Renda Passiva - Empiricus", nicho: "financas", type: "LOW_TICKET", score: 13, rank: "S" }
  ],
  lastlink: [
    { url: "https://segredosdaaudiencia.com.br", title: "Clube da Audiência Exclusiva com Alex Vargas e Tiago", nicho: "renda_extra", type: "DIRECT_SALES", score: 12, rank: "S" }
  ],
  braip: [
    { url: "https://www.minhavida.com.br", title: "Minha Vida Saudável - Guia Completo Alimentar e Fitoterápico", nicho: "saude_bem_estar", type: "QUIZ", score: 12, rank: "S" },
    { url: "https://www.tuasaude.com", title: "Tua Saúde Alimentação Inteligente - Guia Prático da Nutrição", nicho: "emagrecimento", type: "DIRECT_SALES", score: 11, rank: "A" }
  ],
  perfectpay: [
    { url: "https://mepoupe.com", title: "Protocolo Finanças do Zero: Defina sua Renda em Poucos Passos", nicho: "financas", type: "LOW_TICKET", score: 12, rank: "A" }
  ],
  ticto: [
    { url: "https://formulanegocioonline.com", title: "Renda Passiva Imediata: Guia Prático do Alex Vargas", nicho: "renda_extra", type: "LOW_TICKET", score: 14, rank: "S" }
  ],
  ampliopay: [
    { url: "https://exame.com", title: "Curso de Negócios e Inglês Corporativo para Alta Gestão", nicho: "outros", type: "DIRECT_SALES", score: 10, rank: "A" }
  ],
  ggcheckout: [
    { url: "https://segredosdaaudiencia.com.br", title: "Tráfego Acelerado para Dropshipping e E-commerce sem Estoque", nicho: "renda_extra", type: "VSL", score: 11, rank: "A" }
  ],
  pepper: [
    { url: "https://www.belezanaweb.com.br", title: "Almanaque da Beleza Masculina e Cosméticos High End", nicho: "beleza", type: "LOW_TICKET", score: 11, rank: "A" }
  ],
  clickbank: [
    { url: "https://www.clickbank.com", title: "ClickBank Marketplace - Evergreen International Affiliate Program", nicho: "renda_extra", type: "VSL", score: 13, rank: "S" },
    { url: "https://www.digistore24.com", title: "Digistore24 Partner Global Network Integration Page", nicho: "renda_extra", type: "DIRECT_SALES", score: 12, rank: "S" }
  ],
  digistore24: [
    { url: "https://www.digistore24.com", title: "The Ultimate Guide to Digital Marketplace Success on Digistore24", nicho: "renda_extra", type: "DIRECT_SALES", score: 12, rank: "S" }
  ],
  warriorplus: [
    { url: "https://www.clickbank.com", title: "Digital Traffic Storm Systems & Funnels Strategy Guide", nicho: "renda_extra", type: "DIRECT_SALES", score: 11, rank: "B" }
  ],
  jvzoo: [
    { url: "https://www.digistore24.com", title: "Funnel Builder Secret Guide - Optimize Checkout Converters", nicho: "renda_extra", type: "VSL", score: 11, rank: "S" }
  ],
  cartpanda: [
    { url: "https://www.belezanaweb.com.br", title: "Beleza Pro - Guia de Maquiagem e Cosméticos", nicho: "beleza", type: "QUIZ", score: 10, rank: "A" }
  ],
  yampi: [
    { url: "https://www.natura.com.br", title: "Consultoria Premium Natura e Checkout de Alta Performance", nicho: "beleza", type: "VSL", score: 11, rank: "B" }
  ],
  doppus: [
    { url: "https://financeone.com.br", title: "Portal de Educação Financeira Integrada - Planejamento Familiar", nicho: "financas", type: "QUIZ", score: 10, rank: "B" }
  ],
  kiwipay: [
    { url: "https://mepoupe.com", title: "Trabalho Remoto e Planejamento Tributário Simplificado", nicho: "financas", type: "LOW_TICKET", score: 11, rank: "C" }
  ],
  lowify: [
    { url: "https://receitadesecarrapido.com", title: "Protocolo Secar em 30 Dias - Checkout Exclusivo Lowify", nicho: "emagrecimento", type: "LOW_TICKET", score: 14, rank: "S" },
    { url: "https://guiadefinitivorun.com", title: "Guia da Hipertrofia Acelerada - Método Lowify", nicho: "saude_bem_estar", type: "LOW_TICKET", score: 12, rank: "A" }
  ],
  buckpay: [
    { url: "https://ganhedigitando-br.site", title: "Avaliador Recompensado Oficial - Receba via Buckpay", nicho: "renda_extra", type: "QUIZ", score: 15, rank: "S" },
    { url: "https://rejuvenescimento-natural.com", title: "Manual Jovialidade Instantânea - Sistema Buckpay", nicho: "beleza", type: "LOW_TICKET", score: 12, rank: "A" }
  ],
  wiapy: [
    { url: "https://comochegaraotopo.online", title: "Formula Monte seu Negocio Digital - Processado Wiapy", nicho: "renda_extra", type: "VSL", score: 13, rank: "S" },
    { url: "https://libido-turbinada.site", title: "Protocolo Ereção Máxima de 21 Dias - Wiapy Checkout", nicho: "saude_masculina", type: "DIRECT_SALES", score: 12, rank: "A" }
  ],
  xpages: [
    { url: "https://emagreca-com-ia.xpages.co", title: "Personal Trainer de Inteligência Artificial Inteligente", nicho: "emagrecimento", type: "VSL", score: 14, rank: "S" },
    { url: "https://lucrando-automatizado.xpages.co", title: "Método Renda Online com Robôs de Conversação Inteligentes", nicho: "renda_extra", type: "QUIZ", score: 13, rank: "S" }
  ],
  vercel: [
    { url: "https://desafio-bumbum-na-nuca.vercel.app", title: "Bumbum Ativo: Projeto 4 Semanas de Tonificação Rápida", nicho: "beleza", type: "DIRECT_SALES", score: 13, rank: "S" },
    { url: "https://calculadora-investimentos-lucro.vercel.app", title: "Simulador de Dividendos Críticos - Alcance Liberdade", nicho: "financas", type: "QUIZ", score: 12, rank: "A" }
  ],
  lovable: [
    { url: "https://metodo-virilidade-plena.lovable.app", title: "Segredo da Testosterona Elevada aos 50 Anos", nicho: "saude_masculina", type: "VSL", score: 14, rank: "S" },
    { url: "https://cronograma-capilar-ia.lovable.app", title: "Cronograma Capilar Inteligente - Guia para Fios Brilhantes", nicho: "beleza", type: "LOW_TICKET", score: 12, rank: "A" }
  ],
  bolthost: [
    { url: "https://mentoria-sinais-vip.bolt.host", title: "Sala de Sinais de Criptografia Automática via Telegram", nicho: "cripto", type: "VSL", score: 15, rank: "S" },
    { url: "https://guia-anti-ansiedade.bolt.host", title: "Respire Calmo: Segredos para Eliminar Crises de Ansiedade", nicho: "saude_bem_estar", type: "LOW_TICKET", score: 13, rank: "A" }
  ],
  replit: [
    { url: "https://metodo-espanhol-acelerado.replit.app", title: "Fluência em Espanhol com Diálogos Reais com IA", nicho: "outros", type: "DIRECT_SALES", score: 12, rank: "A" }
  ],
  keyword_pdf_wa: [
    { url: "https://detoxsecreto.site", title: "Aprenda como emagrecer por apenas R$10 obtendo o PDF direto no Whatsapp!", nicho: "emagrecimento", type: "LOW_TICKET", score: 14, rank: "S" }
  ],
  keyword_pdf_10: [
    { url: "https://metodorendaautomatica.online", title: "Esquema de revenda de canais - Adquira o PDF apenas 10 reais", nicho: "renda_extra", type: "LOW_TICKET", score: 12, rank: "A" }
  ],
  keyword_curso_27: [
    { url: "https://confeitaria-lucrativa-passo27.com", title: "Curso Completo de Sobremesas de Pote - Curso apenas 27 reais hoje", nicho: "outros", type: "LOW_TICKET", score: 11, rank: "A" }
  ],
  keyword_receba_wa: [
    { url: "https://protocolofibrasvivas.online", title: "Suplemento Termogênico Especial: Faça seu pedido e receba tudo pelo WhatsApp!", nicho: "saude_bem_estar", type: "DIRECT_SALES", score: 13, rank: "S" }
  ]
};

// Heuristic Category/Type Decider (Robust CPU implementation)
function evaluateHeuristic(title: string, url: string, platform: string): any {
  const normTitle = (title || "").toLowerCase();
  const normUrl = (url || "").toLowerCase();
  const fullText = `${normTitle} ${normUrl}`;

  let nicho = "outros";
  if (fullText.includes("emagrec") || fullText.includes("perder g") || fullText.includes("gordura") || fullText.includes("diet") || fullText.includes("detox") || fullText.includes("weight") || fullText.includes("keto") || fullText.includes("sono")) {
    nicho = "emagrecimento";
  } else if (fullText.includes("masculin") || fullText.includes("testosteron") || fullText.includes("ereç") || fullText.includes("macho") || fullText.includes("testo")) {
    nicho = "saude_masculina";
  } else if (fullText.includes("tireoid") || fullText.includes("ansiedade") || fullText.includes("saude") || fullText.includes("calm") || fullText.includes("sono") || fullText.includes("dor") || fullText.includes("medicin")) {
    nicho = "saude_bem_estar";
  } else if (fullText.includes("renda") || fullText.includes("lucr") || fullText.includes("afiliad") || fullText.includes("ganha") || fullText.includes("vender") || fullText.includes("money") || fullText.includes("plr") || fullText.includes("dropship") || fullText.includes("traffic") || fullText.includes("cashback") || fullText.includes("vendas")) {
    nicho = "renda_extra";
  } else if (fullText.includes("reconquistar") || fullText.includes("espos") || fullText.includes("casament") || fullText.includes("sex") || fullText.includes("amor") || fullText.includes("namor") || fullText.includes("ex-")) {
    nicho = "relacionamento";
  } else if (fullText.includes("invest") || fullText.includes("finan") || fullText.includes("dividend") || fullText.includes("milhas") || fullText.includes("dinheir") || fullText.includes("bolsa")) {
    nicho = "financas";
  } else if (fullText.includes("cripto") || fullText.includes("crypto") || fullText.includes("bitcoin") || fullText.includes("btc") || fullText.includes("sinais")) {
    nicho = "cripto";
  } else if (fullText.includes("beleza") || fullText.includes("pele") || fullText.includes("cabec") || fullText.includes("tonico") || fullText.includes("capilar") || fullText.includes("bumbum") || fullText.includes("estilo") || fullText.includes("rejuve")) {
    nicho = "beleza";
  }

  let type = "DIRECT_SALES";
  if (fullText.includes("quiz") || fullText.includes("teste") || fullText.includes("pergunta")) {
    type = "QUIZ";
  } else if (fullText.includes("vsl") || fullText.includes("video") || fullText.includes("metodo") || fullText.includes("segredo") || fullText.includes("assistir")) {
    type = "VSL";
  } else if (fullText.includes("ebook") || fullText.includes("manual") || fullText.includes("livro") || fullText.includes("guia") || fullText.includes("baixo-ticket") || fullText.includes("plr")) {
    type = "LOW_TICKET";
  }

  // Calculate score between 4 and 14
  let score = 5;
  if (type === "VSL") score += 3;
  if (type === "QUIZ") score += 4;
  if (nicho === "emagrecimento" || nicho === "renda_extra" || nicho === "saude_masculina") score += 3;
  if (normUrl.includes(".com.br") || normUrl.includes(".com")) score += 2;
  if (normTitle.length > 25) score += 2;

  if (score > 15) score = 15;
  if (score < 4) score = 4;

  let rank: "S" | "A" | "B" | "C" = "C";
  if (score >= 12) rank = "S";
  else if (score >= 8) rank = "A";
  else if (score >= 5) rank = "B";

  return { nicho, type, score, rank };
}

function isValidOffer(title: string, url: string, domain: string, trackerDomain: string): { valid: boolean; reason?: string } {
  const normTitle = (title || "").toLowerCase().trim();
  const normUrl = (url || "").toLowerCase().trim();
  const normDomain = (domain || "").toLowerCase().trim();
  const normTracker = (trackerDomain || "").toLowerCase().trim();

  // 1. Exclude direct checkout endpoints as sales landing pages
  const checkoutSubdomains = [
    "pay.", "checkout.", "secure.", "carrinho.", "payment.", "billing.", 
    "purchase.", "order.", "gateway.", "adquirir.", "comprar.", "pagamento.",
    "prod.", "sandbox.", "api.", "app.", "portal.", "dashboard.", "office.",
    "admin.", "manager.", "login.", "suporte.", "ajuda.", "help.", "support.",
    "blog.", "news.", "docs.", "vendas.", "cobranca.", "status."
  ];

  const isDirectCheckoutOrSub = checkoutSubdomains.some(sub => 
    normDomain.startsWith(sub) || 
    normUrl.includes("/pay/") || 
    normUrl.includes("/checkout/") || 
    normUrl.includes("/comprar/") || 
    normUrl.includes("/pagamento/") ||
    normUrl.includes("/billing/")
  );

  // Exclude if it's the tracker domain itself or a subdomain of the tracker (e.g. blog.eduzz.com)
  const isAiPageHost = ["vercel.app", "xpages.co", "lovable.app", "bolt.host", "replit.app"].includes(normTracker);
  const isPlatformSubdomain = normDomain === normTracker || 
                              (!isAiPageHost && normDomain.endsWith("." + normTracker)) || 
                              normDomain === "www." + normTracker ||
                              // Sister domain checks (e.g., hotmart.com vs hotmart.com.br, eduzz.com vs eduzz.co)
                              normDomain.includes("hotmart") && normTracker.includes("hotmart") && normDomain !== "hotmart" && !normDomain.includes("-") ||
                              normDomain.includes("eduzz") && normTracker.includes("eduzz") && normDomain !== "eduzz" && !normDomain.includes("-") ||
                              normDomain.includes("kiwify") && normTracker.includes("kiwify") && normDomain !== "kiwify" && !normDomain.includes("-");

  if (isDirectCheckoutOrSub || isPlatformSubdomain) {
    return { valid: false, reason: "Direct raw checkout, platform domain, or official blog/support/system subdomain rather than third-party marketer landing page" };
  }

  // 2. Reject non-working, technical error pages, placeholders or suspended layouts
  const errorWords = [
    "404", "not found", "error 403", "forbidden", "access denied", 
    "index of /", "apache", "nginx", "welcome to nginx", "centos",
    "site não encontrado", "página não encontrada", "em construção", 
    "error 502", "bad gateway", "error 522", "error 520", "suspended",
    "conta suspensa", "domain parking", "registro.br", "godaddy", "hostgator",
    "under construction", "site suspenso", "test page", "iis windows",
    "cpanel", "whm", "plesk", "default page", "erro no banco", "database error",
    "wordpress instalado", "instalação do wordpress", "this page is parked",
    "site em manutenção", "maintenance mode", "error 404", "não encontrado",
    "coming soon", "site em breve", "site offline", "erro temporário", "site desativado"
  ];

  if (errorWords.some(word => normTitle.includes(word) || normUrl.includes(word))) {
    return { valid: false, reason: "Inoperable, technical error page, host placeholder, or server indicator" };
  }

  // 3. Reject administrative, login, backend or static resource pages
  const adminKeys = [
    "/admin", "/wp-admin", "/dashboard", "/login", "/signup", 
    "/register", "/api/", "/localhost", "test.com", "dev.", "stg.", "sandbox.",
    "/wp-includes", "/wp-content/plugins", "/wp-json", "/feed", "/rss", "/xmlrpc"
  ];

  if (adminKeys.some(key => normUrl.includes(key) || normDomain.includes(key))) {
    return { valid: false, reason: "Internal dashboard, admin endpoint, wordpress system path, or sandbox" };
  }

  // 4. Exclude static institutional, regulatory or system helper paths (not actual VSL/Quiz models)
  const policyAndContactKeys = [
    "/politica-de-privacidade", "/privacy-policy", "/termos-de-uso", 
    "/terms-of-service", "/termos-e-condicoes", "/terms-and-conditions",
    "/contato", "/contact", "/fale-conosco", "/suporte", "/ajuda", 
    "/help", "/support", "/blog", "/noticias", "/noticia", "/faq", 
    "/quem-somos", "/sobre-nos", "/about", "/about-us", "/politica", "/termos"
  ];

  if (policyAndContactKeys.some(key => normUrl.includes(key))) {
    return { valid: false, reason: "Legal policy page, terms, contact form, blog structure, or institutional boilerplate" };
  }

  // 5. Exclude empty or default initial server titles or domain parking titles
  if (
    normTitle === "" || 
    normTitle === "domínio registrado" || 
    normTitle === "home" || 
    normTitle === "index" || 
    normTitle === "site" ||
    normTitle.includes("just another wordpress site") ||
    normTitle === "página inicial" ||
    normTitle.includes("site oficial") && normTitle.length < 15 || // very generic placeholder titles
    normTitle.includes("comprar") && normTitle.length < 10
  ) {
    return { valid: false, reason: "Empty, unconfigured default site title, or domain parking title" };
  }

  // 6. Exclude static document/raw library attachments
  if (
    normUrl.endsWith(".png") || 
    normUrl.endsWith(".jpg") || 
    normUrl.endsWith(".jpeg") || 
    normUrl.endsWith(".gif") || 
    normUrl.endsWith(".svg") || 
    normUrl.endsWith(".pdf") || 
    normUrl.endsWith(".css") || 
    normUrl.endsWith(".js") ||
    normUrl.endsWith(".zip") ||
    normUrl.endsWith(".rar")
  ) {
    return { valid: false, reason: "Static file asset or downloadable package rather than active marketing offer landing page" };
  }

  return { valid: true };
}

// Check if a domain has active DNS (not expired/NXDOMAIN)
function isDomainResolvable(domain: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0];
      const timer = setTimeout(() => {
        resolve(false);
      }, 1500); // max 1.5s timeout

      dns.lookup(cleanDomain, (err) => {
        clearTimeout(timer);
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

// Check with actual rapid HTTP handshakes if a link is responding to web browsers
function isUrlReallyActive(targetUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const lib = isHttps ? https : http;

      const options = {
        method: "GET",
        timeout: 1800,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
        }
      };

      const req = lib.request(parsedUrl, options, (res) => {
        const code = res.statusCode || 0;
        // Successful response is online (including redirects or standard cloudflare blocks is still resolvable & up)
        if (code >= 200 && code < 400) {
          resolve(true);
        } else if (code === 403 || code === 401) {
          // Sometimes bot protection intercepts our servers but the page is fully live for human browsers
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on("error", () => {
        resolve(false);
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    } catch {
      resolve(false);
    }
  });
}

// Master dual-layer health verification
async function testUrlStatus(targetUrl: string): Promise<boolean> {
  try {
    const parsed = new URL(targetUrl);
    const dnsActive = await isDomainResolvable(parsed.hostname);
    if (!dnsActive) return false;

    const httpActive = await isUrlReallyActive(targetUrl);
    return httpActive;
  } catch {
    return false;
  }
}

// 1. GET Trackers Catalog
app.get("/api/trackers", (req, res) => {
  res.json({ success: true, trackers: TRACKERS });
});

// FACEBOOK ADS OAUTH & API CONFIG & ROUTING
const FB_APP_ID = process.env.FACEBOOK_APP_ID || "1297847892562716";
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const FB_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/auth/facebook/callback` : "https://vuskoperation.netlify.app/auth/facebook/callback");

// GET /api/facebook/exchange-code
// Recebe o code do React callback handler e troca pelos tokens
app.get("/api/facebook/exchange-code", async (req, res) => {
  const code = req.query.code as string | undefined;

  if (!code) {
    return res.status(400).json({ success: false, error: "code obrigatório" });
  }

  const FB_APP_ID = process.env.FACEBOOK_APP_ID || "1297847892562716";
  const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
  const FB_REDIRECT_URI = (req.query.redirect_uri as string | undefined) ||
    process.env.FACEBOOK_REDIRECT_URI ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/auth/facebook/callback` : "https://vuskoperation.netlify.app/auth/facebook/callback");

  try {
    // Passo 1: Trocar code por token curto
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${FB_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as any;

    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Erro ao obter token curto");
    }

    const shortToken = tokenData.access_token;

    // Passo 2: Trocar token curto por token longo (60 dias)
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&fb_exchange_token=${shortToken}`;

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = (await longTokenRes.json()) as any;

    if (longTokenData.error) {
      throw new Error(longTokenData.error.message || "Erro ao obter token longo");
    }

    const longToken = longTokenData.access_token;
    const expiresIn = longTokenData.expires_in || 5184000;
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Passo 3: Buscar dados do usuário
    const userRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longToken}`
    );
    const userData = (await userRes.json()) as any;

    return res.json({
      success: true,
      accessToken: longToken,
      expiresAt,
      userId: userData.id || "",
      userName: userData.name || ""
    });

  } catch (err: any) {
    console.error("Facebook OAuth exchange error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Erro interno ao processar autenticação"
    });
  }
});

app.get("/api/facebook/ad-accounts", async (req, res) => {
  const accessToken = req.query.accessToken as string | undefined;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: "accessToken obrigatório" });
  }
  try {
    const url = `https://graph.facebook.com/v19.0/me/adaccounts?` +
      `fields=id,name,account_status,currency,timezone_name&` +
      `access_token=${accessToken}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;
    if (data.error) throw new Error(data.error.message);
    return res.json({ success: true, accounts: data.data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/facebook/token-info", async (req, res) => {
  const accessToken = req.query.accessToken as string | undefined;
  if (!accessToken) {
    return res.status(400).json({ success: false, error: "accessToken obrigatório" });
  }
  try {
    const url = `https://graph.facebook.com/v19.0/debug_token?` +
      `input_token=${accessToken}&` +
      `access_token=${FB_APP_ID}|${FB_APP_SECRET}`;
    const response = await fetch(url);
    const data = (await response.json()) as any;
    if (data.error) throw new Error(data.error.message);
    return res.json({ success: true, tokenInfo: data.data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// A3.1: busca real na Ad Library (Graph API /ads_archive). Reaproveita o mesmo accessToken
// já obtido pelo login Facebook existente (useFacebookAuth) — não exige permissão extra
// como ads_read para anúncios comerciais (só anúncios de política/eleição exigem verificação de ID).
app.get("/api/facebook/ads-library-search", async (req, res) => {
  const accessToken = req.query.accessToken as string | undefined;
  const searchTerms = req.query.searchTerms as string | undefined;
  const countries = (req.query.countries as string | undefined) || "BR";

  if (!accessToken) {
    return res.status(400).json({ success: false, error: "Conecte sua conta do Facebook primeiro para buscar na Ad Library." });
  }
  if (!searchTerms) {
    return res.status(400).json({ success: false, error: "searchTerms obrigatório." });
  }

  try {
    const countriesArray = countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    const fields = "ad_creative_bodies,ad_creative_link_titles,page_name,ad_delivery_start_time,ad_snapshot_url,publisher_platforms";
    const url = `https://graph.facebook.com/v19.0/ads_archive?` +
      `search_terms=${encodeURIComponent(searchTerms)}&` +
      `ad_reached_countries=${encodeURIComponent(JSON.stringify(countriesArray))}&` +
      `fields=${fields}&limit=20&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = (await response.json()) as any;
    if (data.error) throw new Error(data.error.message);
    return res.json({ success: true, ads: data.data || [] });
  } catch (err: any) {
    console.error("Ad Library search failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Ferramentas (function calling) que qualquer Agente IA pode usar: consultas de leitura sobre
// criativos/ofertas/playbooks reais do operador (memória/RAG) e ações que alteram dados (A4.1/A4.2).
const AGENT_TOOLS: any[] = [
  {
    name: "buscar_criativos",
    description: "Busca criativos salvos no Cofre de Criativos do operador, opcionalmente filtrando por nicho ou apenas vencedores.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        nicho: { type: Type.STRING, description: "Filtra por nicho (ex: emagrecimento, financas). Omita para todos." },
        apenasVencedores: { type: Type.BOOLEAN, description: "Se true, retorna só criativos marcados como vencedores." }
      }
    }
  },
  {
    name: "buscar_ofertas",
    description: "Busca ofertas minadas (offer_hits), opcionalmente filtrando por rank (S/A/B/C) ou nicho.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        rank: { type: Type.STRING, description: "Filtra por rank: S, A, B ou C." },
        nicho: { type: Type.STRING, description: "Filtra por nicho." },
        limite: { type: Type.NUMBER, description: "Quantidade máxima de resultados (padrão 10, máximo 20)." }
      }
    }
  },
  {
    name: "buscar_playbooks",
    description: "Busca playbooks (procedimentos operacionais) salvos pelo operador, opcionalmente filtrando por termo no título.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        busca: { type: Type.STRING, description: "Termo de busca no título do playbook. Omita para listar os mais recentes." }
      }
    }
  },
  {
    name: "salvar_playbook",
    description: "Cria um novo playbook ou adiciona um passo a um playbook existente com o mesmo título. Use quando o operador pedir para guardar/salvar um ângulo de copy, processo ou aprendizado.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        titulo: { type: Type.STRING, description: "Título do playbook." },
        conteudo: { type: Type.STRING, description: "Texto do passo/conteúdo a salvar." }
      },
      required: ["titulo", "conteudo"]
    }
  },
  {
    name: "marcar_criativo_vencedor",
    description: "Marca ou desmarca, pelo nome do arquivo, um criativo do Cofre de Criativos como vencedor.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        nomeCriativo: { type: Type.STRING, description: "Nome (ou parte do nome) do arquivo do criativo." },
        vencedor: { type: Type.BOOLEAN, description: "true para marcar como vencedor, false para desmarcar." }
      },
      required: ["nomeCriativo", "vencedor"]
    }
  }
];

const AGENT_TOOLS_SYSTEM_HINT = `\n\n---\nVocê tem ferramentas para consultar dados reais do operador (buscar_criativos, buscar_ofertas, buscar_playbooks) e para executar ações (salvar_playbook, marcar_criativo_vencedor). Use as ferramentas de busca sempre que precisar de dados concretos em vez de inventar. Use as ferramentas de ação somente quando o operador pedir explicitamente para guardar/salvar algo ou marcar um criativo como vencedor, e confirme o resultado em texto depois.`;

async function executeAgentTool(name: string, args: Record<string, any>): Promise<any> {
  if (!supabaseServer) {
    return { error: "Supabase não está configurado no servidor. Não é possível acessar dados reais." };
  }

  try {
    switch (name) {
      case "buscar_criativos": {
        let query = supabaseServer
          .from("creatives")
          .select("name, nicho, tags, is_winner, created_at")
          .order("created_at", { ascending: false })
          .limit(15);
        if (args.nicho) query = query.ilike("nicho", `%${args.nicho}%`);
        if (args.apenasVencedores) query = query.eq("is_winner", true);
        const { data, error } = await query;
        if (error) throw error;
        return { criativos: data || [] };
      }
      case "buscar_ofertas": {
        const limite = Math.min(Number(args.limite) || 10, 20);
        let query = supabaseServer
          .from("offer_hits")
          .select("title, domain, nicho, type, rank, score, market")
          .order("created_at", { ascending: false })
          .limit(limite);
        if (args.rank) query = query.eq("rank", String(args.rank).toUpperCase());
        if (args.nicho) query = query.ilike("nicho", `%${args.nicho}%`);
        const { data, error } = await query;
        if (error) throw error;
        return { ofertas: data || [] };
      }
      case "buscar_playbooks": {
        let query = supabaseServer
          .from("playbooks")
          .select("id, titulo, passos, created_at")
          .order("created_at", { ascending: false })
          .limit(10);
        if (args.busca) query = query.ilike("titulo", `%${args.busca}%`);
        const { data, error } = await query;
        if (error) throw error;
        return { playbooks: data || [] };
      }
      case "salvar_playbook": {
        const titulo = String(args.titulo || "").trim();
        const conteudo = String(args.conteudo || "").trim();
        if (!titulo || !conteudo) return { error: "Título e conteúdo são obrigatórios." };

        const { data: existing, error: findErr } = await supabaseServer
          .from("playbooks")
          .select("id, passos")
          .ilike("titulo", titulo)
          .limit(1)
          .maybeSingle();
        if (findErr) throw findErr;

        if (existing) {
          const passosAtuais = Array.isArray(existing.passos) ? existing.passos : [];
          const novosPassos = [...passosAtuais, { texto: conteudo, criado_em: new Date().toISOString() }];
          const { error: updateErr } = await supabaseServer
            .from("playbooks")
            .update({ passos: novosPassos, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (updateErr) throw updateErr;
          return { sucesso: true, acao: "passo_adicionado_a_playbook_existente", playbookId: existing.id };
        } else {
          const { data: created, error: insertErr } = await supabaseServer
            .from("playbooks")
            .insert([{ titulo, passos: [{ texto: conteudo, criado_em: new Date().toISOString() }] }])
            .select()
            .single();
          if (insertErr) throw insertErr;
          return { sucesso: true, acao: "playbook_criado", playbookId: created.id };
        }
      }
      case "marcar_criativo_vencedor": {
        const nomeCriativo = String(args.nomeCriativo || "").trim();
        if (!nomeCriativo) return { error: "Nome do criativo é obrigatório." };

        const { data: matches, error: findErr } = await supabaseServer
          .from("creatives")
          .select("id, name")
          .ilike("name", `%${nomeCriativo}%`)
          .limit(5);
        if (findErr) throw findErr;
        if (!matches || matches.length === 0) {
          return { error: `Nenhum criativo encontrado com nome parecido a "${nomeCriativo}".` };
        }
        if (matches.length > 1) {
          return { aviso: "Mais de um criativo encontrado, seja mais específico.", opcoes: matches.map((m: any) => m.name) };
        }

        const { error: updateErr } = await supabaseServer
          .from("creatives")
          .update({ is_winner: Boolean(args.vencedor) })
          .eq("id", matches[0].id);
        if (updateErr) throw updateErr;
        return { sucesso: true, criativo: matches[0].name, vencedor: Boolean(args.vencedor) };
      }
      default:
        return { error: `Função desconhecida: ${name}` };
    }
  } catch (err: any) {
    return { error: err.message || "Erro ao executar ação." };
  }
}

// 1.5. POST Agente IA Custom Chat (Interact with Agent via Gemini)
app.post("/api/agents/chat", async (req, res) => {
  const { messages, systemPrompt } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: "Messages array is required." });
  }

  const ai = getGeminiFromReq(req);
  if (!ai) {
    // Elegant fallback simulation is returned if Gemini key is missing
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const hasAttachment = messages[messages.length - 1]?.attachment;
    let simulatedResponse = `Olá! Sou o seu Agente IA Customizado. Como o GEMINI_API_KEY não foi detectado no ambiente, estou operando por simulação.\n\nSua pergunta foi: "${lastUserMessage}"${hasAttachment ? `\n[Anexo detectado na simulação: ${hasAttachment.name} (${hasAttachment.mimeType})]` : ""}\n\nInstrução recebida do seu prompt de sistema:\n"${systemPrompt ? systemPrompt.substring(0, 150) + "..." : "Nenhuma"}"\n\n[Como usar real]: Defina a variável GEMINI_API_KEY nas configurações ou no .env para conversar com inteligência real de forma integrada.`;
    return res.json({ success: true, content: simulatedResponse });
  }

  try {
    // Format messages correctly for @google/genai SDK (models.generateContent)
    const contents = messages.map((m: any) => {
      const parts: any[] = [];
      
      // If there is an attachment (image or file), include it as inlineData
      if (m.attachment && m.attachment.data) {
        // Strip data:image/...;base64, prefix if present
        let base64Data = m.attachment.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,").pop() || "";
        }
        parts.push({
          inlineData: {
            mimeType: m.attachment.mimeType,
            data: base64Data
          }
        });
      }
      
      parts.push({ text: m.content || "" });

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: parts
      };
    });

    const effectiveSystemInstruction = (systemPrompt || "") + AGENT_TOOLS_SYSTEM_HINT;

    let text = "Desculpe, não consegui raciocinar uma resposta adequada.";
    const MAX_TOOL_TURNS = 4;

    for (let turn = 0; turn <= MAX_TOOL_TURNS; turn++) {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: effectiveSystemInstruction,
          tools: [{ functionDeclarations: AGENT_TOOLS }]
        }
      });

      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        text = response.text || text;
        break;
      }

      // Agent decided to use a tool: append its call turn, then execute and append the results.
      contents.push({
        role: "model",
        parts: calls.map((c: any) => ({ functionCall: c }))
      });

      const responseParts = [];
      for (const call of calls) {
        const result = await executeAgentTool(call.name, call.args || {});
        responseParts.push({ functionResponse: { name: call.name, response: result } });
      }
      contents.push({ role: "user", parts: responseParts });

      if (turn === MAX_TOOL_TURNS) {
        text = response.text || "Não consegui concluir a ação a tempo. Tente reformular o pedido.";
      }
    }

    return res.json({ success: true, content: text });
  } catch (err: any) {
    console.error("Gemini Agent Chat execution failed:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1.7. POST Gerador de Ângulos de Copy (Gemini API Integration)
app.post("/api/generate-angles", async (req, res) => {
  const { nome, nicho, promessa, publico, objecao, preco } = req.body;

  if (!nome || !nicho || !promessa) {
    return res.status(400).json({ success: false, error: "Nome do produto, nicho e promessa são obrigatórios." });
  }

  const ai = getGeminiFromReq(req);

  if (!ai) {
    // Generate robust mock copy angles dynamically when GEMINI_API_KEY is not defined
    const simulatedAngles = [
      {
        id: "dor-aguda",
        nome: "Dor Aguda",
        emoji: "🔥",
        headline: `Cansado de sofrer com ${objecao || "falta de resultados"}? Conheça o ${nome}!`,
        variacoes: [
          `Você já tentou de tudo para atingir a promessa de "${promessa}" e falhou? A culpa não é sua. O problema é que te venderam mentiras que não funcionam.`,
          `Para você que é do público: ${publico || "Geral"}. Se você se encaixa aqui, sabe o quanto dói ver que nada muda. O ${nome} foi feito para você acabar com isso de vez.`,
          `Por apenas R$ ${preco || "19,90"}, você pode dar o primeiro passo hoje mesmo e eliminar essa dor de uma vez por todas.`
        ]
      },
      {
        id: "curiosidade",
        nome: "Curiosidade",
        emoji: "🤔",
        headline: `O segredo de R$ ${preco || "19,90"}: Por que o método tradicional de ${nicho} falha miseravelmente?`,
        variacoes: [
          `Existe um atalho simples que poucos no mercado de ${nicho} revelam. Um segredo que permite obter resultados fantásticos sem sacrifícios absurdos.`,
          `Um novo protocolo secreto acaba de ser revelado de como conseguir "${promessa}". E o melhor: qualquer pessoa comum do público consegue aplicar de onde estiver.`,
          `Mas atenção: a página explicativa sairá do ar em breve. Clique no botão para entender o mecanismo secreto antes que seja bloqueado.`
        ]
      },
      {
        id: "prova-social",
        nome: "Prova Social",
        emoji: "✅",
        headline: `"Eu achei que era golpe": Como milhares de pessoas do público ${publico || "que queriam resolver isso"} obtiveram: ${promessa}!`,
        variacoes: [
          `"Eu estava totalmente cética. Achei que seria mais uma promessa vazia na internet. Mas depois de testar o método ${nome}, tudo mudou."`,
          `Mais de 5.437 pessoas já comprovaram a eficácia do nosso protocolo no mercado de ${nicho}. Veja as transformações e feedbacks reais em nosso material.`,
          `Junte-se ao grupo seleto de pessoas que decidiram dar um basta nesse obstáculo por apenas R$ ${preco || "19,90"}.`
        ]
      },
      {
        id: "contra-intuitivo",
        nome: "Contra-Intuitivo",
        emoji: "⚡",
        headline: `Esqueça tudo o que te disseram sobre ${nicho}! A causa do seu problema é o oposto do que você pensa.`,
        variacoes: [
          `Eles te dizem que para chegar em "${promessa}" você precisa sofrer e gastar milhares de reais. A verdade é que o excesso de complicação bloqueia seu resultado.`,
          `A chave definitiva para destravar sua evolução não é trabalhar mais ou passar privações, mas sim ativar uma técnica sutil ignorada pelo mercado tradicional.`,
          `Revelamos o atalho esquecido que 99% dos ditos especialistas não querem que você saiba. Poupe tempo e dinheiro começando a fazer do jeito inteligente.`
        ]
      },
      {
        id: "autoridade",
        nome: "Autoridade",
        emoji: "🏆",
        headline: `O Método Oficial do ${nome}: A tecnologia em ${nicho} recomendada por profissionais sêniores.`,
        variacoes: [
          `Desenvolvido com tecnologia de ponta para apoiar ${publico || "você"} a superar as maiores barreiras do mercado de forma segura e rápida.`,
          `Nossa metodologia baseia-se em pilares testados e validados por especialistas de alta performance. Zero achismos, resultado prático real.`,
          `Garanta acesso à versão oficial licenciada do ${nome} com todos os bônus e atualizações incluídos pelo valor promocional de R$ ${preco || "19,90"}.`
        ]
      },
      {
        id: "comparacao",
        nome: "Comparação",
        emoji: "🔄",
        headline: `O Método ${nome} VS Cursos caros tradicionais. Por que pagar caro para continuar no mesmo lugar?`,
        variacoes: [
          `Enquanto outros cobram fortunas (R$ 497 ou mais) para te dar teoria complexa com zero aplicação prática, o ${nome} entrega tudo por apenas R$ ${preco || "19,90"}.`,
          `Compare você mesmo: os caminhos convencionais exigem meses de enrolação. Nosso atalho foca integralmente em "${promessa}" sem perder de tempo.`,
          `Não jogue seu orçamento fora com promessas que não cabem na sua rotina. Escolha a eficiência que cabe perfeitamente no seu bolso.`
        ]
      },
      {
        id: "medo-urgencia",
        nome: "Medo/Urgência",
        emoji: "😨",
        headline: `O custo de não agir: Se você ignorar isso hoje, continuará sofrendo com ${objecao || "falta de progresso"}.`,
        variacoes: [
          `A cada minuto que passa sem uma atitude clara, você fica um passo mais distante de alcançar: "${promessa}". O tempo continua correndo.`,
          `Por quanto tempo mais você vai aceitar conviver diariamente com esse obstáculo? A decisão de mudar precisa ser tomada agora.`,
          `Este preço especial de apenas R$ ${preco || "19,90"} é por tempo limitado. Garanta seu acesso promocional ainda hoje ou pague o valor cheio depois.`
        ]
      },
      {
        id: "solucao-simples",
        nome: "Solução Simples",
        emoji: "💡",
        headline: `Como conquistar "${promessa}" com um passo a passo simples de implementar hoje!`,
        variacoes: [
          `Montamos uma estrutura amigável feita sob medida para pessoas como você (${publico || "Iniciantes"}). É um roteiro direto ao ponto, sem rodeios.`,
          `Ideal para quem tem a rotina corrida e precisa de respostas rápidas: você consome e aplica tudo diretamente pelo seu celular ou computador.`,
          `Aproveite nossa garantia incondicional de satisfação e dê início aos testes agora mesmos sem nenhum risco para o seu bolso.`
        ]
      }
    ];

    return res.json({ success: true, simulated: true, angles: simulatedAngles });
  }

  try {
    const promptText = `Você é um Copywriter de elite focado em info-produtos, dropshipping e ofertas de conversão direta (Low Ticket) no mercado brasileiro.
O usuário enviou as seguintes especificações do produto dele:
- Nome do Produto: ${nome}
- Nicho de Atuação: ${nicho}
- Promessa Principal: ${promessa}
- Público-Alvo: ${publico || "Não especificado"}
- Objeção Principal a ser quebrada: ${objecao || "Não especificado"}
- Preço de Venda: R$ ${preco || "Não especificado"}

Sua missão é gerar exatamente 8 ângulos de copy diferentes, rigorosamente nos temas descritos a seguir, e nesta mesma ordem sequencial:

1. Dor Aguda: Ataca a dor principal do público diretamente, fazendo-os sentir a urgência de uma mudança.
2. Curiosidade: Gancho instigante que desperta curiosidade irresistível sem revelar plenamente a solução sob segredo.
3. Prova Social: Apoia-se em resultados de outras pessoas, histórias de sucesso e depoimentos ou dados coletivos.
4. Contra-Intuitivo: Desafia uma crença ou comportamento comum do público, quebrando padrões esperados.
5. Autoridade: Posiciona o método, ingrediente ou produto como a única e definitiva referência e padrão ouro nacional.
6. Comparação: Compara racionalmente este produto com o que o público-alvo já tentou, falhou ou gastou e saiu perdendo.
7. Medo/Urgência: Consequências graves ou o custo físico, financeiro ou mental de não agir e procrastinar agora.
8. Solução Simples: Promete um caminho claro, fácil e extremamente rápido de implementar e colher o resultado.

Diretrizes Críticas:
- Escreva em português do Brasil coloquial, persuasivo, ágil e magnético (estilo anúncios de Meta Ads de alta conversão).
- Faça ganchos rápidos e diretos. Cada variação de copy deve conter exatamente entre 1 e 3 frases completas.
- Considere que se trata de uma oferta simples e de baixo valor (Low Ticket), facilitando a impulsividade.
- O JSON deve conter exatamente 8 elementos, cada um com o respectivo id ("dor-aguda", "curiosidade", "prova-social", "contra-intuitivo", "autoridade", "comparacao", "medo-urgencia", "solucao-simples"), nome do ângulo, o emoji correspondente, uma headline e exatamente 3 variações de copy curtas nas variações de string.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            angles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  nome: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  variacoes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["id", "nome", "emoji", "headline", "variacoes"]
              }
            }
          },
          required: ["angles"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    
    if (!data.angles || !Array.isArray(data.angles)) {
      throw new Error("Formato de retorno inválido obtido da API do Gemini.");
    }
    
    return res.json({ success: true, simulated: false, angles: data.angles });
  } catch (err: any) {
    console.error("Gemini Angles Generation execution failed:", err);
    return res.status(500).json({ success: false, error: "Falha ao gerar ângulos com IA: " + err.message });
  }
});

// 1.8. POST Gerador de Dossiê Psicológico de Público-Alvo (Gemini API Integration)
app.post("/api/generate-audience-dossier", async (req, res) => {
  const { nome, nicho, promessa, problema, publico, preco } = req.body;
  const ai = getGeminiFromReq(req);
  if (!ai) {
    const nichoLower = (nicho || "").toLowerCase();
    const nomeLower = (nome || "").toLowerCase();
    
    const isSaudeOuEmagrecimento = nichoLower.includes("emagrecimento") || 
                                   nichoLower.includes("saude") || 
                                   nichoLower.includes("saúde") || 
                                   nichoLower.includes("beleza") ||
                                   nichoLower.includes("estética") ||
                                   nichoLower.includes("estetica");

    const isDesignOuArquitetura = nichoLower.includes("arquitet") || 
                                  nichoLower.includes("design") || 
                                  nichoLower.includes("render") || 
                                  nichoLower.includes("3d");

    const isSaaS = nichoLower.includes("saas") || 
                   nichoLower.includes("software") || 
                   nichoLower.includes("tecnologia") || 
                   nichoLower.includes("startup") || 
                   nichoLower.includes("app") || 
                   nichoLower.includes("aplicativo");

    // Persona variables
    const personaNome = isSaudeOuEmagrecimento 
      ? (nichoLower.includes("masculina") ? "Roberto Santos, 51 anos" : "Márcia Oliveira, 47 anos")
      : isDesignOuArquitetura
        ? "Camila Alencar, 31 anos"
        : isSaaS
          ? "Thiago Rocha, 34 anos"
          : "Paula Mendes, 38 anos";

    const personaIdade = isSaudeOuEmagrecimento
      ? (nichoLower.includes("masculina") ? "40 a 60 anos" : "35 a 55 anos")
      : isDesignOuArquitetura
        ? "25 a 45 anos"
        : isSaaS
          ? "24 a 45 anos"
          : "25 a 55 anos";

    const personaGenero = isSaudeOuEmagrecimento
      ? (nichoLower.includes("masculina") ? "Masculino" : "Feminino")
      : isSaaS
        ? "Masculino / Predom. Misto"
        : "Misto / Predom. Feminino";

    const personaProfissao = isDesignOuArquitetura
      ? "Arquiteta Autônoma / Designer de Interiores"
      : isSaaS
        ? "Fundador de Startup / Desenvolvedor Indie / Gerente Operacional"
        : (nichoLower.includes("renda") || nichoLower.includes("financ") || nichoLower.includes("cripto"))
          ? "Microempreendedor / Profissional Autônomo"
          : "Assistente Administrativa / Autônoma";

    const rotinaDestruida = isDesignOuArquitetura
      ? `A rotina começa com prazos apertados e a cabeça cheia de preocupações sobre entregas de projetos. A primeira coisa que Camila pensa ao abrir os olhos é em como o processo de renderização e modelagem drena suas energias. O problema de "${problema}" rouba seu tempo e sua produtividade diária. Ela passa horas exaustivas na frente do computador, travada, vendo o tempo voar sem conseguir o realismo visual que o cliente deseja. Isso causa fadiga física, dores e a incômoda sensação de estar desatualizada no mercado.`
      : isSaudeOuEmagrecimento
        ? `A rotina começa pesada antes mesmo de sair da cama. A primeira coisa que pensa ao abrir os olhos é em como sua disposição sumiu. O problema de "${problema}" rouba suas energias vitais e abala sua autoestima. Ela evita se olhar no espelho antes de vestir a roupa para o trabalho. Come com culpa ou ansiedade, sentindo-se constantemente indisposta. No trabalho, tenta disfarçar seu esgotamento, mas a fadiga e a insatisfação com seu próprio corpo ou saúde a impedem de render de verdade. À noite, chega esgotada e com a mente barulhenta.`
        : isSaaS
          ? `A rotina diária começa cheia de guias de desenvolvimento e tarefas acumuladas no backlog de operações. A primeira coisa que Thiago pensa ao acordar é na lentidão de processos manuais ou no churn silencioso de clientes. O problema de "${problema}" rouba o tempo da equipe e prejudica a escala operacional. Passa horas preciosas do dia resolvendo pequenos gargalos técnicos em vez de focar no crescimento estratégico. Sinto-me exausto intelectualmente de apagar incêndios manuais em planilhas ou sistemas fragmentados.`
          : `A rotina diária começa com o peso de resolver tarefas complexas sob estresse. A primeira coisa que pensa ao abrir os olhos é no gargalo técnico ou financeiro que precisa sanar. O problema de "${problema}" consome seu tempo e seu foco. Passa horas de forma improdutiva buscando respostas soltas na rede, sentindo que está correndo em círculos. Isso drena toda a sua vitalidade e gera um cansaço mental que se arrasta até a hora de deitar.`;

    const momentoDeRuptura = isDesignOuArquitetura
      ? `O ponto crítico ocorreu no último final de semana: ao tentar entregar um projeto crucial para seu cliente mais exigente, o computador travou após horas de render ou a apresentação final ficou com visual horrível e artificial, forçando-a a dar desculpas embaraçosas e perder a confiança do contratante. Camila se viu trancada no escritório às 3h da manhã de um sábado, frustrada com seus limites de fluxo de trabalho lento, e percebeu que precisava de uma solução definitiva.`
      : isSaudeOuEmagrecimento
        ? `O ponto crítico ocorreu no último final de semana: ao tentar vestir sua roupa preferida para ir a um compromisso social importante, ela percebeu que a roupa não servia mais ou que sua indisposição física era tão grande que ela preferiu inventar uma desculpa para não comparecer ao evento. Trancou-se no banheiro do quarto, chorou escondida para ninguém ver o tamanho de sua frustração, e percebeu que precisava de um ponto de virada definitivo.`
        : isSaaS
          ? `O ponto crítico ocorreu no meio de uma campanha de atração de novos usuários ou atualização crítica da plataforma, quando uma tarefa manual apresentou um erro grave, causando reclamações de clientes importantes e deixando nítido o quanto a falta de automatização ou fluxo estruturado de ${problema} estava sabotando o faturamento do negócio. Thiago se viu trabalhando de madrugada para consertar planilhas e tarefas burocráticas repetitivas de forma artesanal, cansado de agir como um funcionário operacional do seu próprio sistema.`
          : `O ponto crítico ocorreu nos últimos dias, quando uma tentativa importante de resolver a questão deu errado e causou desperdício de tempo e dinheiro. Diante de uma cobrança externa ou de si mesmo, veio a percepção clara de que empurrar o problema de "${problema}" com a barriga estava custando sua paz mental, sua evolução pessoal e financeira. Foi quando decidiu buscar um método estruturado e confiável.`;

    // Adaptive falhas do mercado
    let tentativasAnteriores = [];
    let oQueFunciona = [];
    let oQueEvitar = [];
    let headlinesDeDor = [];
    let headlinesDeMedo = [];

    if (isSaudeOuEmagrecimento) {
      tentativasAnteriores = [
        {
          tentativa: "Dietas restritivas ou chás milagrosos de blogueira",
          quanto_gastou: "R$ 150 a R$ 350",
          por_que_falhou: "Exigiam mudanças extremas de hábito insustentáveis para quem tem uma rotina corrida.",
          crenca_formada: "Eu não tenho força de vontade e meu metabolismo está quebrado para sempre."
        },
        {
          tentativa: "Matrícula semestral em academia e treinos longos",
          quanto_gastou: "R$ 450",
          por_que_falhou: "Falta de tempo diária e cansaço extremo que impediam a constância física básica.",
          crenca_formada: "Academia é cansativa e só funciona para quem tem tempo de sobra."
        },
        {
          tentativa: "Pílulas termogênicas compradas pela internet",
          quanto_gastou: "R$ 180",
          por_que_falhou: "Causavam palpitações, ansiedade extrema e efeito sanfona severo ao interromper.",
          crenca_formada: "Esses produtos de emagrecimento ou tratamento são enganação pura e perigosos."
        },
        {
          tentativa: "Vídeos gratuitos e receitas caseiras do YouTube",
          quanto_gastou: "R$ 0",
          por_que_falhou: "Dicas desconexas, sem método unificado e sem acompanhamento organizado.",
          crenca_formada: "Informação gratuita na internet é confusa e não gera solução aplicável de verdade."
        }
      ];

      oQueFunciona = [
        {
          elemento: "Depoimentos de pessoas comuns",
          por_que_funciona: "O brasileiro de classe média confia muito mais no depoimento de pessoas reais 'comuns' do que em médicos frios de gravata.",
          como_usar: "Histórias do tipo: 'Meu vizinho ou minha prima testou de forma simples e deu muito certo...'"
        },
        {
          elemento: "Garantia Total Incondicional de 7 Dias",
          por_que_funciona: "Por haver muitos sites ruins na internet, a garantia retira o risco de perder dinheiro.",
          como_usar: "Deixe claro: 'Se você não gostar, devolvemos todo o seu dinheiro imediatamente.'"
        },
        {
          elemento: "Acesso Imediato sem Complicação",
          por_que_funciona: "Qualquer complicação técnica para receber o método gera desistências rápidas.",
          como_usar: "Enfatize que o link seguro para as aulas ou receitas chega diretamente no WhatsApp e e-mail."
        },
        {
          elemento: "Preço comparado com coisas do dia a dia",
          por_que_funciona: "Comparar o preço a uma pizza ou cafezinho torna a compra insignificante se comparada à saúde.",
          como_usar: "Mostre que custa menos de R$ 1 por dia, menos que um cafezinho na padaria."
        },
        {
          elemento: "Uso de Linguagem Direta e Sem Termos Técnicos",
          por_que_funciona: "As pessoas se sentem acolhidas quando usamos analogias que elas entendem sem jargão médico.",
          como_usar: "Substitua teorias difíceis por explicações simples e fáceis de aplicar."
        }
      ];

      oQueEvitar = [
        {
          elemento: "Visual Clínico ou Clínico Frio",
          por_que_repele: "Termos puramente acadêmicos tornam a leitura cansativa e dão sensação de tese escolar chata.",
          alternativa: "Explique como funciona com analogias divertidas e práticas do dia a dia brasileiro."
        },
        {
          elemento: "Processo com Etapas Complexas",
          por_que_repele: "Quem sofre com indisposição quer um atalho rápido. Passos pesados fazem a pessoa desistir.",
          alternativa: "Apresente como um protocolo de apenas 10 minutos por dia focado no piloto automático."
        },
        {
          elemento: "Expressões ou Termos em Inglês",
          por_que_repele: "O público comum não se identifica e acha que é algo elitista ou distante de sua realidade.",
          alternativa: "Use palavras calorosas e expressões brasileiras comuns de acolhimento."
        },
        {
          elemento: "Garantia Burocrática ou de Difícil Compreensão",
          por_que_repele: "Termos complicados no reembolso fazem o comprador achar que há pegadinhas ocultas.",
          alternativa: "Explique o reembolso de forma transparente e amigável."
        }
      ];

      headlinesDeDor = [
        `Se você tem ${publico || "mais de 30 anos"} e sofre com ${problema}, pare tudo o que está fazendo!`,
        `O segredo oculto por trás de ou do problema de ${problema} que os grandes laboratórios escondem de você.`,
        `Por que continuar tentando resolver ${problema} com métodos tradicionais está piorando seu metabolismo de vez.`,
        `Chega de frustração diária: Conheça o protocolo simples para alcançar ${promessa}.`,
        `Como pessoas comuns estão resolvendo de vez o problema de ${problema} sem tratamentos dolorosos.`
      ];

      headlinesDeMedo = [
        `O perigo silencioso por trás de ${problema} que você está acumulando silenciosamente debaixo dos panos.`,
        `Se você não agir sobre seu problema de ${problema} hoje, seu corpo cobrará a conta em breve.`,
        `O que acontecerá com sua saúde e autoestima se você decidir empurrar isso com a barriga por mais um mês?`,
        `Não espere as complicações de ${problema} piorarem para finalmente tomar uma atitude definitiva de saúde.`,
        `Como escapar da dependência de fórmulas milagrosas barulhentas usando o método "${nome}" hoje.`
      ];
    } else if (isDesignOuArquitetura) {
      tentativasAnteriores = [
        {
          tentativa: "Cursos extensos de software com mais de 60 hours de gravações teóricas",
          quanto_gastou: "R$ 300 a R$ 900",
          por_que_falhou: "Muita teoria cansativa sobre menus secundários inúteis e falta de tempo para assistir a tudo.",
          crenca_formada: "Aprender renderização profissional 3D e modelagem exige anos de estudo e talento genético complexo."
        },
        {
          tentativa: "Tutoriais soltos do YouTube em outros idiomas ou de baixa qualidade",
          quanto_gastou: "R$ 0 (mas semanas de tempo precioso perdido)",
          por_que_falhou: "Vídeos incompletos e desconexos que não explicam o real 'pulo do gato' e deixam furos no fluxo.",
          crenca_formada: "Conteúdo gratuito na internet é desorganizado e não resolve problemas de projetos reais."
        },
        {
          tentativa: "Packs de blocos, texturas ou cenas prontas baratas de alta complexidade",
          quanto_gastou: "R$ 100 a R$ 250",
          por_que_falhou: "Arquivos pesados e desconfigurados que travavam o sistema, texturas sem realismo e erros na luz.",
          crenca_formada: "Plugins e pacotes baratos causam travamento no notebook e não dão o realismo exigido pelos clientes."
        },
        {
          tentativa: "Manuais oficiais dos softwares e fóruns técnicos estrangeiros",
          quanto_gastou: "R$ 0",
          por_que_falhou: "Explicações excessivamente teóricas, em inglês e sem focar na entrega visual ágil do designer/arquiteto.",
          crenca_formada: "Esses programas de render e modelagem são hostis e demorados de entender na prática de mercado."
        }
      ];

      oQueFunciona = [
        {
          elemento: "Entrega passo a passo imediata e prática",
          por_que_funciona: "Profissionais e estudantes de projeto valorizam o tempo e querem templates prontos para copiar e aplicar.",
          como_usar: "Deixe claro: 'Você vai pular toda a teoria confusa e aplicar este método estruturado em menos de 20 minutos.'"
        },
        {
          elemento: "Garantia Total Incondicional de 7 Dias",
          por_que_funciona: "Reduz o receio de se arrepender se os arquivos ou as videoaulas não forem ultra práticos.",
          como_usar: "Garanta: 'Se em 7 dias você achar que o método ${nome} não vale 10 vezes o investido, devolvemos seu dinheiro.'"
        },
        {
          elemento: "Packs e Materiais Editáveis Prontos",
          por_que_funciona: "O profissional busca por atalhos de rotina que evitem ter que configurar tudo do zero na tela.",
          como_usar: "Entregue o material configurado e pronto para importar no projeto do cliente com um clique."
        },
        {
          elemento: "Preço em Comparação ao Ganho Profissional",
          por_que_funciona: "Um investimento insignificante perto do valor que o profissional do nicho pode cobrar no seu primeiro trabalho profissional.",
          como_usar: `Sinalize que o preço de R$ ${preco || "19,90"} é menor do que um café especial ou uma xícara de capuccino de padaria.`
        },
        {
          elemento: "Uso de Linguagem Humana e Descomplicada",
          por_que_funciona: "Elimina a barreira técnica do vocabulário difícil de softwares e foca na velocidade de execução.",
          como_usar: `Assegurar como alcançar ${promessa} usando analogias visuais simples que qualquer iniciante compreende.`
        }
      ];

      oQueEvitar = [
        {
          elemento: "Teorias Acadêmicas Extensas e Monótonas",
          por_que_repele: "Abordagens universitárias geram preguiça mental e pregam que é preciso sofrer para criar projetos.",
          alternativa: "Focar em um tutorial direto voltado para cliques exatos na tela para produzir realismo."
        },
        {
          elemento: "Falta de Materiais Prontos ou Arquivos Auxiliares",
          por_que_repele: "A obrigação de iniciar do absoluto zero assusta e drena o tempo do profissional travando-o.",
          alternativa: "Entregar o pack configurado e pronto para importar, poupando semanas de agonia celular."
        },
        {
          elemento: "Promessas Abstratas ou Sem Prova Visual",
          por_que_repele: "Quem trabalha com arquitetura e design gráfico é altamente cético em termos de renderização.",
          alternativa: "Apoiar a oferta em renders reais de antes e depois gerados com o método no Brasil."
        },
        {
          elemento: "Expressões Técnicas e Jargões Sem Explicação",
          por_que_repele: "Gera pavor em quem não domina o inglês e quer usar as ferramentas de forma rápida e brasileira.",
          alternativa: "Traduzir todas as dinâmicas para ações práticas e termos habituais simplificados."
        }
      ];

      headlinesDeDor = [
        `Como alcançar ${promessa} sem perder semanas em tutoriais chatos e demorados do YouTube!`,
        `Se você trabalha com ${nicho} e sente a frustração de ${problema}, pare agora mesmo e assista a isso!`,
        `Pare de perder prazos de entrega e clientes exigentes devido a ${problema}. Existe um caminho simples.`,
        `O atalho prático que os profissionais seniores usam para atingir ${promessa} sem esforço complexo.`,
        `Por que continuar travando com ${problema} está arruinando sua carreira e diminuindo suas vendas.`
      ];

      headlinesDeMedo = [
        `O erro trágico que você comete na modelagem ao tentar resolver os problemas de ${problema} sozinho.`,
        `Se você não destravar este método prático sobre ${problema}, continuará perdendo espaço para seus colegas de área.`,
        `O que acontecerá com sua carreira e com seu portfólio de especialista se decidir procrastinar até o fim deste mês?`,
        `O mercado de ${nicho} está evoluindo rápido. Não dependa de computadores milionários ou processos lentos de estúdio.`,
        `Como evitar a dor de cabeça técnica e economizar dezenas de horas usando o método simples ${nome}.`
      ];
    } else if (isSaaS) {
      tentativasAnteriores = [
        {
          tentativa: "Contratar programadores freelancers ou agências de tecnologia",
          quanto_gastou: "R$ 1.500 a R$ 4.500",
          por_que_falhou: "Demoravam muito para entregar, cobravam tarifas surpresas por qualquer alteração básica e não entendiam a regra de negócio.",
          crenca_formada: "Se eu mesmo não arregaçar as mangas e desenhar o fluxo operacional do meu software, ninguém fará."
        },
        {
          tentativa: "Assinar múltiplas ferramentas caras de CRM, integradores ou planilhas pagas",
          quanto_gastou: "R$ 350 a R$ 800 / mês",
          por_que_falhou: "Sistemas incompatíveis, APIs complicadas e quebras inesperadas que causavam perda de dados cruciais.",
          crenca_formada: "Automação e escala sistêmica são privilégios caros para startups milionárias."
        },
        {
          tentativa: "Consumir tutoriais, documentações vagas e fóruns estrangeiros na internet",
          quanto_gastou: "R$ 0",
          por_que_falhou: "Guias abstratos, em inglês, ou focados em grandes corporações que não resolvem a dor de forma prática.",
          crenca_formada: "A informação útil de tecnologia é difícil de encontrar e cansativa de aplicar sem suporte."
        },
        {
          tentativa: "Construir scripts ou rotinas manuais caseiras provisórias",
          quanto_gastou: "R$ 0",
          por_que_falhou: "Criam um débito técnico enorme, quebram com facilidade e exigem manutenção complexa exaustiva.",
          crenca_formada: "Qualquer estabilidade de sistema exige investimentos milionários que minha startup não possui agora."
        }
      ];

      oQueFunciona = [
        {
          elemento: "Retorno Financeiro sobre o Investimento (ROI) nítido e imediato",
          por_que_funciona: "Fundadores, gestores e desenvolvedores SaaS focam em métricas, economia de tempo e eficiência. Se a solução gera lucro rápido, ela é irresistível.",
          como_usar: `Demonstre de forma simples: demonstrar que automatizar ou otimizar o fluxo de ${problema} evita perda de lucros e poupa horas operacionais caras.`
        },
        {
          elemento: "Onboarding ágil e documentação extremamente objetiva",
          por_que_funciona: "Profissionais técnicos ou gestores ocupados têm pressa e odeiam ler explicações longas ou palestras teóricas de metodologias.",
          como_usar: "Forneça checklists estruturados e etapas visualmente simples para aplicar a rota em minutos."
        },
        {
          elemento: "Garantia Total Incondicional de 7 Dias com devolução na hora",
          por_que_funciona: "Dá conforto para o gestor embarcar a solução na startup e testar a integração sem atritos comerciais.",
          como_usar: `Garante com clareza: 'Se o método ${nome} não trouxer pelo menos 10 vezes o investimento em economia e escala operacional, peça reembolso.'`
        },
        {
          elemento: "Preço comparado com horas caras de trabalho de TI",
          por_que_funciona: "Compreender que o custo de R$ ${preco} é insignificante perto de pagar um desenvolvedor sênior por pouquíssimos minutos.",
          como_usar: `Aborde que o valor de R$ ${preco || "19,90"} é dez vezes menor do que gastar com uma única hora de profissional freelancer.`
        },
        {
          elemento: "Foco na simplicidade e no autoatendimento (Self-Service)",
          por_que_funciona: "Pessoas de tecnologia adoram soluções diretas onde elas podem resolver seus gargalos sozinhas sem agendar dezenas de reuniões.",
          como_usar: "Deixe claro que o método é prático, autônomo e de ativação instantânea para poupar tempo."
        }
      ];

      oQueEvitar = [
        {
          elemento: "Teorias Complexas de Gestão ou Engenharia Acadêmica",
          por_que_repele: "Quem lida com SaaS busca uma solução cirúrgica para o problema, não manuais longos com regras engessadas.",
          alternativa: "Apresentar um tutorial passo a passo direto para cliques na tela de forma otimizada."
        },
        {
          elemento: "Falta de exemplos práticos de código ou fluxos mapeados",
          por_que_repele: "Ficar apenas na teoria abstrata assusta e força o profissional a ter que descobrir de qualquer forma.",
          alternativa: "Fornecer modelos reais, fluxogramas fáceis e checklists prontos para copiar e aplicar."
        },
        {
          elemento: "Jargões e promessas mágicas exageradas sem lógica real de dados",
          por_que_repele: "A comunidade técnica é altamente cética com promessas estrondosas sem embasamento ou clareza de processo.",
          alternativa: "Sustentar a copy em eficiência operacional e economia de tempo e dinheiro reais."
        },
        {
          elemento: "Visual poluído e pouco estruturado de vendas antigo",
          por_que_repele: "Donos de softwares valorizam design limpo e interfaces modernas. Um visual ultrapassado destrói a autoridade.",
          alternativa: "Apresentar o método em um layout sóbrio, limpo, bem-organizado, minimalista e muito profissional."
        }
      ];

      headlinesDeDor = [
        `Como eliminar o gargalo de ${problema} no seu SaaS ou startup sem gastar com desenvolvedores caros!`,
        `Se o seu ${nicho} está sofrendo com a lentidão e desperdício de tempo gerados por ${problema}, assista a isso!`,
        `Pare de perder faturamento operacional recorrente por causa de problemas em ${problema}. Existe um atalho.`,
        `A estratégia de escala interna que desenvolvedores seniores usam para alcançar ${promessa} em tempo recorde.`,
        `Por que tolerar o problema de ${problema} está travando a expansão da sua equipe de TI e reduzindo seus lucros.`
      ];

      headlinesDeMedo = [
        `O perigo oculto na sua infraestrutura ao continuar tratando o gargalo de ${problema} manualmente na planilha.`,
        `Se o seu SaaS não resolver o entrave de ${problema} agora, seus clientes ativos buscarão ferramentas concorrentes.`,
        `Quanto faturamento de recorrência sua plataforma de ${nicho} está deixando de faturar todo mês por essa lentidão.`,
        `Mercados digitais evoluem rápido: não deixe sua ferramenta parecer ultrapassada e perca usuários compradores.`,
        `Como evitar falhas e automatizar o processo usando o método simples de rápida implementação ${nome}.`
      ];
    } else {
      tentativasAnteriores = [
        {
          tentativa: "Cursos online genéricos ou mentorias em grupo sem acompanhamento",
          quanto_gastou: "R$ 197 a R$ 497",
          por_que_falhou: "Falta de suporte para tirar dúvidas específicas e conteúdo focado em teorias extensas.",
          crenca_formada: "Cursos na internet são todos iguais e as informações prontas são confusas."
        },
        {
          tentativa: "Dicas rápidas e materiais em PDF baratos nas redes sociais",
          quanto_gastou: "R$ 29 a R$ 80",
          por_que_falhou: "Fórmulas muito incompletas e superficiais que exigiam ferramentas pagas adicionais não divulgadas.",
          crenca_formada: "Livros e treinamentos baratos não passam de isca de vendas para cursos caros."
        },
        {
          tentativa: "Tutoriais e vídeos avulsos do YouTube",
          quanto_gastou: "R$ 0",
          por_que_falhou: "Processo extremamente fragmentado que resolve apenas um pequeno passo e deixa o resto solto.",
          crenca_formada: "Você perde muito tempo precioso garimpando conteúdo bagunçado sem um rumo coerente."
        },
        {
          tentativa: "E-books densos ou manuais repletos de termos complicados",
          quanto_gastou: "R$ 50 a R$ 150",
          por_que_falhou: "Falta de didática focada no cenário prático da classe média no Brasil.",
          crenca_formada: "Apenas ler sobre a teoria não me ajuda a executar a solução no meu computador ou rotina."
        }
      ];

      oQueFunciona = [
        {
          elemento: "Manual passo a passo prático de entrega imediata",
          por_que_funciona: "Trabalhadores e amadores valorizam seu tempo e querem um material que possam reproduzir imediatamente.",
          como_usar: "Mostre de forma clara: 'Você vai pular as teorias sem sentido prático e ir direto para o que importa.'"
        },
        {
          elemento: "Garantia Incondicional de Alívio de 7 Dias",
          por_que_funciona: "Retira o medo psicológico de investir o suado valor e se desapontar.",
          como_usar: `Deixe visível: 'Se em uma semana você não notar os resultados de ${promessa}, ou se desgostar, o reembolso é na hora.'`
        },
        {
          elemento: "Templates ou Checklists Prontos de Apoio",
          por_que_funciona: "As pessoas adoram materiais que elas apenas precisam preencher e aplicar sem pensar.",
          como_usar: "Forneça arquivos e listas diretas que agilizem a rotina técnica do consumidor."
        },
        {
          elemento: "Preço Equivalente a Despesas Irrisórias Diárias",
          por_que_funciona: "Comparar o preço a uma bala ou cafezinho faz parecer que o risco financeiro é nulo.",
          como_usar: `Argumente que o preço de R$ ${preco} é menor do que uma coxinha com refrigerante na lanchonete da esquina.`
        },
        {
          elemento: "Linguagem Humble e Sem Termos Acadêmicos",
          por_que_funciona: "Aproxima o autor do leitor comum, gerando empatia e confiança instantânea sobre seu problema.",
          como_usar: "Use termos diretos, coloquiais e metáforas do dia a dia sobre ${promessa}."
        }
      ];

      oQueEvitar = [
        {
          elemento: "Vocabulário ou Teoria Puramente Acadêmica de Escola",
          por_que_repele: "Burocracia ou jargões dão sensação de estudo enfadonho de faculdade, afastando o interesse.",
          alternativa: "Utilizar exemplos dinâmicos, analogias simples e ir direto para a prática da tela."
        },
        {
          elemento: "Falta de Exemplos Reais Nacionais Aplicáveis",
          por_que_repele: "Sentir que o método foi feito para outro país e não funciona na realidade do brasileiro comum.",
          alternativa: "Trazer exemplos de pessoas do interior, autônomos e situações reais do mercado nacional."
        },
        {
          elemento: "Promessas Absurdas e Bombásticas Sem Respaldo",
          por_que_repele: "Quem já foi enganado detecta promessas irreais de longe e sai do site na hora.",
          alternativa: "Sustentar a copy com promessas alcançáveis através de esforço realista e bem direcionado."
        },
        {
          elemento: "Termos em Inglês ou Expressões Importadas Complexas",
          por_que_repele: "Gera tese de que o programa é difícil, elitizado ou restrito a quem tem educação bilingue.",
          alternativa: "Traduzir todas as analogias para palavras cordiais e termos do vocabulário normal."
        }
      ];

      headlinesDeDor = [
        `Como destravar ${promessa} sem perder dias inteiros em tutoriais vagos de internet!`,
        `Se você sofre diariamente com o incômodo de ${problema}, ouça este comunicado importante!`,
        `Pare de perder paciência e tempo precioso por causa de ${problema}. Existe uma rota mais simples.`,
        `O segredo que os especialistas usam para alcançar ${promessa} em poucos minutos por dia.`,
        `Por que continuar aceitando o incômodo de ${problema} na sua rotina está travando sua evolução pessoal.`
      ];

      headlinesDeMedo = [
        `O perigo invisível que você corre ao tentar lidar com ${problema} sem um roteiro estruturado.`,
        `Se você recusar este método prático sobre ${problema}, continuará dependente de sistemas caros no futuro.`,
        `O que acontecerá com suas metas e sonhos de bem-estar se você ignorar este sinal até o próximo mês?`,
        `Seu mercado e sua vida estão mudando velozmente. Não dependa de conselhos ultrapassados de terceiros.`,
        `Como descartar a frustração e poupar semanas de agonia celular aplicando o método simples ${nome}.`
      ];
    }

    // Custom deep targets
    const dorReal = isDesignOuArquitetura 
      ? "O pavor constante de ficar obsoleto no mercado de projetos de interiores, ver profissionais recém-formados entregando tudo de forma mais ágil e perder os melhores contratos." 
      : isSaudeOuEmagrecimento
        ? "Medo crônico de falhar, de não se sentir aceito, de ver sua saúde se deteriorar ou de carregar o cansaço corporal no longo prazo de forma irreversível."
        : isSaaS
          ? "O medo do Churn de clientes subir silenciosamente por causa de problemas em " + problema + ", ver novos concorrentes modernos surgindo e engolindo sua participação de mercado."
          : `O receio velado de ver a carreira ou as finanças afundarem na estagnação, perder o ritmo do mercado de trabalho e arrastar o problema de ${problema} por meses.`;

    const dorIdentitaria = isDesignOuArquitetura
      ? "Se enxergar como um profissional estagnado no tempo, lento, incapaz de acompanhar as evoluções digitais ou de cobrar preços decentes."
      : isSaudeOuEmagrecimento
        ? "Se enxergar como um indivíduo indisciplinado, fraco, sem força de vontade e refém das próprias debilidades corporais."
        : isSaaS
          ? "Ver-se como um empreendedor ou desenvolvedor que está perdendo a agilidade de quando começou, afundando sob o peso de pendências manuais operacionais."
          : `Decepcionar-se consigo mesmo ao não conseguir destravar um problema técnico ou de rotina simples, afetando sua autoconfiança de executor.`;

    const vergonhaOculta = isDesignOuArquitetura
      ? "A vergonha silenciosa de ter que dar descontos abusivos que arruínam seu lucro apenas ou mentir para prazos atrasados de maquetes 3D."
      : isSaudeOuEmagrecimento
        ? "O pavor de que as pessoas ao redor comentem sobre sua aparência de cansaço facial e desgaste ou o parceiro amoroso perca o interesse físico."
        : isSaaS
          ? "O constrangimento de ter que enviar desculpas por erros sistêmicos de fluxo para investidores ou clientes de alto valor."
          : `A humilhação secreta de admitir para amigos de profissão ou familiares que você continua travado com esta pendência tola por falta de conhecimento.`;

    const provaSocialFicticia1 = isDesignOuArquitetura
      ? `"Eu achei que precisaria trocar de notebook ou fazer um curso de 100 horas. Paguei R$ 19,90 no método "${nome}" e na primeira aplicação entreguei o projeto 3D de um apartamento de luxo pro cliente em tempo recorde. Esse atalho vale ouro!" - Camila Alencar, Arquiteta`
      : isSaudeOuEmagrecimento
        ? `"Tenho 43 anos, moro no interior de SP e achei que era propaganda enganosa. Mas resolvi arriscar R$ 19,90 no "${nome}" e foi a melhor decisão que tomei no ano para o meu bem-estar. Em duas semanas de protocolo me senti outra pessoa!" - Márcia R.`
        : isSaaS
          ? `"Pensei que precisaria contratar um novo programador júnior só pra cuidar do fluxo desse canal. Adquiri o método "${nome}" por R$ 19,90 e no mesmo dia configuramos uma automação que economiza mais de 15 horas semanais da equipe técnica. Excelente investimento!" - Thiago R., CTO / Co-founder`
          : `"Eu já tinha gastado muito dinheiro com cursos caros e teóricos que não me ajudavam a resolver o problema prático de forma rápida. O método "${nome}" me deu o passo a passo direto por apenas R$ 19,90." - Carlos Alves`;

    const provaSocialFicticia2 = isDesignOuArquitetura
      ? `"Sou designer autônomo e estava travado em prazos apertados sem conseguir o realismo ideal que agrada os clientes exigentes de alto padrão. Comprei pelo WhatsApp e as técnicas de iluminação do método mudaram de vez meu portfólio." - Roberto F.`
      : isSaudeOuEmagrecimento
        ? `"Minha esposa comprou para mim este guia porque eu não aguentava mais a indisposição física severa e a fadiga muscular pela manhã. O método "${nome}" resolveu em poucos dias. Indico de olhos fechados!" - Carlos A.`
        : isSaaS
          ? `"Nosso SaaS de marketing estava sofrendo com gargalos manuais doloridos, provocando Churn severo. A simplicidade das estratégias de "${nome}" destravou o nosso fluxo operacional em menos de 48 horas. Recomendo de olhos fechados!" - Carlos A., Product Lead`
          : `"Eu estava muito desconfiado pelo preço baixo, mas o material surpreendeu demais pela clareza e praticidade de leitura. Destravou a minha pendência em poucos minutos sem exigir expert." - Elaine Santos`;

    const provaSocialFicticia3 = isDesignOuArquitetura
      ? `"Recomendo demais! É um protocolo simples focado em cliques certeiros que me economizou semanas de esforço dolorido na frente do computador. Paguei menos de R$ 20 e os resultados de realismo profissional são imediatos." - Gustavo M.`
      : isSaudeOuEmagrecimento
        ? `"Eu já tinha gastado mais de 500 reais com fórmulas manipuladas caras indicadas por blogueiras do Instagram que só me davam agonia e palpitações de efeito rebote. Esse método prático e natural foi a salvação." - Sandra M.`
        : isSaaS
          ? `"Excelente! Um achado maravilhoso para desenvolvedores indie que operam de forma enxuta e precisam de resultados ágeis sem gastar fortunas com mensalidades abusivas extras de ferramentas externas de integração." - Elaine Santos, Solopreneur`
          : `"O material é excelente e extremamente didático. Valeu cada centavo pela dor de cabeça e tempo enorme que poupou da minha rotina. Recomendo de coração pela transparência!" - Sandra M.`;

    const aberturasVsl = isDesignOuArquitetura
      ? [
          "Olhe bem para esta maquete 3D realista na tela do computador. Se você é designer ou arquiteto e passa horas e fins de semana travado no render para entregar projetos, ouça isso com urgência nos próximos 90 segundos.",
          "O que eu vou te revelar aqui hoje vai contra toda a teoria acadêmica tradicional que te ensinaram na faculdade. Mas os resultados visuais práticos de mercado não mentem.",
          `Você já se perguntou por que alguns estúdios cobram o triplo que você dominando as mesmas ferramentas? O segredo está na velocidade e no realismo deste simples atalho.`
        ]
      : isSaudeOuEmagrecimento
        ? [
            "Olhe bem para esta imagem. Se você se identifica com aquela sensação de cansaço extremo ao se olhar no espelho todas as manhãs de sua rotina corrida, preste muita atenção nos próximos 90 segundos.",
            "O que eu vou te de velar aqui hoje vai contra as promessas tradicionais e dietas insustentáveis que te venderam nas redes sociais. Mas as sensações reais não mentem.",
            `Você já se perguntou por que algumas pessoas conseguem esbanjar "${promessa}" de forma tão fácil, enquanto você sofre há meses sem sair do lugar? O segredo é um detox celular.`
          ]
        : isSaaS
          ? [
              `Se você gerencia ou desenvolve uma ferramenta SaaS ou startup digital e perde horas preciosas da sua semana lidando com os gargalos operacionais gerados por ${problema}, preste muita atenção nos próximos 90 segundos.`,
              `O que eu vou te de velar aqui hoje vai contra tudo o que os gurus de finanças dizem sobre investir em sistemas e consultorias caras para escalar seu faturamento de software.`,
              `Você já parou para calcular quanto o gargalo técnico de ${problema} está custando todo santo mês em termos de hora de trabalho da sua equipe de TI? Existe uma rota simples.`
            ]
          : [
              `Preste atenção: se você convive rotineiramente com o problema incômodo de ${problema}, pare tudo o que estiver fazendo e ouça este comunicado importante de 90 segundos.`,
              `O que eu vou te demonstrar de forma direta hoje vai te poupar dezenas de horas de esforço inútil e frustrações acumuladas tentando consertar esse gargalo sozinho.`,
              `Você já parou para pensar por que resolver este ponto parece tão complexo e cansativo para você, enquanto outros alcançam "${promessa}" instantaneamente? Existe uma rota simples.`
            ];

    // Adaptive internal dialogue and fears
    const falasAntesDormir = isDesignOuArquitetura
      ? [
          "Será que vou conseguir entregar o render desse apartamento do cliente amanhã sem travar?",
          "Não aguento mais esse computador lento e essas luzes que nunca ficam realistas de verdade.",
          "Estou cobrando muito barato perto do tempo exaustivo que passo na frente da tela...",
          "Se meu portfólio não melhorar, vou perder os melhores clientes da minha região para novatos.",
          "Todo mundo na internet parece fazer imagens profissionais lindas em minutos, só eu que sofro tanto."
        ]
      : isSaudeOuEmagrecimento
        ? [
            "Não aguento mais me olhar no espelho and me sentir tão cansada, pesada e sem energia.",
            "Minha auto-estima está totalmente lá embaixo e tenho medo de nunca mais conseguir meu corpo de antes.",
            "Por que é tão difícil para mim manter a disciplina e constância de hábitos na alimentação corrida?",
            "Amanhã preciso começar sério a fazer alguma mudança prática pela minha própria saúde...",
            "Sinto que estou envelhecendo mais rápido e meu corpo está cansado das tarefas mais básicas."
          ]
        : [
            `Não aguento mais arrastar essa pendência do problema de ${problema} sem uma solução definitiva na rotina.`,
            `Estou perdendo muito tempo precioso ou dinheiro tentando resolver esse gargalo de forma amadora sozinho.`,
            `Amanhã preciso focar e acabar com essa lentidão ou dor que me estressa de vez.`,
            `Por que essa questão que parece tão comum é tão difícil e cansativa de se resolver de forma prática?`,
            `Tenho medo de ficar estagnado no mesmo patamar enquanto vejo os outros avançado de forma rápida.`
          ];

    const falasAoAcordar = isDesignOuArquitetura
      ? [
          "Mais um dia inteiro de estresse com prazo estourado e arquivos pesados na tela.",
          "Espero do fundo do coração que o render pesado que deixei processando de madrugada não tenha travado o notebook.",
          "Minha cabeça já começa o dia cheia de ansiedade com as alterações repetitivas de clientes exigentes."
        ]
      : isSaudeOuEmagrecimento
        ? [
            "Mais um dia acordando sem disposição nenhuma, com aquela fadiga corporal pesada de sempre.",
            "Que desânimo terrível de ter que vestir essa roupa que já está apertando e me incomodando na cintura.",
            "Parece que a noite inteira de sono não foi suficiente de jeito nenhum para descansar o meu corpo exausto."
          ]
        : [
            `Hoje de novo vou ter que lidar com essa preocupação e peso gerado pelo problema de ${problema}.`,
            `Espero conseguir desenrolar meu fluxo de trabalho diário de forma direta e sem novas frustrações técnicos.`,
            `Tem que ter um jeito definitivo, mais fácil e barato de arrumar isso sem perder o dia todo.`
          ];

    const falasAoVerProblema = isDesignOuArquitetura
      ? [
          "Olha isso, essa iluminação ficou horrível e com ruído artificial, parece trabalho de iniciante.",
          "O programa travou de novo bem na hora de salvar! Que desespero absurdo e que desperdício de tempo.",
          "De novo vou ter que mandar mensagem curta inventando desculpa para o cliente e atrasando a entrega.",
          "Essa maquete eletrônica parece muito simples e sem realismo, no meu portfólio de vendas isso me queima."
        ]
      : isSaudeOuEmagrecimento
        ? [
            "Nenhuma das minhas calças e roupas favoritas quer fechar de forma confortável mais, que vergonha silenciosa.",
            "Essa balança do banheiro só sobe ou trava na mesma meta chata inalcançável de todas as semanas.",
            "Sinto esse inchaço abdominal horrível na barriga perto das outras pessoas no ambiente social.",
            "Minhas fotos de meses atrás me dão uma saudade enorme de quando eu esbanjava leveza natural."
          ]
        : [
            `Olha esse erro, lentidão ou barreira de novo interrompendo minhas metas diárias comuns.`,
            `Gastei tanto tempo e esforço precioso com isso e continua tudo exatamente igual, que arrependimento doentio.`,
            `O problema de ${problema} me consome a paciência e me drena o vigor toda vez que me deparo com ele.`,
            `Isso está muito amador e desatualizado, preciso resolver esse gargalo urgentemente de forma barata.`
          ];

    const falasAoVerAnuncio = isDesignOuArquitetura
      ? [
          `Será que esse método com templates de modelagem e cliques fáceis ensina de verdade ou é só teoria de curso caro?`,
          `Promete realismo em minutos... Se isso funcionar vai salvar minha produtividade e meus fins de semana desse mês.`,
          `Por apenas R$ ${preco || "19,90"} vale o risco total de comprar e testar para ver se destrava meu render.`
        ]
      : isSaudeOuEmagrecimento
        ? [
            "Outro anúncio na internet prometendo emagrecimento fácil... Será que funciona ou é só mais um golpe de chá?",
            "Se esse protocolo de 10 minutos por dia for de verdade e natural, vale demais a tentativa para a saúde.",
            `Por apenas R$ ${preco || "19,90"} eu arrisco o teste tranquilo, é menos do que gasto com bobeiras na padaria.`
          ]
        : [
            `Será que esse guia "${nome}" entrega mesmo o atalho prático por clique ou é apenas enrolação barulhenta?`,
            `A promessa de "${promessa}" parece maravilhosa para mim, e por esse preço não tenho por que hesitar.`,
            `Como tem reembolso e garantia de uma semana completa, vou garantir minha cópia hoje mesmo sem medo de errar.`
          ];

    // Fears adaptados
    const medoCenarioInvisivelDesc = isDesignOuArquitetura
      ? "O pavor de ficar obsoleto no mercado por não dominar as técnicas ágeis modernas de modelagem e renderização 3D, ver profissionais recém-formados entregando trabalhos muito superiores e perdendo os melhores orçamentos de projetos."
      : isSaudeOuEmagrecimento
        ? "O medo latente de que pequenas inflamações e a fadiga corporal diária se transformem em problemas de saúde metabólica graves, diabetes ou cansaço crônico irreversível no longo prazo."
        : `O receio de ver sua produtividade ou finanças se deteriorarem silenciosamente pela repetição de processos obsoletos e a falta de solução prática para o problema de ${problema}.`;

    const medoCenarioInvisivelCopy = isDesignOuArquitetura
      ? "Enquanto você adia destravar o seu fluxo rápido nas maquetes, a concorrência se atualiza, conquista e domina os melhores clientes de alto padrão da sua cidade."
      : isSaudeOuEmagrecimento
        ? "Não espere uma consulta médica alarmante ou exames assustadores para começar a cuidar do seu equilíbrio e desinflamação celular profunda hoje."
        : `A inércia diária em relação a este gargalo acumula prejuízos silenciosos em sua produtividade e paz mental a cada dia que passa.`;

    const medoSocialDesc = isDesignOuArquitetura
      ? "Receber críticas negativas embaraçosas dos clientes exigentes de projeto por conta de detalhes mal configurados, iluminação vazada ou prazos estourados."
      : isSaudeOuEmagrecimento
        ? "Ser alvo de comentários maliciosos ou olhares de reprovação de amigos ou parentes devido à aparência física cansada, abatida ou ganho de peso visível."
        : `A humilhação secreta de admitir para concorrentes, parceiros ou familiares próximos de que você continua travado com esta pendência comum por falta de conhecimento.`;

    const medoSocialCopy = isDesignOuArquitetura
      ? "Evite o constrangimento terrível de ter que dar desculpas técnicas de computadores travando para o cliente que paga caro pelo seu trabalho."
      : isSaudeOuEmagrecimento
        ? "Imagine a sensação maravilhosa de voltar a vestir o que quer e frequentar eventos sociais com extremo orgulho, leveza e livre de julgamentos."
        : `Conquiste o respeito de todos ao resolver esse gargalo de forma autônoma e com maestria rápida sem depender de terceiros.`;

    const medoDependenciaDesc = isDesignOuArquitetura
      ? "A crença de que precisa gastar milhares de reais na compra de computadores milionários de última geração por não saber configurar inteligentemente os materiais e as texturas."
      : isSaudeOuEmagrecimento
        ? "Ficar quimicamente dependente de remédios de tarja preta caros e pílulas agressivas de restrição alimentar com efeitos colaterais de taquicardia."
        : `Ficar dependente por tempo indeterminado de mensalidades de plataformas caras, taxas surpresas ou consultorias recorrentes de terceiros para o problema de ${problema}.`;

    const medoDependenciaCopy = isDesignOuArquitetura
      ? "Não gaste uma fortuna montando PCs caros antes de aprender as técnicas seniores de otimização de render e blocos leves."
      : isSaudeOuEmagrecimento
        ? "Fuja do perigo de fórmulas milagrosas agressivas que arruínam as paredes do seu estômago e desregulam seu humor celular."
        : `Conquiste a independência técnica total resolvendo essa pendência em minutos com um método que é seu para sempre.`;

    const medoBonusTitulo = isDesignOuArquitetura
      ? "A Paralisia do Portfólio Vazio"
      : isSaudeOuEmagrecimento
        ? "A Cilada do Efeito Rebote"
        : "A Fraqueza de Execução";

    const medoBonusDesc = isDesignOuArquitetura
      ? "O pavor constante de ver sua pasta de projetos estagnada por falta de imagens com qualidade impressionante que atraiam contatos orgânicos no Instagram comercial."
      : isSaudeOuEmagrecimento
        ? "O pesadelo cíclico de conseguir perder peso ou desinchar por algumas semanas e recuperar todo o dobro de peso no mês seguinte ao parar a dieta."
        : `O receio velado de que você nunca terá a disciplina ou inteligência necessária para solucionar a questão de ${problema} de forma sustentável no dia a dia.`;

    const medoBonusCopy = isDesignOuArquitetura
      ? "Construa um portfólio visual inquestionável que te dê a autoridade necessária para cobrar o preço de projeto justo que você merece."
      : isSaudeOuEmagrecimento
        ? "Ative as vias biológicas de desinflamação natural de forma gentil para treinar o seu organismo a queimar e desinchar de forma contínua."
        : `Destrave sua autoconfiança de executor com um roteiro claro que remove toda a confusão da frente de forma simples.`;

    // Framework cultural
    const elementoProvaReal = isDesignOuArquitetura
      ? "Renders reais comparativos de Antes e Depois"
      : isSaudeOuEmagrecimento
        ? "Histórias reais de transformação com prints amigáveis no WhatsApp comercial"
        : "Demonstrações reais sequenciais passo a passo comparando tempo real versus atalho";

    const comoUsarProvaReal = isDesignOuArquitetura
      ? "Exiba maquetes comuns pálidas na esquerda e maquetes ultra-realistas na direita detalhando o menor tempo de processamento necessário."
      : isSaudeOuEmagrecimento
        ? "Mostre depoimentos calorosos de pessoas comuns conversando sobre como ganharam saúde celular e leveza corporal após a primeira semana."
        : `Coloque prints reais ressaltando de forma limpa como o método reduz o tempo gasto na lida com ${problema}.`;

    const analogiaEvitar = isDesignOuArquitetura
      ? "Aulas excessivamente extensas baseadas na história de softwares e ferramentas complexas 3D."
      : isSaudeOuEmagrecimento
        ? "Tabelas calóricas insustentáveis de biologia fria e jargões e receitas extremamente restritivas."
        : "Roteiros genéricos puramente teóricos de livros prolixos que não focam na velocidade.";

    const alternativaEvitar = isDesignOuArquitetura
      ? "Focar em ensinar truques, macetes de iluminação e fornecer templates editáveis prontos para copiar na rotina."
      : isSaudeOuEmagrecimento
        ? "Conceder listas de substituições de alimentos inteligentes fáceis de encontrar no mercadinho de bairro local."
        : `Entregar checklist interativo passo-a-passo voltado à economia de tempo de lida com ${problema}.`;

    const simulatedDossier = {
      produto: nome,
      nicho: nicho,

      definicao_clinica: {
        titulo: `Análise Psicofisiológica de ${nome}`,
        descricao: `Este dossiê investiga a psicologia profunda do público de "${publico || "público em geral"}" que sofre diariamente com o problema de "${problema}". O sofrimento não é apenas prático, mas afeta sua autoimagem e saúde emocional. O produto oferece a promessa de "${promessa}" por apenas R$ ${preco || "19,90"}. No entanto, para convencê-los, devemos ir além da promessa lógica e tocar em gatilhos específicos ocultos de conversão.`,
        gatilhos_especificos: [
          {
            nome: "Efeito Rebote e Desesperança",
            descricao: `O sentimento latente de que "eu já tentei de tudo e nada funciona para mim", gerando medo de investir novamente em algo que trará frustração.`,
            angulo_de_copy: `Não é culpa sua se as tentativas anteriores falharam. Elas atacavam apenas o sintoma superficial, não a causa principal deste problema.`
          },
          {
            nome: "Surgimento da Impaciência Dolorosa",
            descricao: `A dor da lentidão. O público quer respostas rápidas porque o convívio com "${problema}" gera estresse constante a cada minuto que passa.`,
            angulo_de_copy: `Como este método simplifica e foca em cliques e processos diretos, você começa a sentir os resultados e o alívio imediatamente de forma simples.`
          },
          {
            nome: "Sentimento de Inadequação e Julgamento",
            descricao: `O receio inconsciente de ser julgado ou receber olhares reprovadores de colegas ou parceiros por não conseguir resolver essa pendência individual sozinho.`,
            angulo_de_copy: `Siga o protocolo no conforto do seu ritmo de forma discreta, longe de cobranças externas ou de conselhos prepotentes de especialistas.`
          },
          {
            nome: "Anestesia Prática Temporária",
            descricao: `Mecanismo de defesa onde o comprador finge que não se importa tanto com a situação para diminuir a carga mental da vergonha.`,
            angulo_de_copy: `Chega de mentir para si mesmo dizendo que está tudo bem quando, no fundo, você sabe que cada dia sem agir é tempo e esforço desperdiçados.`
          }
        ]
      },

      persona: {
        nome_ficticio: personaNome,
        idade_range: personaIdade,
        genero: personaGenero,
        profissao: personaProfissao,
        estado_civil: "Casado(a) / União Estável",
        renda_mensal: "R$ 2.200 a R$ 4.500",
        onde_mora: "Bairro de classe média em capital ou grande centro urbano nacional",
        rotina_destruida: rotinaDestruida,
        momento_de_ruptura: momentoDeRuptura
      },

      dor_latente: {
        dor_superficial: `Dificuldade diária com ${problema}. Não consegue atingir ${promessa} de jeito nenhum de forma consistente.`,
        dor_real: dorReal,
        dor_identitaria: dorIdentitaria,
        vergonha_oculta: vergonhaOculta
      },

      falhas_do_mercado: {
        tentativas_anteriores: tentativasAnteriores,
        frustracao_acumulada: `A sensação de estar correndo em círculos criou uma casca de desconfiança crônica e ceticismo nas redes. Ela se sente explorada pelas promessas vazivas do mercado e desamparada por não encontrar um caminho simples que respeite sua rotina pesada.`
      },

      fala_interna: {
        antes_de_dormir: falasAntesDormir,
        ao_acordar: falasAoAcordar,
        ao_ver_o_problema: falasAoVerProblema,
        ao_ver_anuncio: falasAoVerAnuncio
      },

      medos_aterrorizantes: {
        medo_do_cenario_invisivel: {
          "titulo": "O Abismo Silencioso",
          "descricao": medoCenarioInvisivelDesc,
          "frase_de_copy": medoCenarioInvisivelCopy
        },
        medo_social: {
          "titulo": "Incompetência e Julgamento",
          "descricao": medoSocialDesc,
          "frase_de_copy": medoSocialCopy
        },
        medo_de_dependencia: {
          "titulo": "Dependência e Extorsão",
          "descricao": medoDependenciaDesc,
          "frase_de_copy": medoDependenciaCopy
        },
        medo_da_inacao: {
          "titulo": "Remorso dos Meses Perdidos",
          "descricao": "O medo de olhar para trás daqui a alguns meses e perceber que perdeu a chance de resolver isso por apenas o valor de um cafezinho hoje.",
          "frase_de_copy": "Onde você estará daqui a 90 dias se decidir continuar ignorando este gargalo hoje?"
        },
        medo_bonus: {
          "titulo": medoBonusTitulo,
          "descricao": medoBonusDesc,
          "frase_de_copy": medoBonusCopy
        }
      },

      framework_cultural_br: {
        o_que_funciona: [
          {
            elemento: elementoProvaReal,
            por_que_funciona: "O brasileiro confia muito mais na demonstração de pares reais e exemplos cotidianos práticos do que em teorias frias de especialistas engravatados.",
            como_usar: comoUsarProvaReal
          },
          {
            elemento: "Garantia Total Incondicional de 7 Dias",
            por_que_funciona: "Por haver muitos sites fictícios no ar, a garantia incondicional e direta remove o medo de perder dinheiro.",
            como_usar: "Deixe claro: 'Se você não gostar ou achar que não é pra você, sinta-se seguro: devolvemos seu dinheiro.'"
          },
          {
            elemento: "Entrega Automatizada e Suporte Amigável",
            por_que_funciona: "Qualquer fricção técnica no acesso ao arquivo ou e-book gera desistência rápida na hora de ler.",
            como_usar: "Explique de forma visual que o acesso ao material chega de forma instantânea e configurada direto no e-mail ou WhatsApp corporativo."
          },
          {
            elemento: "Comparação de Preço com Bens de Consumo Irrelevantes",
            por_que_funciona: "O cérebro justifica de forma imediata o investimento ao compará-lo a um gasto bobo, como chocolate ou cafezinho.",
            como_usar: `Mostre que o valor de R$ ${preco || "19,90"} é menor do que uma pizza barata de fim de semana, poupando semanas de estresse.`
          },
          {
            elemento: "Uso de Linguagem Fluida do Dia a Dia",
            por_que_funciona: "O brasileiro se sente conectado e acolhido por pessoas que falam a sua língua comum sem termos arrogantes.",
            como_usar: "Substitua teorias difíceis ou palavras complicadas por explicações diretas fáceis de assimilar na hora."
          }
        ],
        o_que_evitar: [
          {
            elemento: "Visual excessivamente técnico acadêmico",
            por_que_repele: analogiaEvitar,
            alternativa: alternativaEvitar
          },
          {
            elemento: "Complexidade exagerada no processo",
            por_que_repele: "Processos com dezenas de etapas geram ansiedade e fadiga de execução imediata.",
            alternativa: "Apresentar como um protocolo simples, um roteiro prático e rápido que pode ser aplicado de forma ágil."
          },
          {
            elemento: "Expressões Estrangeiras sem Tradução",
            por_que_repele: "Termos fora da nossa realidade fazem parecer que a solução é importada, cara ou impraticável no Brasil.",
            alternativa: "Apoiar-se em termos nacionais conhecidos e gírias amigáveis."
          },
          {
            elemento: "Garantias Extensas com Cláusulas e Regras",
            por_que_repele: "Falar de forma puramente técnica ou jurídica passa a impressão de que haverá pegadinhas para estorno.",
            alternativa: "Utilizar texto simples: 'Se não servir, manda um e-mail curto e faremos o estorno integral sem perguntas.'"
          }
        ],
        palavras_que_convertem: ["Garantido", "Passo a Passo", "Atalho Prático", "Sem Enrolação", "Economia de Tempo", "Acesso Imediato", "Clique por Clique", "Fórmula Simples"],
        palavras_que_afastam: ["Teoria Complexa", "Burocracia Extensa", "Manual Científico", "Assinatura Mensal", "Consulte Sempre", "Contrato", "Processamento Demorado"]
      },

      arsenal_de_copy: {
        headlines_de_dor: headlinesDeDor,
        headlines_de_medo: headlinesDeMedo,
        aberturas_de_vsl: aberturasVsl,
        provas_sociais_ficticias: [
          provaSocialFicticia1,
          provaSocialFicticia2,
          provaSocialFicticia3
        ],
        cta_urgencia: [
          `⚠️ Atenção: Toque abaixo para aproveitar o preço promocional antes que a oferta expire e saia do ar em definitivo.`,
          `Garanta seu acesso seguro ao guia completo por apenas R$ ${preco || "19,90"} hoje com todos os arquivos bônus de cortesia incluídos!`,
          `Toque no botão agora mesmo e destrave seu fluxo sem nenhum perigo: você conta com garantia incondicional de 7 dias com reembolso fácil.`,
          `Restam pouquíssimas licenças de desconto promocional configuradas para o lote atual da sua região no Brasil.`,
          `Clique abaixo e resolva essa pendência que estressa sua rotina de uma vez por todas.`
        ]
      }
    };

    return res.json({ success: true, simulated: true, dossier: simulatedDossier });
  }

  try {
    const promptText = `Você é um Psicanalista de Consumo e Copywriter de Resposta Direta sênior especializado no mercado brasileiro.
O usuário enviou os seguintes dados do produto low ticket dele:
- Nome do Produto: ${nome}
- Nicho: ${nicho}
- Promessa Principal: ${promessa}
- Problema Central: ${problema}
- Público-Alvo Inicial: ${publico || "Não especificado"}
- Preço do Produto (Ticket): R$ ${preco || "Não especificado"}

ATENÇÃO CRÍTICA (REQUISITO NÃO NEGOCIÁVEL): 
Sua geração deve ser 100% focada, adaptada e exclusiva para o nicho informado: "${nicho}" e para o problema central: "${problema}". 
Você está ESTREITAMENTE PROIBIDO de mencionar conceitos de perda de peso, metabolismo, dietas, shakes, treinos de academia, pílulas ou termos médicos, A MENOS QUE o nicho solicitado seja explicitamente saúde ou emagrecimento! 
Se o nicho for sobre arquitetura, SaaS, design, negócios ou finanças, toda a psicologia profunda, dores reais, falhas do mercado, medos e copies gerados devem falar estritamente desses respectivos temas (arquivos pesados, renderização lenta, travamento, automação, churn, faturamento, etc.). Isolar os nichos é uma prioridade absoluta contra poluição cruzada!

Sua missão é construir um Dossiê Psicológico de Público-Alvo extremamente clínico, profundo e de elite, pronto para ser usado para guiar criativos, anúncios no Meta Ads e VSLs brasileiras de alta conversão.

Por favor, gere um JSON estrito seguindo rigorosamente a estrutura detalhada abaixo:

{
  "produto": "${nome}",
  "nicho": "${nicho}",

  "definicao_clinica": {
    "titulo": "Título da definição clínica brasileira adaptada ao tema",
    "descricao": "Parágrafo clínico, denso e extremamente preciso sobre quem é esse público e por que eles agem como agem ao tentar resolver este problema do produto.",
    "gatilhos_especificos": [
      {
        "nome": "Nome do Gatilho 1 (Ex: Ansiedade Operacional / Perda de Margem)",
        "descricao": "1-2 frases explicando esse gatilho de forma psicológica profunda focada no nicho.",
        "angulo_de_copy": "Como usar esse gatilho em copy. Ex: Uma frase pronta de alto impacto em aspas focada no nicho."
      }
    ]
  },

  "persona": {
    "nome_ficticio": "Nome fictício representativo brasileiro para o nicho",
    "idade_range": "Ex: 25-45 anos",
    "genero": "Ex: Misto ou Feminino ou Masculino",
    "profissao": "Ex: Profissão coerente com o nicho",
    "estado_civil": "Estado civil típico",
    "renda_mensal": "Ex: R$ 2.500 a R$ 5.000",
    "onde_mora": "Onde mora nacionalmente (ex: grande capital brasileira)",
    "rotina_destruida": "Um parágrafo detalhado descrevendo como o problema destrói o dia a dia dessa pessoa desde o despertar até a hora de deitar, coerente com o nicho de forma super profunda.",
    "momento_de_ruptura": "O momento de ruptura exato (gatilho humilhante, frustrante ou marcante) que faz a pessoa decidir que precisa comprar a solução imediatamente, coerente com o nicho."
  },

  "dor_latente": {
    "dor_superficial": "O que ela diz verbalmente que sente sobre o problema",
    "dor_real": "O que ela realmente sente de forma profunda, dolorosa, visceral e silenciosa, de acordo com o nicho",
    "dor_identitaria": "Como o problema afeta quem ela é e como ela se enxerga como profissional ou pessoa",
    "vergonha_oculta": "A vergonha secreta que ela nunca conta pra ninguém, de acordo com o problema central"
  },

  "falhas_do_mercado": {
    "tentativas_anteriores": [
      {
        "tentativa": "Nome da tentativa anterior falha (Ex: softwares caros ou cursos prolixos)",
        "quanto_gastou": "R$ aproximado gasto",
        "por_que_falhou": "Causa real de ter falhado",
        "crenca_formada": "A crença limitante ou desconfiança que se instalou nela após a falha"
      }
    ],
    "frustracao_acumulada": "Um parágrafo descrevendo o estado de cinismo emocional do comprador pelas falhas anteriores do mercado no nicho."
  },

  "fala_interna": {
    "antes_de_dormir": ["Mínimo 5 frases exatas que ela sussurra para si mesma ou pensa na cama na escuridão coerente com o nicho"],
    "ao_acordar": ["Mínimo 3 pensamentos fadigados logo ao abrir os olhos coerente com o nicho"],
    "ao_ver_o_problema": ["Mínimo 4 pensamentos exatos ao se deparar com o problema na vida real (frente ao computador travado, olhando planilhas, operando no dia a dia, etc.)"],
    "ao_ver_anuncio": ["Mínimo 3 reações internas sinceras/desconfiadas ao ver um anúncio do produto"]
  },

  "medos_aterrorizantes": {
    "medo_do_cenario_invisivel": {
      "titulo": "Título do medo do futuro invisível",
      "descricao": "Medo do que vai acontecer no futuro si ela procrastinar e não tratar isso silenciosamente no nicho.",
      "frase_de_copy": "Frase de copy pronta atacando este medo."
    },
    "medo_social": {
      "titulo": "Título do medo de humilhação social",
      "descricao": "Medo de como os colegas ou concorrentes a julgam pelo problema no nicho.",
      "frase_de_copy": "Frase de copy pronta atacando este medo."
    },
    "medo_de_dependencia": {
      "titulo": "Título do medo de dependência futura",
      "descricao": "Medo de ficar refém de ferramentas adicionais caras ou de terceiros por tempo indefinido.",
      "frase_de_copy": "Frase de copy pronta atacando este medo."
    },
    "medo_da_inacao": {
      "titulo": "Título do medo de inação",
      "descricao": "Medo do arrependimento amargo no futuro por não ter aproveitado a oportunidade de ouro hoje.",
      "frase_de_copy": "Frase de copy pronta atacando este medo."
    },
    "medo_bonus": {
      "titulo": "Título de um 5º medo bônus altamente customizado para este nicho",
      "descricao": "Pavor adicional e ultra-específico aplicável à sua dor.",
      "frase_de_copy": "Frase de copy pronta atacando este medo bônus."
    }
  },

  "framework_cultural_br": {
    "o_que_funciona": [
      {
        "elemento": "Fatores culturais brasileiros específicos que geram conversão para o nicho (mínimo 5)",
        "por_que_funciona": "Explicação do comportamento social brasileiro no nicho",
        "como_usar": "Como operacionalizar essa verdade em anúncios brasileiros"
      }
    ],
    "o_que_evitar": [
      {
        "elemento": "Atitudes, termos ou abordagens que destroem a conversão no Brasil para o nicho (mínimo 4)",
        "por_que_repele": "Por que o brasileiro comum rejeita isso de imediato no nicho",
        "alternativa": "O que fazer no lugar"
      }
    ],
    "palavras_que_convertem": ["Mínimo 8 palavras ou jargões mágicos que geram conexões diretas rápidas no Brasil para o nicho"],
    "palavras_que_afastam": ["Mínimo 5 palavras técnicas, pretensiosas ou que acionam alerta burocrático no comprador para o nicho"]
  },

  "arsenal_de_copy": {
    "headlines_de_dor": ["Mínimo 5 headlines de alto impacto focadas nas dores profundas no nicho"],
    "headlines_de_medo": ["Mínimo 5 headlines de alta retenção focadas em desastres futuros invisíveis no nicho"],
    "aberturas_de_vsl": ["Mínimo 3 frases iniciais hipnóticas de ganchos rápidos para reter público nos primeiros segundos do vídeo no nicho"],
    "provas_sociais_ficticias": ["Mínimo 3 exemplos no formato coloquial de depoimentos reais do WhatsApp de brasileiros do nicho elogiando a solução e o custo/benefício comercial"],
    "cta_urgencia": ["Mínimo 5 chamadas para ação diretas focando no preço do low ticket, escassez de vagas e garantia de risco zero no nicho"]
  }
}

Importante:
- Siga estritamente o formato JSON. Não use markdown no início ou fim como "\`\`\`json". A resposta deve ser apenas o JSON legível.
- Não envie explicações em texto fora do JSON.
- Forneça no mínimo as quantidades solicitadas em cada seção ou array para que o material seja rico e profissional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            produto: { type: Type.STRING },
            nicho: { type: Type.STRING },
            definicao_clinica: {
              type: Type.OBJECT,
              properties: {
                titulo: { type: Type.STRING },
                descricao: { type: Type.STRING },
                gatilhos_especificos: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      nome: { type: Type.STRING },
                      descricao: { type: Type.STRING },
                      angulo_de_copy: { type: Type.STRING }
                    },
                    required: ["nome", "descricao", "angulo_de_copy"]
                  }
                }
              },
              required: ["titulo", "descricao", "gatilhos_especificos"]
            },
            persona: {
              type: Type.OBJECT,
              properties: {
                nome_ficticio: { type: Type.STRING },
                idade_range: { type: Type.STRING },
                genero: { type: Type.STRING },
                profissao: { type: Type.STRING },
                estado_civil: { type: Type.STRING },
                renda_mensal: { type: Type.STRING },
                onde_mora: { type: Type.STRING },
                rotina_destruida: { type: Type.STRING },
                momento_de_ruptura: { type: Type.STRING }
              },
              required: ["nome_ficticio", "idade_range", "genero", "profissao", "estado_civil", "renda_mensal", "onde_mora", "rotina_destruida", "momento_de_ruptura"]
            },
            dor_latente: {
              type: Type.OBJECT,
              properties: {
                dor_superficial: { type: Type.STRING },
                dor_real: { type: Type.STRING },
                dor_identitaria: { type: Type.STRING },
                vergonha_oculta: { type: Type.STRING }
              },
              required: ["dor_superficial", "dor_real", "dor_identitaria", "vergonha_oculta"]
            },
            falhas_do_mercado: {
              type: Type.OBJECT,
              properties: {
                tentativas_anteriores: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tentativa: { type: Type.STRING },
                      quanto_gastou: { type: Type.STRING },
                      por_que_falhou: { type: Type.STRING },
                      crenca_formada: { type: Type.STRING }
                    },
                    required: ["tentativa", "quanto_gastou", "por_que_falhou", "crenca_formada"]
                  }
                },
                frustracao_acumulada: { type: Type.STRING }
              },
              required: ["tentativas_anteriores", "frustracao_acumulada"]
            },
            fala_interna: {
              type: Type.OBJECT,
              properties: {
                antes_de_dormir: { type: Type.ARRAY, items: { type: Type.STRING } },
                ao_acordar: { type: Type.ARRAY, items: { type: Type.STRING } },
                ao_ver_o_problema: { type: Type.ARRAY, items: { type: Type.STRING } },
                ao_ver_anuncio: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["antes_de_dormir", "ao_acordar", "ao_ver_o_problema", "ao_ver_anuncio"]
            },
            medos_aterrorizantes: {
              type: Type.OBJECT,
              properties: {
                medo_do_cenario_invisivel: {
                  type: Type.OBJECT,
                  properties: { titulo: { type: Type.STRING }, descricao: { type: Type.STRING }, frase_de_copy: { type: Type.STRING } },
                  required: ["titulo", "descricao", "frase_de_copy"]
                },
                medo_social: {
                  type: Type.OBJECT,
                  properties: { titulo: { type: Type.STRING }, descricao: { type: Type.STRING }, frase_de_copy: { type: Type.STRING } },
                  required: ["titulo", "descricao", "frase_de_copy"]
                },
                medo_de_dependencia: {
                  type: Type.OBJECT,
                  properties: { titulo: { type: Type.STRING }, descricao: { type: Type.STRING }, frase_de_copy: { type: Type.STRING } },
                  required: ["titulo", "descricao", "frase_de_copy"]
                },
                medo_da_inacao: {
                  type: Type.OBJECT,
                  properties: { titulo: { type: Type.STRING }, descricao: { type: Type.STRING }, frase_de_copy: { type: Type.STRING } },
                  required: ["titulo", "descricao", "frase_de_copy"]
                },
                medo_bonus: {
                  type: Type.OBJECT,
                  properties: { titulo: { type: Type.STRING }, descricao: { type: Type.STRING }, frase_de_copy: { type: Type.STRING } },
                  required: ["titulo", "descricao", "frase_de_copy"]
                }
              },
              required: ["medo_do_cenario_invisivel", "medo_social", "medo_de_dependencia", "medo_da_inacao", "medo_bonus"]
            },
            framework_cultural_br: {
              type: Type.OBJECT,
              properties: {
                o_que_funciona: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      elemento: { type: Type.STRING },
                      por_que_funciona: { type: Type.STRING },
                      como_usar: { type: Type.STRING }
                    },
                    required: ["elemento", "por_que_funciona", "como_usar"]
                  }
                },
                o_que_evitar: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      elemento: { type: Type.STRING },
                      por_que_repele: { type: Type.STRING },
                      alternativa: { type: Type.STRING }
                    },
                    required: ["elemento", "por_que_repele", "alternativa"]
                  }
                },
                palavras_que_convertem: { type: Type.ARRAY, items: { type: Type.STRING } },
                palavras_que_afastam: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["o_que_funciona", "o_que_evitar", "palavras_que_convertem", "palavras_que_afastam"]
            },
            arsenal_de_copy: {
              type: Type.OBJECT,
              properties: {
                headlines_de_dor: { type: Type.ARRAY, items: { type: Type.STRING } },
                headlines_de_medo: { type: Type.ARRAY, items: { type: Type.STRING } },
                aberturas_de_vsl: { type: Type.ARRAY, items: { type: Type.STRING } },
                provas_sociais_ficticias: { type: Type.ARRAY, items: { type: Type.STRING } },
                cta_urgencia: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["headlines_de_dor", "headlines_de_medo", "aberturas_de_vsl", "provas_sociais_ficticias", "cta_urgencia"]
            }
          },
          required: [
            "produto", "nicho", "definicao_clinica", "persona", "dor_latente",
            "falhas_do_mercado", "fala_interna", "medos_aterrorizantes",
            "framework_cultural_br", "arsenal_de_copy"
          ]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return res.json({ success: true, simulated: false, dossier: data });
  } catch (err: any) {
    console.error("Gemini Audience Dossier execution failed:", err);
    return res.status(500).json({ success: false, error: "Falha ao processar dossiê científico: " + err.message });
  }
});

// 1.9. POST Gerador de Funil - Landpage (Gemini API Integration)
app.post("/api/generate-landpage", async (req, res) => {
  const { dossie, nome, nicho, promessa, problema, preco, mecanismo, plataforma, esteira, objecoes } = req.body;

  if (!nome || !nicho || !promessa) {
    return res.status(400).json({ success: false, error: "Nome do produto, nicho e promessa são obrigatórios." });
  }

  const ai = getGeminiFromReq(req);

  if (!ai) {
    // Generate robust dynamic high-fidelity simulated response when GEMINI_API_KEY is not defined
    const simulatedLandpage = {
      produto: nome,
      modo: "landpage",
      estrutura_copy: {
        secao_hero: {
          pre_headline: `Método Exclusivo Revelado para o Nicho de ${nicho.toUpperCase()}:`,
          headline_principal: `Como Ativar a Promessa de "${promessa}" e Resolver o Problema de "${problema || "fórmulas que não funcionam"}" de Vez`,
          subheadline: `Entenda o segredo prático por trás do método "${nome}" que vem revolucionando o mercado nacional sem que você precise gastar fortunas ou sofrer com privações que só te causam desânimo celular.`,
          cta_primario: `Sim! Quero Conhecer o Método Agora`,
          elemento_de_prova: `Mais de 14.381 pessoas normais já testaram e aprovaram este atalho`,
          nota_de_urgencia: `Importante: Cada dia que você passa sem saber a real causa bioquímica deste incômodo, mais distante você fica de viver uma vida ativa ao lado de quem ama.`
        },
        secao_identificacao: {
          titulo: `Você se identifica diariamente com essa fala silenciosa?`,
          paragrafos: [
            `Se você convive diariamente com ${problema || "esse obstáculo crônico"}, sabe muito bem quanto é desgastante acordar sem ânimo ou disposição. Você sente que, por mais que tente caminhos diferentes, o seu progresso parece bloqueado por uma barreira invisível.`,
            `A maioria das pessoas falha porque é bombardeada com métodos complexos, chás milagrosos, ou tratamentos caros e cheios de pegadinhas burocráticas que prometem mundos e fundos apenas para esvaziar a sua carteira de trabalho brasileira.`,
            `O verdadeiro problema não é a sua força de vontade. É que ninguém nunca explicou para você que lutar apenas contra o sintoma superficial gera o efeito rebote e a desconfiguração do seu metabolismo ou saúde mental.`
          ],
          frases_de_espelho: [
            `"Será que a minha genética está quebrada para sempre?"`,
            `"Por que é tão fácil para os outros e tão sofrido para mim?"`,
            `"Eu sinto vergonha ao me olhar no espelho com essa roupa..."`,
            `"Eu só queria um atalho rápido de minutos que realmente dissolvesse essa raiz da dor."`
          ]
        },
        secao_agitacao: {
          titulo: `O perigo do abismo invisível que você escolhe arrastar`,
          custo_da_inacao: `Ignorar o alarme que seu corpo apresenta hoje não fará com que o problema desapareça. Muito pelo contrário: a procrastinação silenciosa age desgastando sua vitalidade dia a dia, pavimentando um caminho cansativo que custará o triplo do seu esforço e saúde familiar nos próximos 90 dias.`,
          gatilhos_especificos: [
            {
              gatilho: `Efeito Sanfona e Quebra Celular`,
              consequencia: `A perda contínua de respostas metabólicas nativas gera o dobro da fadiga muscular.`,
              frase_de_copy: `Não espere o cansaço diário virar uma indisposição irreversível para tomar uma atitude hoje.`
            },
            {
              gatilho: `Rejeição Social Intransigente`,
              consequencia: `A perda do humor e da autoconfiança desgasta de forma silenciosa as relações afetivas na sua casa.`,
              frase_de_copy: `O silêncio ou distanciamento da sua família e parceiro dói infinitamente mais que qualquer espelho.`
            }
          ],
          cenario_futuro_sombrio: `Se você optar por continuar na inação hoje, adivinha onde estará daqui a 3 meses? Exatamente no mesmo obstáculo atual, porém mais frustrado, cansado e arrependido de ter deixado mais uma chance passar por um preço simbólico.`
        },
        secao_mecanismo: {
          titulo: `Por que tudo o que você tentou antes falhou miseravelmente`,
          explicacao_das_falhas: `A concorrência quer que você continue refém de assinaturas recorrentes e pílulas milagrosas caras. Eles criam uma esteira de dependência para que você nunca fique livre de verdade de "${problema}".`,
          introducao_mecanismo: `Desta forma, para desbloquear o seu resultado, nós removemos toda a burocracia do caminho para apresentar um mecanismo único.`,
          mecanismo_unico: {
            nome: mecanismo || `Protocolo de Dissolução Biológica`,
            explicacao_leiga: `Nosso método não exige que você mude a sua rotina por completo. Ele atua restaurando de forma silenciosa o equilíbrio químico celular nativo, agindo de dentro para fora em apenas 5 minutos diários direto do seu smartphone.`,
            por_que_funciona: `Por focar integralmente na raiz em vez do sintoma estético superficial, o seu corpo absorve a rotina instantaneamente de forma natural.`,
            diferencial: `Zero enrolação acadêmica, zero remédios de efeitos colaterais severos, focando 100% no que gera ganho prático.`
          }
        },
        secao_produto: {
          titulo: `Conheça o Método Oficial "${nome}"`,
          descricao: `Um roteiro amigável e direto ao ponto, estruturado em português coloquial para que você tenha o controle total da sua mudança biológica no piloto automático por um preço menor que um lanche na padaria da esquina.`,
          o_que_voce_recebe: [
            `Guia de Ativação Direct (Leitura rápida de 12 minutos)`,
            `Passo a Passo de Execução Diária Sem Complicação`,
            `Manual Clínico Antidificuldade do ${nicho}`,
            `Acesso imediato à área exclusiva de alunos do ${nome}`
          ],
          para_quem_e: [
            `Para quem tem o dia corrido e não dispõe de horas para treinos ou leituras compridas`,
            `Para quem quer economizar com tratamentos clínicos caros que não dão nenhuma garantia`,
            `Para quem está cansado de falsidades nas redes sociais e busca um checklist pé no chão`
          ],
          para_quem_nao_e: [
            `Para quem acredita em milagres que acontecem em 24 horas sem aplicar sequer 5 minutos do manual`,
            `Para quem prefere gastar milhares de reais em cirurgias de risco no mercado tradicional`
          ]
        },
        secao_prova_social: {
          titulo: `Transformações Reais de Pessoas Comuns no Brasil`,
          introducao: `Estes depoimentos provam que o método funciona mesmo para quem estava desanimado ou achava que era mais um golpe da internet:`,
          depoimentos_modelo: [
            {
              nome: nicho === "emagrecimento" || nicho === "beleza" ? "Márcia R." : "Carlos M.",
              perfil: nicho === "emagrecimento" || nicho === "beleza" ? "Dona de casa, 43 anos, São Paulo" : "Mecânico autônomo, 49 anos, Curitiba",
              depoimento: `Eu estava super ressabiada por causa do valor tão baixo de R$ ${preco || "19,90"}. Mas resolvi tentar e em duas semanas sinto uma vitalidade que não via há anos. O ${nome} funciona de verdade!`,
              resultado_especifico: `Eliminação do cansaço e dores celulares nos primeiros 7 dias.`
            },
            {
              nome: "Renata S.",
              perfil: "Vendedora, 35 anos, Campinas",
              depoimento: `O melhor é que a gente lê e aplica em minutos. Não tem nenhuma pegadinha. Devolveu minha autoestima na primeira semana, recomendo de olhos fechados.`,
              resultado_especifico: `Resultados visíveis sem precisar mudar a rotina pesada de trabalho.`
            }
          ]
        },
        secao_oferta: {
          titulo: `Garanta Seu Acesso ao Lote Promocional Seguro`,
          ancora_de_preco: `R$ 97,00`,
          preco_real: `R$ ${preco || "19,90"}`,
          economia: `Economize R$ 77,10 com a promoção de servidor hoje`,
          justificativa_de_preco: `Nós decidimos fixar o valor em R$ ${preco || "19,90"} apenas para manter os custos da área de alunos no ar, evitando qualquer barreira financeira para os trabalhadores que realmente precisam de um ponto de virada definitivo.`,
          o_que_esta_incluso: [
            `Protocolo Completo ${nome}`,
            `Área de Alunos Premium com Suporte Integrado`,
            `Bônus Exclusivo: O Manual Secreto dos Atalhos Rápidos`,
            `Bônus 2: Mapa Mental de Hábitos Saudáveis`
          ],
          order_bumps: [
            {
              nome: `Potencializador Acelerado 2.0`,
              proposta: `Ative os resultados em dobro adicionando o guia complementar de aceleração enzimática no checkout.`,
              preco: `R$ 9,90`,
              por_que_aceitar_agora: `Metade do tempo total de ativação por um custo simbólico.`
            }
          ],
          cta_principal: `Sim, Quero Adquirir o Método com 75% Desconto`,
          urgencia_real: `Este custo promocional de servidor de apenas R$ ${preco || "19,90"} está garantido exclusivamente para o dia de hoje.`
        },
        secao_garantia: {
          titulo: `A Garantia de Satisfação "Risco Zero" de 7 Dias`,
          copy_garantia: `Nós confiamos tanto na nossa entrega do ${nome} que assumimos todo o risco por você. Faça sua inscrição agora, leia o material e implemente por uma semana. Se por qualquer motivo você não amar ou não enxergar resultados, basta mandar um único e-mail para nós que devolvemos todo o seu investimento na hora. Sem perguntas, sem ligações ou pegadinhas de contrato.`,
          duracao: `7 Dias Incondicionais`,
          frase_de_fechamento: `Ou você obtém uma verdadeira transformação, ou fica com o seu dinheiro de volta.`
        },
        secao_objecoes: {
          titulo: `Quebrando Barreiras: Suas Dúvidas Respondidas de Forma Honesta`,
          objecoes: [
            {
              objecao: `É muito barato, será que é golpe ou funciona mesmo?`,
              resposta: `Funciona de verdade justamente porque removemos intermediários e mantivemos o preço no mínimo possível para alcançar quem precisa.`,
              frase_de_virada: `Portanto, esta é a oportunidade de menor custo e maior retorno da sua vida.`
            },
            {
              objecao: `Como posso ter certeza de que vou conseguir aplicar?`,
              resposta: `O material é super didático, escrito de forma clara em português, feito especialmente para quem tem a rotina cheia.`,
              frase_de_virada: `Você fará os passos em menos de 5 minutos diários direto do celular.`
            }
          ]
        },
        secao_faq: {
          titulo: `Perguntas Frequentes`,
          perguntas: [
            {
              pergunta: `Como vou receber o material de acesso?`,
              resposta: `Logo após a confirmação do pix ou cartão, um link exclusivo seguro de acesso é disparado de forma automática para o seu e-mail e WhatsApp.`
            },
            {
              pergunta: `O pagamento é seguro?`,
              resposta: `100% criptografado e seguro. O checkout é intermediado pela plataforma oficial ${plataforma || "Kiwify"}, que protege todos os seus dados pessoais.`
            },
            {
              pergunta: `Tem taxas extras de mensalidade?`,
              resposta: `Não. O pagamento é único e dá direito a todo o material de forma vitalícia com futuras atualizações de graça.`
            }
          ]
        },
        secao_fechamento: {
          titulo: `A Decisão Está Em Suas Mãos Agora`,
          paragrafo_emocional: `Agora você tem dois caminhos bem simples pela frente. O primeiro é ignorar esta oportunidade, continuar sofrendo com ${problema} e aceitar a frustração diária. O segundo caminho é clicar no botão abaixo, arriscar um investimento irrisório de R$ ${preco || "19,90"} protegido por nossa garantia rígida, e dar início a sua mudança. Qual das duas opções faz mais sentido para o seu futuro?`,
          cta_final: `Estou Pronto: Quero Começar Minha Transformação`,
          ps: `P.S.: Nós assumimos absolutamente todo o risco. Se em 7 dias nada mudar, devolvemos seu dinheiro na hora.`
        }
      },
      prompt_para_ai_studio: `Crie uma Landing Page responsiva, moderna e otimizada para conversão mobile-first em um arquivo único HTML contendo CSS e JS inline.
Tema visual: Dark Premium com acentos em vermelho vibrante (#FF2A2A), apropriado para o produto "${nome}".
Paleta de cores: fundo saturado em cinza quase preto (#060607), textos claros em branco e cinza suave, botões de ação na cor primária chamativa com sombra vermelha suave e transições rápidas.
Abaixo está toda copy estruturada por seções que você deve integrar com precisão na página:

[HERO]
Pre-Headline: Método Exclusivo Revelado para o Nicho de ${nicho.toUpperCase()}
Título Principal: Como Ativar a Promessa de "${promessa}" e Resolver o Problema de "${problema || "fórmulas que não funcionam"}" de Vez
Subtítulo: Entenda o segredo prático por trás do método "${nome}" que vem revolucionando o mercado nacional.
CTA: Sim! Quero Conhecer o Método Agora

[PROBLEMA / IDENTIFICAÇÃO]
Seção relatando as dores ocultas em até 3 parágrafos e frases espelho que convertem como "Por que é tão fácil para os outros?".

[AGITAÇÃO DO PROBLEMA]
Frisar o custo da inação silenciosa e o abismo invisível do amanhã.

[MECANISMO ÚNICO]
Como funciona o "${mecanismo || "Protocolo de Dissolução Biológica"}" agindo sem privações em apenas 5 minutos diários direto do celular.

[PRODUTO]
Checklist dos manuais inclusos e para quem serve ou não.

[OFERTA]
Preço âncora R$ 97, economia promocional de servidor, preço real de apenas R$ ${preco || "19,90"}, plataforma de pagamentos intermediada pela ${plataforma || "Kiwify"} e order bump opcional.

[GARANTIA]
Garantia incondicional de 7 dias com texto de retirada integral de risco psicológico do comprador.

[FAQ INTERATIVO]
Perguntas frequentes interativas desenvolvidas com tags HTML <details> e <summary> limpas para acordeon nativo rápido sem scripts pesados.

Gere o código HTML autocontido com classes Tailwind CDN integradas, design mobile-first refinado, botões em 44px de toque mínimo, e transições de hover suaves.`
    };
    return res.json({ success: true, simulated: true, result: simulatedLandpage });
  }

  try {
    const promptText = `Você é um Copywriter de elite focado em info-produtos, dropshipping e ofertas de conversão direta (Low Ticket) no mercado brasileiro.
O usuário enviou as seguintes especificações do produto dele:
- Nome do Produto: ${nome}
- Nicho de Atuação: ${nicho}
- Promessa Principal: ${promessa}
- Problema Central: ${problema || "Não especificado"}
- Preço de Venda: R$ ${preco || "Não especificado"}
- Mecanismo Único: ${mecanismo || "Não especificado"}
- Plataforma de Venda: ${plataforma || "Não especificado"}
- Esteira de Maximização (Order Bumps/Upsells): ${JSON.stringify(esteira || {})}
- 4 Maiores Objeções: ${JSON.stringify(objecoes || {})}
- Dossiê do Público-Alvo: ${dossie || "Não colado. Use os dados de produto informados e preencha as descrições de forma super personalizada baseada no nicho."}

Sua missão é gerar a copy completa de uma Landing Page de Alta Conversão baseada na técnica do Custo da Inação Diária, soando como um amigo empático (sem parecer um guru arrogante), atacando gatilhos emocionais muito específicos em português brasileiro coloquial.

Você deve responder rigorosamente no formato de JSON definido pelas propriedades especificadas abaixo, sem qualquer tipo de markdown, bloco de código, ou texto fora do JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            produto: { type: Type.STRING },
            modo: { type: Type.STRING },
            estrutura_copy: {
              type: Type.OBJECT,
              properties: {
                secao_hero: {
                  type: Type.OBJECT,
                  properties: {
                    pre_headline: { type: Type.STRING },
                    headline_principal: { type: Type.STRING },
                    subheadline: { type: Type.STRING },
                    cta_primario: { type: Type.STRING },
                    elemento_de_prova: { type: Type.STRING },
                    nota_de_urgencia: { type: Type.STRING }
                  },
                  required: ["pre_headline", "headline_principal", "subheadline", "cta_primario", "elemento_de_prova", "nota_de_urgencia"]
                },
                secao_identificacao: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    paragrafos: { type: Type.ARRAY, items: { type: Type.STRING } },
                    frases_de_espelho: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["titulo", "paragrafos", "frases_de_espelho"]
                },
                secao_agitacao: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    custo_da_inacao: { type: Type.STRING },
                    gatilhos_especificos: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          gatilho: { type: Type.STRING },
                          consequencia: { type: Type.STRING },
                          frase_de_copy: { type: Type.STRING }
                        },
                        required: ["gatilho", "consequencia", "frase_de_copy"]
                      }
                    },
                    cenario_futuro_sombrio: { type: Type.STRING }
                  },
                  required: ["titulo", "custo_da_inacao", "gatilhos_especificos", "cenario_futuro_sombrio"]
                },
                secao_mecanismo: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    explicacao_das_falhas: { type: Type.STRING },
                    introducao_mecanismo: { type: Type.STRING },
                    mecanismo_unico: {
                      type: Type.OBJECT,
                      properties: {
                        nome: { type: Type.STRING },
                        explicacao_leiga: { type: Type.STRING },
                        por_que_funciona: { type: Type.STRING },
                        diferencial: { type: Type.STRING }
                      },
                      required: ["nome", "explicacao_leiga", "por_que_funciona", "diferencial"]
                    }
                  },
                  required: ["titulo", "explicacao_das_falhas", "introducao_mecanismo", "mecanismo_unico"]
                },
                secao_produto: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    descricao: { type: Type.STRING },
                    o_que_voce_recebe: { type: Type.ARRAY, items: { type: Type.STRING } },
                    para_quem_e: { type: Type.ARRAY, items: { type: Type.STRING } },
                    para_quem_nao_e: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["titulo", "descricao", "o_que_voce_recebe", "para_quem_e", "para_quem_nao_e"]
                },
                secao_prova_social: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    introducao: { type: Type.STRING },
                    depoimentos_modelo: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          perfil: { type: Type.STRING },
                          depoimento: { type: Type.STRING },
                          resultado_especifico: { type: Type.STRING }
                        },
                        required: ["nome", "perfil", "depoimento", "resultado_especifico"]
                      }
                    }
                  },
                  required: ["titulo", "introducao", "depoimentos_modelo"]
                },
                secao_oferta: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    ancora_de_preco: { type: Type.STRING },
                    preco_real: { type: Type.STRING },
                    economia: { type: Type.STRING },
                    justificativa_de_preco: { type: Type.STRING },
                    o_que_esta_incluso: { type: Type.ARRAY, items: { type: Type.STRING } },
                    order_bumps: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nome: { type: Type.STRING },
                          proposta: { type: Type.STRING },
                          preco: { type: Type.STRING },
                          por_que_aceitar_agora: { type: Type.STRING }
                        },
                        required: ["nome", "proposta", "preco", "por_que_aceitar_agora"]
                      }
                    },
                    cta_principal: { type: Type.STRING },
                    urgencia_real: { type: Type.STRING }
                  },
                  required: ["titulo", "ancora_de_preco", "preco_real", "economia", "justificativa_de_preco", "o_que_esta_incluso", "order_bumps", "cta_principal", "urgencia_real"]
                },
                secao_garantia: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    copy_garantia: { type: Type.STRING },
                    duracao: { type: Type.STRING },
                    frase_de_fechamento: { type: Type.STRING }
                  },
                  required: ["titulo", "copy_garantia", "duracao", "frase_de_fechamento"]
                },
                secao_objecoes: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    objecoes: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          objecao: { type: Type.STRING },
                          resposta: { type: Type.STRING },
                          frase_de_virada: { type: Type.STRING }
                        },
                        required: ["objecao", "resposta", "frase_de_virada"]
                      }
                    }
                  },
                  required: ["titulo", "objecoes"]
                },
                secao_faq: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    perguntas: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          pergunta: { type: Type.STRING },
                          resposta: { type: Type.STRING }
                        },
                        required: ["pergunta", "resposta"]
                      }
                    }
                  },
                  required: ["titulo", "perguntas"]
                },
                secao_fechamento: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: { type: Type.STRING },
                    paragrafo_emocional: { type: Type.STRING },
                    cta_final: { type: Type.STRING },
                    ps: { type: Type.STRING }
                  },
                  required: ["titulo", "paragrafo_emocional", "cta_final", "ps"]
                }
              },
              required: [
                "secao_hero", "secao_identificacao", "secao_agitacao", "secao_mecanismo",
                "secao_produto", "secao_prova_social", "secao_oferta", "secao_garantia",
                "secao_objecoes", "secao_faq", "secao_fechamento"
              ]
            },
            prompt_para_ai_studio: { type: Type.STRING }
          },
          required: ["produto", "modo", "estrutura_copy", "prompt_para_ai_studio"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return res.json({ success: true, simulated: false, result: data });
  } catch (err: any) {
    console.error("Gemini Landpage Generation execution failed:", err);
    return res.status(500).json({ success: false, error: "Falha ao gerar Landpage com IA: " + err.message });
  }
});

// 1.10. POST Gerador de Funil - Quiz (Gemini API Integration)
app.post("/api/generate-quiz", async (req, res) => {
  const { dossie, nome, nicho, promessa, problema, preco, mecanismo, plataforma, esteira, objecoes } = req.body;

  if (!nome || !nicho || !promessa) {
    return res.status(400).json({ success: false, error: "Nome do produto, nicho e promessa são obrigatórios." });
  }

  const ai = getGeminiFromReq(req);

  if (!ai) {
    // Generate robust dynamic high-fidelity simulated response for Quiz
    const simulatedQuiz = {
      produto: nome,
      modo: "quiz",
      configuracao_geral: {
        titulo_do_quiz: `Diagnóstico de Saúde e Vitalidade Celular ${nome}`,
        subtitulo: `Descubra o verdadeiro fator biológico bloqueador de "${promessa}" e receba sua recomendação prática personalizada.`,
        tempo_estimado: `2 minutos`,
        cor_primaria_sugerida: `#FF2A2A`,
        tom_visual: `médico amigável, preocupado com bem-estar e extremamente pragmático em português coloquial`
      },
      etapas: [
        {
          etapa: 1,
          tipo: "validacao_emocional",
          titulo: `Passo 1/14 — Reconhecendo Sintomas Crônicos`,
          subtitulo: `Nicho: ${nicho}. Análise de desgaste físico inicial.`,
          pergunta: `Quando você acorda pela manhã, qual dessas frases melhor descreve o seu primeiro sentimento corporal?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Sinto um cansaço pesado, como se não tivesse deitado para dormir.`, valor: `pesado`, peso: 3 },
            { texto: `Sinto uma leve dor celular ou cansaço muscular, mas consigo engatar.`, valor: `leve`, peso: 2 },
            { texto: `Acordo totalmente renovado e com energia para o dia inteiro.`, valor: `ótimo`, peso: 1 }
          ],
          logica: `Mapeia a desolação inicial de energia, gerando acolhimento ao validar o peso sofrido.`
        },
        {
          etapa: 2,
          tipo: "validacao_emocional",
          titulo: `Passo 2/14 — Impacto na Rotina Pesada`,
          subtitulo: `Gestão de esforço físico cotidiano.`,
          pergunta: `Com que frequência você sente que as tarefas mais simples do seu dia parecem exigir o dobro da sua força de vontade normal?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Praticamente todos os dias; vivo arrastando o corpo com desânimo.`, valor: `sempre`, peso: 3 },
            { texto: `Às vezes, principalmente na metade ou final de tarde.`, valor: `as_vezes`, peso: 2 },
            { texto: `Raramente; tenho bastante foco e vigor natural de sobra.`, valor: `raro`, peso: 1 }
          ],
          logica: `Isola o sentimento de inadequação cotidiana e fadiga mental que desgasta o usuário.`
        },
        {
          etapa: 3,
          tipo: "validacao_emocional",
          titulo: `Passo 3/14 — Medo Crônico de Falhar`,
          subtitulo: `Identificação de bloqueio interno.`,
          pergunta: `Você já sentiu que está presa no efeito-rebote, onde tenta fazer dietas ou mudanças, mas falha pouco tempo depois?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Sim, sinto que minha força de vontade foi pro espaço e nada dá certo.`, valor: `muito`, peso: 3 },
            { texto: `Tentei poucas coisas e desisti rápido por falta de tempo.`, valor: `parcial`, peso: 2 },
            { texto: `Nunca; quando determino um objetivo, concluo sem esforço.`, valor: `concluo`, peso: 1 }
          ],
          logica: `Encontra e valida a sensação de culpa acumulada por fracassos que a concorrência causou.`
        },
        {
          etapa: 4,
          tipo: "diagnostico_gatilho",
          titulo: `Passo 4/14 — Identificação do Gatilho Bioquímico`,
          subtitulo: `Rastreando canais de estresse celular.`,
          pergunta: `Como você reage psicologicamente sob forte estresse ou noites mal dormidas?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Sinto uma compulsão imediata ou desânimo severo inexplicável.`, valor: `compulsao`, gatilho_mapeado: `Fadiga Bioquímica Aguda`, peso: 3 },
            { texto: `Fico irritada, mas consigo segurar a ansiedade de forma sutil.`, valor: `irritado`, gatilho_mapeado: `Oscilação Hormonal`, peso: 2 },
            { texto: `Consigo seguir o planejamento planejado de forma blindada.`, valor: `blindado`, gatilho_mapeado: `Equilíbrio Biológico`, peso: 1 }
          ],
          logica: `Desvela o gatilho profundo oculto mapeado no dossiê de público para personificar a dor.`
        },
        {
          etapa: 5,
          tipo: "diagnostico_gatilho",
          titulo: `Passo 5/14 — Nível de Inflamação Celular`,
          subtitulo: `Inchaço e respostas corporais.`,
          pergunta: `Você percebe que seu corpo retém líquido ou fica inchado após dias agitados de estresse?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Sim, principalmente pernas e abdômen, me sinto super pesada.`, valor: `retencao_alta`, gatilho_mapeado: `Fadiga Bioquímica Aguda`, peso: 3 },
            { texto: `Apenas de forma moderada ou em dias muito quentes no interior.`, valor: `retencao_media`, gatilho_mapeado: `Oscilação Hormonal`, peso: 2 },
            { texto: `Zero retenção; sinto meu corpo leve o tempo todo.`, valor: `retencao_zero`, gatilho_mapeado: `Equilíbrio Biológico`, peso: 1 }
          ],
          logica: `Agita a dor física da retenção líquida e do inchaço como causadores invisíveis do desânimo.`
        },
        {
          etapa: 6,
          tipo: "diagnostico_gatilho",
          titulo: `Passo 6/14 — Sobrecarga de Cortisol`,
          subtitulo: `Monitoramento de ansiedade mental diária.`,
          pergunta: `Sua mente fica acelerada com preocupações ou cansaço antes de deitar na cama para dormir?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Fica barulhenta, revisando problemas e impedindo o relaxamento imediato.`, valor: `cortisol_alto`, gatilho_mapeado: `Estresse de Cortisol`, peso: 3 },
            { texto: `Fica um pouco ativa, mas acabo dormindo depois de alguns minutos.`, valor: `cortisol_medio`, gatilho_mapeado: `Oscilação Hormonal`, peso: 2 },
            { texto: `Consigo desligar instantaneamente dormir como um bebê.`, valor: `cortisol_zero`, gatilho_mapeado: `Equilíbrio Biológico`, peso: 1 }
          ],
          logica: `Demonstra a correlação invisível entre estresse de cortisol e a falha em obter resultados.`
        },
        {
          etapa: 7,
          tipo: "diagnostico_gatilho",
          titulo: `Passo 7/14 — Bloqueio Nutricional Crônico`,
          subtitulo: `Problema de absorção celular.`,
          pergunta: `Você sente que, mesmo comendo pouco ou tentando se cuidar, parece que seu metabolismo está travado?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Sim, parece que até copo de água me faz inchar ou engordar.`, valor: `metabolismo_travado`, gatilho_mapeado: `Estresse de Cortisol`, peso: 3 },
            { texto: `Gera resultados extremamente lentos que me desanimam após semanas.`, valor: `metabolismo_lento`, gatilho_mapeado: `Oscilação Hormonal`, peso: 2 },
            { texto: `Meu metabolismo responde rápido a qualquer estímulo novo.`, valor: `metabolismo_veloz`, gatilho_mapeado: `Equilíbrio Biológico`, peso: 1 }
          ],
          logica: `Desmitifica o metabolismo inoperante e transfere a culpa da inércia para um bloqueio natural.`
        },
        {
          etapa: 8,
          tipo: "impacto_social",
          titulo: `Passo 8/14 — Desgaste em Relações Sociais`,
          subtitulo: `Análise do contexto de bem-estar social.`,
          pergunta: `Esse problema relacionado com "${problema || "desânimo físico"}" já fez você se isolar ou evitar encontros com amigos de vergonha?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Sim, invento desculpas para ficar em casa porque não me sinto bem.`, valor: `isolar_sim`, peso: 3 },
            { texto: `Às vezes evito, mas tento ir mesmo sem estar disposta.`, valor: `isolar_as_vezes`, peso: 2 },
            { texto: `Nunca me afetei socialmente por conta de problemas corporais.`, valor: `isolar_nao`, peso: 1 }
          ],
          logica: `Ataca frontalmente o medo social de rejeição e o afastamento preventivo que gera culpa.`
        },
        {
          etapa: 9,
          tipo: "impacto_social",
          titulo: `Passo 9/14 — Tentativas Anteriores e Frustrações`,
          subtitulo: `Rastreando o que já falhou no passado.`,
          pergunta: `Qual foi a sua principal tentativa frustrada antes de buscar este diagnóstico hoje?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Dietas restritivas doentias ou chás milagrosos de blogueira.`, valor: `dietas`, peso: 3 },
            { texto: `Matrículas caras em academia que acabei abandonando por cansaço.`, valor: `academia`, peso: 2 },
            { texto: `Pílulas e suplementos caros de farmácia que causaram taquicardia.`, valor: `pilulas`, peso: 3 }
          ],
          logica: `Ressalta as falhas do mercado comum para que o usuário sinta que experimentará um novo mecanismo.`
        },
        {
          etapa: 10,
          tipo: "impacto_social",
          titulo: `Passo 10/14 — Dinheiro Perdido com Erros`,
          subtitulo: `Identificação do prejuízo acumulado.`,
          pergunta: `Somando todas as pílulas, consultas e chás inúteis que comprou, quanto dinheiro você estima ter jogado fora?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Mais de R$ 500 reais sofridos jogados no lixo.`, valor: `alto_prejuizo`, peso: 3 },
            { texto: `Entre R$ 100 e R$ 500 reais em promessas falsas.`, valor: `medio_prejuizo`, peso: 2 },
            { texto: `Praticamente zero, sempre pesquiso muito antes de gastar.`, valor: `baixo_prejuizo`, peso: 1 }
          ],
          logica: `Ancoragem financeira de prejuízo anterior para contrastar com o custo baixo do produto.`
        },
        {
          etapa: 11,
          tipo: "impacto_social",
          titulo: `Passo 11/14 — Nível de Comprometimento Real`,
          subtitulo: `Disposição mental e preparação para agir.`,
          pergunta: `Se você soubesse que existe um método de 5 minutos, sem risco para as finanças, qual a sua disposição para agir hoje?`,
          tipo_resposta: `single_choice`,
          opcoes: [
            { texto: `Comprometimento total, quero resolver essa dor de uma vez por todas!`, valor: `total`, peso: 3 },
            { texto: `Gostaria de testar com calma para ver os primeiros resultados.`, valor: `calmo`, peso: 2 },
            { texto: `Apenas curiosidade passageira de internet.`, valor: `curioso`, peso: 1 }
          ],
          logica: `Pede autopush de comprometimento ativo para preparar psicologicamente para a oferta.`
        },
        {
          etapa: 12,
          tipo: "diagnostico_dinamico",
          titulo: `Passo 12/14 — Gerando Seu Diagnóstico Celular`,
          subtitulo: `Cruzamento de dados biológicos.`,
          descricao: `Nossa inteligência cruzou suas respostas sobre nível de cansaço, inflamação celular e desgaste social para gerar seu perfil de desregulação.`,
          perfis_possiveis: [
            {
              perfil: `Perfil Fadiga Crônica Desgastante`,
              condicao: `Pontuação total acumulada superior a 25 pontos nas respostas.`,
              descricao: `Seu corpo está operando sob um estado agudo de fadiga metabólica. Seus níveis de inflamação e cortisol estão impedindo qualquer progresso estético ou vital natural.`,
              gatilho_principal: `Estresse Bioquímico de Cortisol Travado`,
              mensagem_personalizada: `Atenção: Tratar esse sintoma de forma agressiva só causará rebote. Você precisa desativar a causa raiz imediatamente.`
            },
            {
              perfil: `Perfil Metabolismo Lento e Retenção`,
              condicao: `Pontuação acumulada entre 15 e 25 pontos no quiz.`,
              descricao: `Seu principal obstáculo está no inchaço provocado por retenção biológica e desânimo hormonal passageiro.`,
              gatilho_principal: `Retenção de Líquidos e Defensividade Celular`,
              mensagem_personalizada: `Sua rotina corrida está sufocando suas células. Começar com etapas simples de dissolução trará alívio imediato.`
            },
            {
              perfil: `Perfil Equilíbrio Preventivo Sutil`,
              condicao: `Pontuação abaixo de 15 pontos no formulário.`,
              descricao: `Suas respostas mostram que você está equilibrado, precisando apenas de ajustes práticos preventivos para atingir ${promessa}.`,
              gatilho_principal: `Manutenção de Vitalidade Ativa`,
              mensagem_personalizada: `Use o material para blindar seu metabolismo de forma definitiva.`
            }
          ],
          logica: `Cria o diagnóstico personalizado dando um senso de exclusividade científica irrefutável.`
        },
        {
          etapa: 13,
          tipo: "transicao_micropitch",
          titulo: `Passo 13/14 — A Chave de Ouro para a Mudança`,
          subtitulo: `Transição psicológica para a solução.`,
          copy_transicao: `Agora que você sabe exatamente que seu perfil está travado devido ao desgaste metabólico celular, preste muita atenção. Identificar o inimigo silencioso é apenas metade do caminho. Continuar fazendo as mesmas escolhas atrasadas te manterá no ciclo frustrante.`,
          revelacao_do_mecanismo: `É por isso que desenvolvemos o "${mecanismo || "Protocolo de Dissolução Biológica"}", um manual voltado a religar o seu equilíbrio natural em minutos por dia.`,
          frase_de_virada: `Nossa recomendação exclusiva para o seu perfil já está pronta e disponível no botão abaixo.`,
          cta_para_etapa_14: `Visualizar Recomendação de Saúde`
        },
        {
          etapa: 14,
          tipo: "pitch_final",
          titulo: `Passo 14/14 — Plano de Ação Completo`,
          subtitulo: `Mini Landing Page Integrada`,
          headline: `Recupere Sua Saúde e Disposição com o Método "${nome}"`,
          subheadline: `Ative a promessa de "${promessa}" e elimine o problema de "${problema || "desânimo físico"}" por uma fração simbólica de custo hoje mesmo!`,
          mecanismo_resumido: `Um checklist de apenas 5 minutos diários que desliga o inchaço e a retenção celular no piloto automático.`,
          o_que_voce_recebe: [
            `Manual Clínico ${nome} de Ativação Celular`,
            `Checklist Diário Passo a Passo Sem Complicação`,
            `Dois Bônus Exclusivos de Atalhos Rápidos`,
            `Acesso Vitalício em Área Segura`
          ],
          prova_social_rapida: `Mais de 14.381 pessoas normais aprovaram o protocolo de risco zero com garantia incondicional de 7 dias de satisfação.`,
          ancora_de_preco: `R$ 97,00`,
          preco_real: `R$ ${preco || "19,90"}`,
          copy_garantia: `Selo de Garantia Integral de 7 Dias. Se você ler e achar que não serve para o seu perfil, mando um pix de reembolso do seu dinheiro na hora. Sem burocracias.`,
          objecoes_rapidas: [
            { objecao: `Como vou receber o manual?`, resposta: `Acesso seguro instantâneo no seu e-mail e celular por pix/cartão.` },
            { objecao: `Será que serve mesmo pro meu perfil?`, resposta: `Totalmente calibrado para os perfis diagnosticados neste quiz.` }
          ],
          urgencia_real: `Atenção: Este preço promocional está com liberação única garantida para os lotes regionais do dia de hoje.`,
          cta_principal: `Sim, Quero Ativar o Protocolo Promocional Agora`,
          cta_secundario: `Ver mais detalhes antes de decidir`,
          order_bumps: [
            {
              nome: `Acelerador Enzimático Dual`,
              proposta: `Turbine suas taxas em dobro com a fórmula de liberação complementar no checkout por apenas R$ 9,90.`,
              preco: `R$ 9,90`,
              por_que_aceitar_agora: `Resultados em metade do tempo com economia instantânea.`
            }
          ]
        }
      ],
      barra_de_progresso: {
        estilo: "barra linear",
        mostrar_numero_etapa: true,
        mostrar_percentual: true
      },
      prompt_para_ai_studio: `Gere um Quiz Interativo responsivo, dinâmico e otimizado para conversão em arquivo HTML único contendo CSS e JS integrados de forma autocontida.
Aparência Visual: Design Dark Premium com tons de fundo no cinza quase preto (#060607), textos super legíveis, e elementos de controle de marcas na cor vermelho vibrante (#FF2A2A).
Tamanhos de toque mínimo: botões e opções com toque de 44px perfeito para dispositivos mobile-first com transições suaves.
Abaixo está toda estrutura de fluxo que o Javascript nativo deve controlar:

- Progressão Linear com botões de Próximo e Anterior desativados temporariamente ou com animações de entrada suaves.
- Lógica de Acúmulo de Peso nas Etapas 1-11 para mapeamento de pontuação.
- Etapa 12 exibe DIAGNÓSTICO DINÂMICO calculando o perfil em tempo de execução:
  * Acima de 25 pontos: exibe Perfil Fadiga Crônica Desgastante
  * Entre 15 e 25 pts: exibe Perfil Metabolismo Lento e Retenção
  * Abaixo de 15 pts: exibe Perfil Equilíbrio Preventivo Sutil
- Etapa 13 funciona como transição de micro-pitch emocional.
- Etapa 14 é estilizada como uma mini landing page com caixa de oferta, bônus, depoimentos fictícios da região e botão CTA com links personalizáveis no final direcionados para a plataforma ${plataforma || "Kiwify"}.

Crie o arquivo completo e blindado contra quebras gráficas, usando Tailwind CDN e ícones elegantes simulados por vetores SVG puros ou Lucide do CDN correspondente.`
    };
    return res.json({ success: true, simulated: true, result: simulatedQuiz });
  }

  try {
    const promptText = `Você é um Copywriter de elite e Arquiteto de Funis focado em converter tráfego frio em compradores de info-produtos de baixo valor (Low Ticket) via Quizzes interativos no mercado brasileiro.
O usuário enviou as seguintes especificações do produto dele:
- Nome do Produto: ${nome}
- Nicho de Atuação: ${nicho}
- Promessa Principal: ${promessa}
- Problema Central: ${problema || "Não especificado"}
- Preço de Venda: R$ ${preco || "Não especificado"}
- Mecanismo Único: ${mecanismo || "Não especificado"}
- Plataforma de Venda: ${plataforma || "Não especificado"}
- Esteira de Maximização (Order Bumps/Upsells): ${JSON.stringify(esteira || {})}
- 4 Maiores Objeções: ${JSON.stringify(objecoes || {})}
- Dossiê do Público-Alvo: ${dossie || "Não colado. Dedique-se a criar etapas refinadas com base no nicho do produto."}

Sua missão é gerar o roteiro completo de um Quiz Interativo Estruturado de exatamente 14 Etapas que capture a atenção emocional do lead, isole a causa do sofrimento e prepare emocionalmente para a compra na última etapa.

Siga rigorosamente a distribuição de etapas:
- Etapas 1-3: Validação Emocional e Isolamento do Problema
- Etapas 4-7: Diagnóstico dos Gatilhos Específicos (com propriedade 'gatilho_mapeado' no esquema de opções)
- Etapas 8-11: Impacto Social, Tentativas e Disposição para Agir
- Etapa 12: Diagnóstico Dinâmico Personalizado (conforme respostas acumuladas dadas, detalhando os 3 perfis plausíveis)
- Etapa 13: Transição Psicológica — Micro-Pitch (ponte emocional para a solução)
- Etapa 14: Pitch Final — Mini Landing Page com Headline, CTA, Garantia, Order bump opcional e Objeções rápidas quebradas em 1 linha.

Você deve responder rigorosamente no formato de JSON definido pelas propriedades especificadas abaixo, sem qualquer tipo de markdown, bloco de código, ou texto fora do JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            produto: { type: Type.STRING },
            modo: { type: Type.STRING },
            configuracao_geral: {
              type: Type.OBJECT,
              properties: {
                titulo_do_quiz: { type: Type.STRING },
                subtitulo: { type: Type.STRING },
                tempo_estimado: { type: Type.STRING },
                cor_primaria_sugerida: { type: Type.STRING },
                tom_visual: { type: Type.STRING }
              },
              required: ["titulo_do_quiz", "subtitulo", "tempo_estimado", "cor_primaria_sugerida", "tom_visual"]
            },
            etapas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  etapa: { type: Type.INTEGER },
                  tipo: { type: Type.STRING },
                  titulo: { type: Type.STRING },
                  subtitulo: { type: Type.STRING },
                  pergunta: { type: Type.STRING },
                  tipo_resposta: { type: Type.STRING },
                  opcoes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        texto: { type: Type.STRING },
                        valor: { type: Type.STRING },
                        peso: { type: Type.INTEGER },
                        gatilho_mapeado: { type: Type.STRING }
                      },
                      required: ["texto", "valor"]
                    }
                  },
                  logica: { type: Type.STRING },
                  descricao: { type: Type.STRING },
                  perfis_possiveis: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        perfil: { type: Type.STRING },
                        condicao: { type: Type.STRING },
                        descricao: { type: Type.STRING },
                        gatilho_principal: { type: Type.STRING },
                        mensagem_personalizada: { type: Type.STRING }
                      },
                      required: ["perfil", "condicao", "descricao", "gatilho_principal", "mensagem_personalizada"]
                    }
                  },
                  copy_transicao: { type: Type.STRING },
                  revelacao_do_mecanismo: { type: Type.STRING },
                  frase_de_virada: { type: Type.STRING },
                  cta_para_etapa_14: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  subheadline: { type: Type.STRING },
                  mecanismo_resumido: { type: Type.STRING },
                  o_que_voce_recebe: { type: Type.ARRAY, items: { type: Type.STRING } },
                  prova_social_rapida: { type: Type.STRING },
                  ancora_de_preco: { type: Type.STRING },
                  preco_real: { type: Type.STRING },
                  copy_garantia: { type: Type.STRING },
                  objecoes_rapidas: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        objecao: { type: Type.STRING },
                        resposta: { type: Type.STRING }
                      },
                      required: ["objecao", "resposta"]
                    }
                  },
                  urgencia_real: { type: Type.STRING },
                  cta_principal: { type: Type.STRING },
                  cta_secundario: { type: Type.STRING },
                  order_bumps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nome: { type: Type.STRING },
                        proposta: { type: Type.STRING },
                        preco: { type: Type.STRING },
                        por_que_aceitar_agora: { type: Type.STRING }
                      },
                      required: ["nome", "proposta", "preco", "por_que_aceitar_agora"]
                    }
                  }
                },
                required: ["etapa", "tipo", "titulo", "pergunta"]
              }
            },
            barra_de_progresso: {
              type: Type.OBJECT,
              properties: {
                estilo: { type: Type.STRING },
                mostrar_numero_etapa: { type: Type.BOOLEAN },
                mostrar_percentual: { type: Type.BOOLEAN }
              },
              required: ["estilo", "mostrar_numero_etapa", "mostrar_percentual"]
            },
            prompt_para_ai_studio: { type: Type.STRING }
          },
          required: ["produto", "modo", "configuracao_geral", "etapas", "barra_de_progresso", "prompt_para_ai_studio"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return res.json({ success: true, simulated: false, result: data });
  } catch (err: any) {
    console.error("Gemini Quiz Generation execution failed:", err);
    return res.status(500).json({ success: false, error: "Falha ao gerar Quiz com IA: " + err.message });
  }
});

// Compliance Pre-Flight Checker: analisa copy (texto) e/ou criativo (imagem) contra as
// categorias de risco mais comuns de reprovação nas políticas públicas de Meta/Google Ads
// para ofertas de saúde/emagrecimento/financeiro/renda extra, e sugere reescrita compliant.
const COMPLIANCE_RISK_KEYWORDS: { categoria: string; termos: string[] }[] = [
  { categoria: "Alegação de cura/saúde", termos: ["cura", "curado", "cura definitiva", "elimina a doença", "tratamento médico"] },
  { categoria: "Garantia de resultado", termos: ["garantido", "garantia de resultado", "100% garantido", "resultado garantido", "funciona para todos"] },
  { categoria: "Claim numérico de emagrecimento", termos: ["emagreça", "perca", "kg em", "secar", "elimine a barriga"] },
  { categoria: "Linguagem milagrosa/sensacionalista", termos: ["milagre", "milagroso", "segredo proibido", "a indústria não quer que você saiba"] },
  { categoria: "Urgência/escassez falsa", termos: ["últimas vagas", "sai do ar em minutos", "só hoje", "vagas se esgotando"] },
  { categoria: "Promessa financeira irreal", termos: ["renda garantida", "fique rico", "ganhe r$", "lucro garantido"] }
];

function runHeuristicComplianceCheck(text: string) {
  const lowerText = text.toLowerCase();
  const flags: { trecho: string; categoria: string; motivo: string; sugestao: string }[] = [];

  for (const group of COMPLIANCE_RISK_KEYWORDS) {
    for (const termo of group.termos) {
      if (lowerText.includes(termo)) {
        flags.push({
          trecho: termo,
          categoria: group.categoria,
          motivo: `Termo "${termo}" é frequentemente associado a reprovação por políticas de anúncios (${group.categoria}).`,
          sugestao: "Reescreva evitando promessas absolutas; use linguagem de possibilidade (\"pode ajudar\", \"método utilizado por\") em vez de garantia categórica."
        });
        break;
      }
    }
  }

  const riskLevel = flags.length === 0 ? "baixo" : flags.length <= 2 ? "médio" : "alto";
  return {
    riskLevel,
    summary: flags.length === 0
      ? "Nenhum termo de alto risco encontrado na varredura heurística (sem chave Gemini configurada, análise simplificada por palavras-chave)."
      : `${flags.length} termo(s) de risco encontrado(s) na varredura heurística (sem chave Gemini configurada, análise simplificada por palavras-chave).`,
    flags,
    rewriteSugerido: null as string | null
  };
}

app.post("/api/compliance-check", async (req, res) => {
  const { text, imageBase64, imageMimeType } = req.body;

  if (!text && !imageBase64) {
    return res.status(400).json({ success: false, error: "Envie um texto de copy ou uma imagem de criativo para analisar." });
  }

  const ai = getGeminiFromReq(req);

  if (!ai) {
    if (!text) {
      return res.json({
        success: true,
        simulated: true,
        result: {
          riskLevel: "médio",
          summary: "Análise de imagem requer GEMINI_API_KEY configurada. Configure a chave para varredura visual real.",
          flags: [],
          rewriteSugerido: null
        }
      });
    }
    return res.json({ success: true, simulated: true, result: runHeuristicComplianceCheck(text) });
  }

  try {
    const parts: any[] = [];
    if (imageBase64) {
      let base64Data = imageBase64;
      if (base64Data.includes(";base64,")) {
        base64Data = base64Data.split(";base64,").pop() || "";
      }
      parts.push({ inlineData: { mimeType: imageMimeType || "image/png", data: base64Data } });
    }

    const promptText = `Você é um especialista em compliance de anúncios (Meta Ads e Google Ads) para o mercado brasileiro de infoprodutos/low ticket em nichos de saúde, emagrecimento, finanças e renda extra.

Analise ${imageBase64 ? "a imagem de criativo enviada" : ""}${imageBase64 && text ? " e o texto de copy enviado" : ""}${!imageBase64 && text ? "o texto de copy enviado" : ""} abaixo e identifique riscos de reprovação contra as políticas públicas do Meta (Inadequate/Egregious Content, Personal Health, Unrealistic outcomes, Before/After, Misleading claims) e do Google Ads.

${text ? `TEXTO DE COPY:\n"""${text}"""` : ""}

Para cada problema encontrado (claim de cura/saúde sem comprovação, garantia de resultado, número específico de emagrecimento/tempo, antes/depois proibido, linguagem milagrosa, urgência/escassez falsa, promessa financeira irreal, etc.), aponte o trecho ou elemento visual exato, a categoria de risco, o motivo da reprovação provável, e uma sugestão de reescrita que mantenha o apelo persuasivo dentro da política.

Se houver texto de copy, gere também uma versão integral reescrita ("rewriteSugerido") que resolve todos os pontos de risco mantendo o máximo de poder de persuasão permitido pelas políticas.

Classifique o riskLevel geral como "baixo", "médio" ou "alto".`;

    parts.push({ text: promptText });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            summary: { type: Type.STRING },
            flags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  trecho: { type: Type.STRING },
                  categoria: { type: Type.STRING },
                  motivo: { type: Type.STRING },
                  sugestao: { type: Type.STRING }
                },
                required: ["trecho", "categoria", "motivo", "sugestao"]
              }
            },
            rewriteSugerido: { type: Type.STRING }
          },
          required: ["riskLevel", "summary", "flags"]
        }
      }
    });

    const responseText = response.text || "{}";
    const data = JSON.parse(responseText);
    return res.json({ success: true, simulated: false, result: data });
  } catch (err: any) {
    console.error("Gemini Compliance Check execution failed:", err);
    return res.status(500).json({ success: false, error: "Falha ao verificar compliance com IA: " + err.message });
  }
});

// Endpoint for real-time online status testing (avoiding NXDOMAIN and connection refused errors)
app.post("/api/check-status", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required" });
  }
  const isAlive = await testUrlStatus(url);
  return res.json({ success: true, online: isAlive });
});

// 2. POST AI Enriched Classification (Gemini API Integration)
app.post("/api/analyze", async (req, res) => {
  const { url, title, trackerId } = req.body;
  
  if (!url) {
    return res.status(400).json({ success: false, error: "URL is required for analysis." });
  }

  const tracker = TRACKERS.find(t => t.id === trackerId);
  const platformName = tracker ? tracker.name : "Afiliados";

  const ai = getGeminiFromReq(req);

  if (!ai) {
    // Graceful fallback using high performance client heuristics
    const evaluated = evaluateHeuristic(title || "", url, platformName);
    return res.json({
      success: true,
      nicho: evaluated.nicho,
      type: evaluated.type,
      score: evaluated.score,
      rank: evaluated.rank,
      headline: title || url.split("/")[2],
      justification: "Classificação calculada pelo poderoso algoritmo heurístico nativo (Gemini não inicializado)."
    });
  }

  try {
    const prompt = `Analise a seguinte oferta encontrada na web que aponta para o tracker de checkout/afiliado "${platformName}":
- URL da oferta: ${url}
- Título/Meta da página: ${title || "Não disponível"}

Com base no idioma, palavras-chave e contexto do marketing digital brasileiro e gringo, extraia em formato JSON as informações estruturadas de nicho, funil e avaliação.

Você DEVE preencher estritamente um JSON que obedeça aos seguintes valores permitidos:
1. "nicho": Um dos seguintes valores string: "emagrecimento", "saude_masculina", "saude_bem_estar", "renda_extra", "relacionamento", "financas", "cripto", "beleza", "outros"
2. "type": Um dos seguintes valores string: "VSL", "LOW_TICKET", "QUIZ", "DIRECT_SALES"
3. "rank": Um dos seguintes valores string: "S", "A", "B", "C"
4. "score": Um número inteiro de 4 a 15 de potencial de escala de anúncios.
5. "headline": Uma headline chamativa adaptada da cópia da página (máximo 70 caracteres).
6. "justification": Uma breve frase de justificativa com as métricas do porquê recebeu essa nota.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nicho: { type: Type.STRING, description: 'Categorização de nicho da oferta.' },
            type: { type: Type.STRING, description: 'Tipo de funil do anúncio.' },
            rank: { type: Type.STRING, description: 'Nota de prioridade de S a C.' },
            score: { type: Type.INTEGER, description: 'Pontuação de 4 a 15.' },
            headline: { type: Type.STRING, description: 'Headline principal extraída/gerada.' },
            justification: { type: Type.STRING, description: 'Comentário técnico rápido.' }
          },
          required: ["nicho", "type", "rank", "score", "headline", "justification"]
        }
      }
    });

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text.trim());
      return res.json({ success: true, ...parsed });
    } else {
      throw new Error("No response output from Gemini API");
    }

  } catch (err: any) {
    console.error("Gemini API computation failed. Falling back gracefully. Error:", err.message);
    const evaluated = evaluateHeuristic(title || "", url, platformName);
    return res.json({
      success: true,
      nicho: evaluated.nicho,
      type: evaluated.type,
      score: evaluated.score,
      rank: evaluated.rank,
      headline: title || url.split("/")[2],
      justification: `Classificado via algoritmo heurístico sênior devido a uma exceção na API do Gemini: ${err.message}`
    });
  }
});

// 3. POST Real/Simulated urlscan.io scanner proxy
app.post("/api/scan", async (req, res) => {
  const { trackerId, apiKey, days = 30 } = req.body;

  const tracker = TRACKERS.find(t => t.id === trackerId);
  if (!tracker) {
    return res.status(404).json({ success: false, error: "Tracker platform not found" });
  }

  // We can connect to real urlscan.io with or without an API key (anonymous rate limits apply without key)
  const externalKey = apiKey || process.env.URLSCAN_API_KEY;
  const hasKey = externalKey && externalKey.trim().length > 5;

  try {
     // Build lightweight Elasticsearch query targeting links referencing the tracker domain.
     // By using only a simple literal field expression, we completely bypass urlscan's free tier search query complexity 403 constraints!
     const baseTracker = tracker.domain.replace("www.", "");
     // We search for the tracker domain as a general text phrase target.
     // This avoids using the premium 'links:' field query restriction (403 HTTP) on community/free tier API keys!
     const searchQuery = `"${baseTracker}"`;
     const searchUrl = `https://urlscan.io/api/v1/search/?q=${encodeURIComponent(searchQuery)}&size=50`;

     const headers: Record<string, string> = {
       "Content-Type": "application/json"
     };
     if (hasKey) {
       headers["API-Key"] = externalKey.trim();
     }

     const response = await fetch(searchUrl, {
       method: "GET",
       headers
     });

     if (!response.ok) {
       let errDetails = "";
       try {
         const errBody = await response.json();
         errDetails = errBody.message || errBody.error || errBody.description || JSON.stringify(errBody);
       } catch {
         try {
           errDetails = await response.text();
         } catch {}
       }
       throw new Error(`urlscan.io API retornou status HTTP ${response.status}: ${errDetails || 'Sem corpo de erro'}`);
     }

     const rawData = await response.json();
     const results = rawData.results || [];
     const validHits: any[] = [];

     for (let i = 0; i < results.length; i++) {
       const item = results[i];
       const pageTitle = item.page?.title || item.task?.title || "Oferta Encontrada";
       const pageUrl = item.page?.url || item.task?.url || `https://${tracker.domain}/product-${i}`;
       const domainOnly = item.page?.domain || item.task?.domain || tracker.domain;
       const taskUuid = item.task?.uuid || item._id;

       // 1. Programmatically filter platform domains out of the results without complex ELK operators (avoiding 403)
       const baseTrackerLower = baseTracker.toLowerCase();
       const domainLower = domainOnly.toLowerCase();
       if (
         domainLower === baseTrackerLower ||
         domainLower.endsWith("." + baseTrackerLower) ||
         domainLower.includes(domainLower === "www." + baseTrackerLower ? "zzz" : baseTrackerLower)
       ) {
         continue; // Filtered out tracker platform domains
       }

       // 2. Perform rigorous server-side commercial Offer qualification
       const validation = isValidOffer(pageTitle, pageUrl, domainOnly, tracker.domain);
       if (!validation.valid) {
         console.log(`[Validation Refused Offer]: "${pageUrl}" with title "${pageTitle}" because: ${validation.reason}`);
         continue; // Skip the junk
       }

       // 3. Live Real-Time DNS and HTTP verification to ensure only running/online offers are retrieved
       const isOnlineNow = await testUrlStatus(pageUrl);
       if (!isOnlineNow) {
         console.log(`[Validation Refused Offer]: "${pageUrl}" because the offer url is offline or not responding (paused/deleted campaign)`);
         continue; // Skip inactive or paused offers
       }

       const evalData = evaluateHeuristic(pageTitle, pageUrl, tracker.name);

       validHits.push({
         id: `scan-${taskUuid}-${i}`,
         url: pageUrl,
         domain: domainOnly,
         title: pageTitle,
         tracker: tracker.domain,
         platformName: tracker.name,
         market: tracker.market,
         scannedAt: item.task?.time || new Date().toISOString(),
         uuid: taskUuid,
         screenshotUrl: `https://urlscan.io/screenshots/${taskUuid}.png`,
         ...evalData
       });
     }

     console.log(`Successfully fetched ${validHits.length} highly qualified results for tracker ${tracker.domain} from urlscan.io (original candidates: ${results.length})`);
     return res.json({ success: true, hits: validHits, isMock: false });

  } catch (err: any) {
    console.warn(`URLScan.io scan query failed for tracker ${trackerId}: ${err.message}. Falling back to high-fidelity simulated local offer database.`);
    const simulatedList = SIMULATED_OFFERS_DATABASE[trackerId] || [];
    const simulatedHits = simulatedList.map((item, idx) => {
      const evalHeur = evaluateHeuristic(item.title, item.url, tracker.name);
      return {
        id: `sim-${trackerId}-${idx}-${Date.now()}`,
        url: item.url,
        domain: item.url.replace(/^https?:\/\//i, "").split("/")[0],
        title: item.title,
        tracker: tracker.domain,
        platformName: tracker.name,
        market: tracker.market,
        scannedAt: new Date(Date.now() - idx * 3600000).toISOString(),
        ...evalHeur
      };
    });
    return res.json({ success: true, hits: simulatedHits, isMock: true });
  }
});

// --- FACEBOOK MARKETING API ROUTES ---

// 1. GET Facebook Account Insights
app.get("/api/facebook/account-insights", async (req, res) => {
  const { accessToken, adAccountId, datePreset } = req.query;

  if (!accessToken || !adAccountId) {
    return res.status(400).json({ success: false, error: "Access Token e ID da Conta de Anúncios são obrigatórios." });
  }

  const preset = datePreset || "last_7d";

  try {
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?access_token=${accessToken}&fields=spend,reach,impressions,inline_link_clicks,inline_link_click_ctr,cpm,cpc,actions,purchase_roas&date_preset=${preset}`;
    const response = await fetch(url);
    const resJson: any = await response.json();

    if (!response.ok || resJson.error) {
      const errMsg = resJson.error?.message || "Erro desconhecido na API do Facebook";
      return res.status(response.status || 400).json({ success: false, error: errMsg });
    }

    const insights = resJson.data && resJson.data.length > 0 ? resJson.data[0] : null;
    return res.json({ success: true, data: insights });
  } catch (err: any) {
    console.error("Facebook Account Insights API failed:", err);
    return res.status(500).json({ success: false, error: "Falha na comunicação com a API do Facebook: " + err.message });
  }
});

// 2. GET Facebook Campaigns
app.get("/api/facebook/campaigns", async (req, res) => {
  const { accessToken, adAccountId, datePreset } = req.query;

  if (!accessToken || !adAccountId) {
    return res.status(400).json({ success: false, error: "Access Token e ID da Conta de Anúncios são obrigatórios." });
  }

  const preset = datePreset || "last_7d";

  try {
    const fields = `id,name,status,insights.date_preset(${preset}){spend,reach,impressions,inline_link_clicks,inline_link_click_ctr,cpm,cpc,actions,purchase_roas}`;
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?access_token=${accessToken}&fields=${encodeURIComponent(fields)}&limit=100`;
    
    const response = await fetch(url);
    const resJson: any = await response.json();

    if (!response.ok || resJson.error) {
      const errMsg = resJson.error?.message || "Erro desconhecido na API do Facebook";
      return res.status(response.status || 400).json({ success: false, error: errMsg });
    }

    return res.json({ success: true, campaigns: resJson.data || [] });
  } catch (err: any) {
    console.error("Facebook Campaigns API failed:", err);
    return res.status(500).json({ success: false, error: "Falha na comunicação com a API do Facebook: " + err.message });
  }
});

// 3. GET Facebook Adsets
app.get("/api/facebook/adsets", async (req, res) => {
  const { accessToken, campaignId, datePreset } = req.query;

  if (!accessToken || !campaignId) {
    return res.status(400).json({ success: false, error: "Access Token e ID da Campanha são obrigatórios." });
  }

  const preset = datePreset || "last_7d";

  try {
    const fields = `id,name,status,daily_budget,insights.date_preset(${preset}){spend,reach,ctr,cpc}`;
    const url = `https://graph.facebook.com/v19.0/${campaignId}/adsets?access_token=${accessToken}&fields=${encodeURIComponent(fields)}&limit=100`;

    const response = await fetch(url);
    const resJson: any = await response.json();

    if (!response.ok || resJson.error) {
      const errMsg = resJson.error?.message || "Erro desconhecido na API do Facebook";
      return res.status(response.status || 400).json({ success: false, error: errMsg });
    }

    return res.json({ success: true, adsets: resJson.data || [] });
  } catch (err: any) {
    console.error("Facebook Adsets API failed:", err);
    return res.status(500).json({ success: false, error: "Falha na comunicação com a API do Facebook: " + err.message });
  }
});

// POST gera/retorna o token de webhook do operador (módulo de Anúncios). O token é gerado
// uma única vez por operador e reutilizado depois — usado pela aba "Vendas"/"Pixels" para
// montar a URL de webhook que o operador cola nos checkouts/trackers.
app.post("/api/ads/webhook-token", async (req, res) => {
  const { operator } = req.body;
  if (!operator) {
    return res.status(400).json({ success: false, error: "Operador é obrigatório." });
  }

  if (!supabaseServer) {
    return res.status(500).json({ success: false, error: "Supabase não está configurado no servidor." });
  }

  try {
    const { data: existing, error: findErr } = await supabaseServer
      .from("operator_webhook_tokens")
      .select("token")
      .eq("operator", operator)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      return res.json({ success: true, token: existing.token });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const { data: created, error: insertErr } = await supabaseServer
      .from("operator_webhook_tokens")
      .insert([{ operator, token }])
      .select("token")
      .single();
    if (insertErr) throw insertErr;

    return res.json({ success: true, token: created.token });
  } catch (err: any) {
    console.error("Failed to get/generate webhook token:", err);
    return res.status(500).json({ success: false, error: err.message || "Erro ao gerar token de webhook." });
  }
});

// Garante JSON mesmo em erros de middleware (ex: payload acima do limite), evitando que o
// client receba a página HTML padrão de erro do Express e quebre o JSON.parse da resposta.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ success: false, error: "Arquivo/payload muito grande para esta requisição." });
  }
  if (err) {
    console.error("Unhandled middleware error:", err);
    return res.status(400).json({ success: false, error: err.message || "Requisição inválida." });
  }
  return next();
});

// Configure Vite integration for development vs production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vusk Operation Server started at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
