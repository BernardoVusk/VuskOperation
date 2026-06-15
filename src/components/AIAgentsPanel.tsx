import React, { useState, useEffect } from "react";
import { Plus, Bot, Sparkles, Database, ArrowRight, RefreshCw, AlertCircle, Info, Check, Copy, AlertTriangle, MessageSquare, Trash2, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { CreateAgentModal } from "./CreateAgentModal";
import { ChatInterface } from "./ChatInterface";

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  system_prompt: string;
  system_prompt_url?: string;
  created_at?: string;
}

interface ChatSession {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  attachment?: {
    name: string;
    mimeType: string;
    data: string; // base64 representation
    size?: number;
  };
}

const isValidUuid = (str: string | undefined): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Initial seed default agents to showcase functionality instantly!
const DEFAULT_SEED_AGENTS: Agent[] = [
  {
    id: "default-1",
    name: "Redator VSL de Elite",
    description: "Especialista em criar roteiros cinematográficos, ganchos e blocos de copy agressiva de baixo ticket.",
    avatar_url: "✍️",
    system_prompt: `Você é o Redator VSL de Elite da Vusk Operation.
Sua especialidade é criar argumentos de copy agressiva e roteiros de VSL baseados em quebras de padrão e ganchos de alta atenção.
Sempre responda de forma objetiva, com exemplos práticos, usando gatilhos mentais do mercado low ticket. Use tom confiante, focado em persuasão.`
  },
  {
    id: "default-2",
    name: "Growth Hacker de Ofertas",
    description: "Persona focada em otimizar funis de vendas, conversão de checkout e estratégias de order bump.",
    avatar_url: "📈",
    system_prompt: `Você é o Growth Hacker da Vusk Operation.
Você analisa funis de vendas de produtos de baixo ticket. Suas sugestões foca em otimizar checkout, adicionar order bumps inteligentes, estruturar upsells urgentes e testar novas propostas de headline de alta escala.`
  },
  {
    id: "default-3",
    name: "Espião Criativo IA",
    description: "Agente encarregado de destrinchar anúncios do Meta Ads e extrair os gatilhos por trás do criativo.",
    avatar_url: "🕵️",
    system_prompt: `Você é o Espião Criativo da Vusk Operation.
Sua missão é ajudar o usuário a extrair a ideia central de anúncios do Ads Library do Meta, detalhando o tipo de criativo (imagem, depoimento, animação) e propondo 3 variações baseadas em contra-intuição.`
  }
];

export function AIAgentsPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Chat tracking states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // UI state controllers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSqlVisible, setIsSqlVisible] = useState(false);
  const [isSqlCopied, setIsSqlCopied] = useState(false);
  const [localMode, setLocalMode] = useState<"remote" | "local">("local");
  const [supabaseAlert, setSupabaseAlert] = useState<string | null>(null);

  // Load configuration and data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingAgents(true);
    setSupabaseAlert(null);

    if (!isSupabaseConfigured || !supabase) {
      // Offline fallback out of the box
      useLocalStorageBackup("Supabase não está configurado. Operando em modo de armazenamento local.");
      setLoadingAgents(false);
      return;
    }

    try {
      // Try fetching custom agents from agents table
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setLocalMode("remote");
      // Combine seed agents with retrieved custom agents
      const customAgents = data || [];
      const combined = [...customAgents, ...DEFAULT_SEED_AGENTS];
      setAgents(combined);

      // Select first agent by default
      if (combined.length > 0 && !selectedAgent) {
        handleSelectAgent(combined[0], "remote");
      }
    } catch (err: any) {
      console.warn("Agentes: Falha na conexão com tabelas do Supabase. Usando LocalStorage. Motivo:", err.message);
      useLocalStorageBackup(
        "Tabelas não encontradas no seu Supabase. Os agentes criados serão salvos em LocalStorage temporário. Copy-paste o script SQL abaixo no console para liberar o banco de dados."
      );
    } finally {
      setLoadingAgents(false);
    }
  };

  const useLocalStorageBackup = (message: string) => {
    setLocalMode("local");
    setSupabaseAlert(message);

    // Retrieve from localStorage
    const cached = localStorage.getItem("minerador_pro_agents");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setAgents([...parsed, ...DEFAULT_SEED_AGENTS]);
        if (parsed.length > 0 && !selectedAgent) {
          handleSelectAgent(parsed[0], "local");
        }
      } catch {
        setAgents(DEFAULT_SEED_AGENTS);
        handleSelectAgent(DEFAULT_SEED_AGENTS[0], "local");
      }
    } else {
      setAgents(DEFAULT_SEED_AGENTS);
      handleSelectAgent(DEFAULT_SEED_AGENTS[0], "local");
    }
  };

  const handleSelectAgent = async (agent: Agent, modeOverride?: "local" | "remote") => {
    setSelectedAgent(agent);
    setMessages([]);
    setCurrentSession(null);

    const activeMode = modeOverride || localMode;
    const isRemote = activeMode === "remote" && supabase && isValidUuid(agent.id);

    if (!isRemote) {
      // Find or create local session for this agent
      const cachedSessions = localStorage.getItem("minerador_pro_ai_sessions");
      let localSessions: ChatSession[] = [];
      if (cachedSessions) {
        try { localSessions = JSON.parse(cachedSessions); } catch {}
      }

      let agentSession = localSessions.find(s => s.agent_id === agent.id);
      if (!agentSession) {
        agentSession = {
          id: `session-${agent.id}-${Date.now()}`,
          agent_id: agent.id,
          title: `Sessão com ${agent.name}`,
          created_at: new Date().toISOString()
        };
        const updated = [...localSessions, agentSession];
        localStorage.setItem("minerador_pro_ai_sessions", JSON.stringify(updated));
      }
      setCurrentSession(agentSession);

      // Load local messages
      const cachedMsg = localStorage.getItem("minerador_pro_ai_messages");
      let localMsg: Message[] = [];
      if (cachedMsg) {
        try { localMsg = JSON.parse(cachedMsg); } catch {}
      }
      const filtered = localMsg.filter(m => m.session_id === agentSession!.id);
      setMessages(filtered);
    } else {
      // Remote supabase mode
      if (!supabase) return;
      setLoadingMessages(true);
      try {
        // Query if an active session exists
        let { data: sData, error: sError } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("agent_id", agent.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (sError) throw sError;

        let session: ChatSession;
        if (sData && sData.length > 0) {
          session = sData[0];
        } else {
          // Create new session
          const { data: newS, error: createError } = await supabase
            .from("chat_sessions")
            .insert([{ agent_id: agent.id, title: `Conversa com ${agent.name}` }])
            .select()
            .single();

          if (createError) throw createError;
          session = newS;
        }

        setCurrentSession(session);

        // Fetch messages for this session
        const { data: mData, error: mError } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true });

        if (mError) throw mError;
        setMessages(mData || []);
      } catch (err: any) {
        console.error("Erro ao carregar sessão remota do Supabase:", err);
        setSupabaseAlert("Não foi possível ler as mensagens remotas. Reativando cache local.");
        setLocalMode("local");
      } finally {
        setLoadingMessages(false);
      }
    }
  };

  const handleCreateAgent = async (agentData: {
    name: string;
    description: string;
    systemPrompt: string;
    avatarUrl: string;
    file?: File;
  }) => {
    try {
      if (localMode === "local") {
        // Save to local custom list
        const cached = localStorage.getItem("minerador_pro_agents");
        let list: Agent[] = [];
        if (cached) {
          try { list = JSON.parse(cached); } catch {}
        }

        const newAgent: Agent = {
          id: `custom-agent-${Date.now()}`,
          name: agentData.name,
          description: agentData.description,
          avatar_url: agentData.avatarUrl,
          system_prompt: agentData.systemPrompt,
          created_at: new Date().toISOString()
        };

        const updated = [newAgent, ...list];
        localStorage.setItem("minerador_pro_agents", JSON.stringify(updated));
        
        // Update local agents state instantly!
        setAgents([...updated, ...DEFAULT_SEED_AGENTS]);
        handleSelectAgent(newAgent, "local");
      } else {
        // Remote Supabase upload
        if (!supabase) return;

        let fileUrl = "";
        if (agentData.file) {
          // Try uploading md file to storage bucket
          const fileExt = agentData.file.name.split(".").pop();
          const fileName = `${Date.now()}_prompt.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadErr } = await supabase.storage
            .from("agent_files")
            .upload(filePath, agentData.file, {
              cacheControl: "3600",
              upsert: false
            });

          if (!uploadErr) {
            const { data: publicData } = supabase.storage
              .from("agent_files")
              .getPublicUrl(filePath);
            
            if (publicData) {
              fileUrl = publicData.publicUrl;
            }
          } else {
            console.warn("Storage upload failed (bucket 'agent_files' may not be configured):", uploadErr.message);
          }
        }

        // Insert table entry
        const { data, error } = await supabase
          .from("agents")
          .insert([
            {
              name: agentData.name,
              description: agentData.description,
              avatar_url: agentData.avatarUrl,
              system_prompt: agentData.systemPrompt,
              system_prompt_url: fileUrl || null
            }
          ])
          .select()
          .single();

        if (error) throw error;

        if (data) {
          const newAgent: Agent = {
            id: data.id,
            name: data.name,
            description: data.description || "",
            avatar_url: data.avatar_url || "🤖",
            system_prompt: data.system_prompt || "",
            system_prompt_url: data.system_prompt_url || undefined,
            created_at: data.created_at
          };

          // Prepend newly created agent to list instantly in React state!
          setAgents(prev => [newAgent, ...prev]);
          handleSelectAgent(newAgent, "remote");
        }
      }
    } catch (err: any) {
      console.error("Erro ao criar agente de IA:", err);
      throw new Error(`Falha ao registrar agente: ${err.message}`);
    }
  };

  const handleSendMessage = async (text: string, attachment?: { name: string; mimeType: string; data: string; size?: number }) => {
    if (!selectedAgent || !currentSession || sendingMessage) return;

    // Create prompt user message state
    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      session_id: currentSession.id,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      attachment: attachment
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setSendingMessage(true);

    const isRemoteSession = localMode === "remote" && supabase && isValidUuid(currentSession.id);

    try {
      if (isRemoteSession) {
        // Save user message remotely (append attachment indicator to keep it visually identified)
        let storedContent = text;
        if (attachment) {
          storedContent = `📎 [Anexo: ${attachment.name}]\n\n${text}`;
        }
        const { error: insertUserErr } = await supabase
          .from("chat_messages")
          .insert([
            {
              session_id: currentSession.id,
              role: "user",
              content: storedContent
            }
          ]);
        if (insertUserErr) throw insertUserErr;
      } else {
        // Save user message locally including rich attachments
        const cachedMsg = localStorage.getItem("minerador_pro_ai_messages");
        let localMsg: Message[] = [];
        if (cachedMsg) {
          try { localMsg = JSON.parse(cachedMsg); } catch {}
        }
        localMsg.push(userMsg);
        localStorage.setItem("minerador_pro_ai_messages", JSON.stringify(localMsg));
      }

      // Query server AI route `/api/agents/chat` which runs Gemini with system instruction
      const response = await fetch("/api/agents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({
            role: m.role,
            content: m.content,
            attachment: m.attachment
          })),
          systemPrompt: selectedAgent.system_prompt
        })
      });

      if (!response.ok) {
        throw new Error(`Servidor respondeu com código de status HTTP ${response.status}`);
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "Erro desconhecido na resposta da API de IA.");
      }

      const aiReplyText = resData.content;

      const aiMsg: Message = {
        id: `msg-ai-${Date.now()}`,
        session_id: currentSession.id,
        role: "assistant",
        content: aiReplyText,
        created_at: new Date().toISOString()
      };

      setMessages([...nextMessages, aiMsg]);

      if (isRemoteSession) {
        // Save AI reply remotely
        const { error: insertAiErr } = await supabase
          .from("chat_messages")
          .insert([
            {
              session_id: currentSession.id,
              role: "assistant",
              content: aiReplyText
            }
          ]);
        if (insertAiErr) throw insertAiErr;
      } else {
        // Save AI reply locally
        const cachedMsg = localStorage.getItem("minerador_pro_ai_messages");
        let localMsg: Message[] = [];
        if (cachedMsg) {
          try { localMsg = JSON.parse(cachedMsg); } catch {}
        }
        localMsg.push(aiMsg);
        localStorage.setItem("minerador_pro_ai_messages", JSON.stringify(localMsg));
      }

    } catch (err: any) {
      console.error("Falha ao comunicar com IA:", err);
      // Fallback response inside flow
      const fallbackReply: Message = {
        id: `msg-ai-err-${Date.now()}`,
        session_id: currentSession.id,
        role: "assistant",
        content: `❌ Conexão com a rede de IA falhou: ${err.message}. Certifique-se de que o servidor Vusk Operation está ativo e o GEMINI_API_KEY no arquivo .env ou variáveis de ambiente está declarado.`,
        created_at: new Date().toISOString()
      };
      setMessages([...nextMessages, fallbackReply]);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleClearSession = async () => {
    if (!selectedAgent || !currentSession) return;

    if (window.confirm("Deseja realmente limpar todo o histórico de mensagens desta conversa?")) {
      try {
        const isRemoteSession = localMode === "remote" && supabase && isValidUuid(currentSession.id);
        if (isRemoteSession) {
          // Clear remote messages for this session
          const { error } = await supabase
            .from("chat_messages")
            .delete()
            .eq("session_id", currentSession.id);
          
          if (error) throw error;
        } else {
          // Clear local
          const cachedMsg = localStorage.getItem("minerador_pro_ai_messages");
          if (cachedMsg) {
            try {
              const localMsg: Message[] = JSON.parse(cachedMsg);
              const filtered = localMsg.filter(m => m.session_id !== currentSession.id);
              localStorage.setItem("minerador_pro_ai_messages", JSON.stringify(filtered));
            } catch {}
          }
        }
        setMessages([]);
      } catch (err: any) {
        alert(`Erro ao limpar conversa: ${err.message}`);
      }
    }
  };

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(SUPABASE_AGENT_SCHEMA_SQL);
    setIsSqlCopied(true);
    setTimeout(() => setIsSqlCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Super Header Tab metadata ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-[10px] text-primary font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,42,42,0.8)]"></span>
            Modulo Agentes IA
          </div>
          <h2 className="text-xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Personas Customizadas
          </h2>
          <p className="text-xs text-ink-secondary font-medium max-w-2xl leading-relaxed">
            Consulte inteligências artificiais com identidades exclusivas injetadas por meio de arquivos <span className="text-primary font-bold">.md</span>. Crie ganchos, revise copys e otimize funis usando especialistas focados sob demanda.
          </p>
        </div>

        {/* Create new agent button trigger */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 mac-btn-primary text-white text-xs font-bold tracking-wide transition-all cursor-pointer h-11 self-start md:self-auto shrink-0 select-none"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Novo Agente</span>
        </button>
      </div>

      {/* SQL Script assistant helper prompt if on localMode */}
      {localMode === "local" && (
        <div className="bg-systemYellow/10 border border-systemYellow/25 rounded-mac-lg p-5 space-y-3.5 select-none text-left">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-mac-sm bg-systemYellow/10 flex items-center justify-center text-systemYellow shrink-0 border border-systemYellow/25">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-systemYellow">
                Modo local ativado para Personas IA
              </h4>
              <p className="text-[11px] text-ink-secondary leading-relaxed mt-0.5 max-w-xl">
                O Supabase não está vinculado ou as tabelas <code className="text-white bg-white/5 px-1 py-0.5 rounded text-[9px] font-mono">agents</code>, <code className="text-white bg-white/5 px-1 py-0.5 rounded text-[9px] font-mono">chat_sessions</code> e <code className="text-white bg-white/5 px-1 py-0.5 rounded text-[9px] font-mono">chat_messages</code> não foram criadas no seu banco de dados. Os agentes e conversas estão salvos de forma segura em LocalStorage.
              </p>
            </div>
            <button
              onClick={() => setIsSqlVisible(!isSqlVisible)}
              className="text-[10px] text-systemYellow hover:text-white font-mono font-extrabold uppercase tracking-wider px-3 py-1.5 bg-systemYellow/10 hover:bg-systemYellow/20 border border-systemYellow/25 rounded-mac-sm flex items-center gap-1.5 transition-all cursor-pointer ml-auto shrink-0"
            >
              {isSqlVisible ? "Ocultar" : "Mostrar SQL"}
            </button>
          </div>

          {isSqlVisible && (
            <div className="pt-2 space-y-3 animate-slide-up border-t border-systemYellow/20">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-systemYellow uppercase font-bold">
                  COPIE E COLE NO SQL EDITOR DO SUPABASE PARA ATIVAR O MODO NUVEM
                </span>
                <button
                  onClick={copySqlToClipboard}
                  className="text-[10px] text-white font-mono font-bold uppercase tracking-wider px-3 py-1.5 mac-btn-secondary flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isSqlCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-systemGreen" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Código SQL
                    </>
                  )}
                </button>
              </div>
              <div className="bg-surface-base border border-hairline p-4 rounded-mac-lg text-[10px] font-mono leading-relaxed text-ink-secondary overflow-x-auto max-h-52 scrollbar-thin">
                <pre>{SUPABASE_AGENT_SCHEMA_SQL}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main split viewport layout screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (list of agents selection - 4 cols wide) */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-[9px] text-ink-tertiary font-bold uppercase tracking-widest block font-mono select-none px-1">
            Agentes Disponíveis ({agents.length})
          </span>

          {loadingAgents ? (
            <div className="p-12 border border-hairline rounded-mac-lg bg-surface-base flex flex-col items-center justify-center text-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="text-[10px] text-ink-tertiary font-mono tracking-wider font-semibold uppercase">
                Sincronizando mentes...
              </span>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1.5 scrollbar-thin">
              {agents.map((ag) => {
                const isSelected = selectedAgent?.id === ag.id;
                return (
                  <button
                    key={ag.id}
                    onClick={() => handleSelectAgent(ag)}
                    className={`w-full p-4 rounded-mac-lg text-left border flex items-start gap-3.5 transition-all cursor-pointer select-none relative overflow-hidden group ${
                      isSelected
                        ? "bg-primary/5 border-primary/35 shadow-[0_0_15px_rgba(255,42,42,0.06)]"
                        : "mac-card border-hairline hover:bg-surface-raised"
                    }`}
                  >
                    {/* Visual left selector glow highlight */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary animate-pulse" />
                    )}

                    {/* Agent avatar emoji or thumbnail */}
                    <div className={`w-10 h-10 rounded-mac-md flex items-center justify-center text-lg shadow-sm shrink-0 border transition-all ${
                      isSelected 
                        ? "bg-primary/20 border-primary text-white" 
                        : "bg-surface-raised border-hairline text-ink-secondary group-hover:text-white"
                    }`}>
                      {ag.avatar_url || "🤖"}
                    </div>

                    {/* Agent info details */}
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white tracking-wide truncate">
                        {ag.name}
                      </h4>
                      <p className="text-[10px] text-ink-secondary leading-relaxed font-semibold line-clamp-2">
                        {ag.description}
                      </p>
                    </div>

                    <ArrowRight className={`w-4 h-4 shrink-0 transition-all self-center text-ink-tertiary ${
                      isSelected ? "text-primary translate-x-0.5 opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5"
                    }`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column (active Chat Interface viewport - 8 cols wide) */}
        <div className="lg:col-span-8">
          {selectedAgent ? (
            <ChatInterface
              agent={selectedAgent}
              currentSession={currentSession}
              messages={messages}
              loadingMessages={loadingMessages}
              onSendMessage={handleSendMessage}
              onClearSession={handleClearSession}
              sending={sendingMessage}
            />
          ) : (
            <div className="h-[450px] border border-dashed border-hairline rounded-mac-lg bg-surface-base flex flex-col items-center justify-center p-6 text-center text-ink-tertiary space-y-3.5 select-none">
              <Bot className="w-12 h-12 text-ink-tertiary animate-pulse" />
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Selecione uma Mente de IA</p>
                <p className="text-[11px] text-ink-secondary leading-relaxed max-w-xs mx-auto mt-0.5">
                  Navegue pela coluna à esquerda para abrir a janela de diálogo com um dos nossos agentes especializados.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating creations modal dialog Form */}
      {isCreateModalOpen && (
        <CreateAgentModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateAgent}
        />
      )}
    </div>
  );
}

// Complete copy-paste SQL code helper specifically for AIAgentsPanel tables initialization
const SUPABASE_AGENT_SCHEMA_SQL = `-- 1. Create Storage bucket 'agent_files' for md upload assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('agent_files', 'agent_files', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create the agents table
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    system_prompt_url TEXT,
    system_prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for agents" ON public.agents FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert for agents" ON public.agents FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update for agents" ON public.agents FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete for agents" ON public.agents FOR DELETE TO public USING (true);

-- 3. Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for chat_sessions" ON public.chat_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert for chat_sessions" ON public.chat_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update for chat_sessions" ON public.chat_sessions FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete for chat_sessions" ON public.chat_sessions FOR DELETE TO public USING (true);

-- 4. Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for chat_messages" ON public.chat_messages FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert for chat_messages" ON public.chat_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update for chat_messages" ON public.chat_messages FOR UPDATE TO public USING (true);
CREATE POLICY "Allow public delete for chat_messages" ON public.chat_messages FOR DELETE TO public USING (true);

-- 5. Storage policies for raw upload in agent_files bucket
CREATE POLICY "Public Read agent_files" ON storage.objects FOR SELECT TO public USING (bucket_id = 'agent_files');
CREATE POLICY "Public Upload agent_files" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'agent_files');
CREATE POLICY "Public Delete agent_files" ON storage.objects FOR DELETE TO public USING (bucket_id = 'agent_files');`;
