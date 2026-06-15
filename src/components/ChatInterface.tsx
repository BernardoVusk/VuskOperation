import React, { useState, useEffect, useRef } from "react";
import { Send, Loader2, Bot, Sparkles, Database, Trash2, ArrowRight, Paperclip, FileText, Image, X } from "lucide-react";
import { motion } from "motion/react";

interface Agent {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  system_prompt: string;
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

interface ChatSession {
  id: string;
  agent_id: string;
  title: string;
  created_at: string;
}

interface ChatInterfaceProps {
  agent: Agent;
  currentSession: ChatSession | null;
  messages: Message[];
  loadingMessages: boolean;
  onSendMessage: (text: string, attachment?: { name: string; mimeType: string; data: string; size?: number } | null) => Promise<void>;
  onClearSession: () => void;
  sending: boolean;
}

export function ChatInterface({
  agent,
  currentSession,
  messages,
  loadingMessages,
  onSendMessage,
  onClearSession,
  sending
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<{
    name: string;
    mimeType: string;
    data: string; // base64 representation
    size?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Por favor, selecione um arquivo de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachment({
        name: file.name,
        mimeType: file.type,
        data: base64,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Por favor, selecione um arquivo de até 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAttachment({
        name: file.name,
        mimeType: file.type,
        data: base64,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if ((!text && !attachment) || sending) return;
    
    onSendMessage(text, attachment);
    setInputText("");
    setAttachment(null);
  };  return (
    <div 
      className="flex flex-col h-[600px] md:h-[65vh] mac-card overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header bar */}
      <div className="p-4 md:p-5 border-b border-hairline bg-surface-base flex items-center justify-between select-none shrink-0 border-box">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-mac-md bg-primary/10 border border-primary/25 flex items-center justify-center text-xl shadow-[0_0_12px_rgba(255,42,42,0.15)]">
            {agent.avatar_url || "🤖"}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{agent.name}</h4>
              <span className="w-1.5 h-1.5 rounded-full bg-systemGreen animate-pulse" title="Mente Pronta"></span>
            </div>
            <p className="text-[10px] text-ink-secondary font-medium line-clamp-1 max-w-[280px] md:max-w-md animate-fade-in">
              {agent.description || "Agente especializado em Inteligência Artificial"}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-mac-lg bg-systemRed/10 border border-systemRed/25 text-systemRed hover:text-red-300 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all active:scale-95"
            title="Limpar conversa atual"
            disabled={sending}
          >
            <Trash2 className="w-3" />
            <span className="hidden sm:inline">Limpar Chat</span>
          </button>
        )}
      </div>

      {/* Messages Flow Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-none bg-surface-base">
        
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span className="text-xs font-mono text-ink-tertiary uppercase tracking-widest font-bold">
              Iniciando transmissão de pensamentos...
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 animate-fade-in my-auto select-none">
            <div className="w-12 h-12 rounded-full bg-surface-raised border border-hairline flex items-center justify-center text-primary text-xl shadow-[0_0_20px_rgba(255,42,42,0.08)]">
              {agent.avatar_url || "🤖"}
            </div>
            <div className="space-y-1 max-w-sm">
              <h5 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Mente de Persona Conectada
              </h5>
              <p className="text-xs text-ink-secondary leading-relaxed font-medium">
                Envie suas dúvidas ou anexe imagens e arquivos por drag-and-drop ou clicando no clips abaixo. Este agente irá responder aplicando as regras de personas dele.
              </p>
            </div>

            {agent.system_prompt && (
              <div className="w-full max-w-sm p-3.5 bg-surface-raised border border-hairline rounded-mac-md text-[10px] text-ink-secondary font-mono text-left space-y-1">
                <span className="font-sans font-bold uppercase text-ink-primary text-[9px] tracking-wider block">
                  Regra Base Definida:
                </span>
                <p className="line-clamp-3 leading-normal">
                  {agent.system_prompt}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4.5">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-[85%] ${
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Left Icon/Avatar */}
                  <div className={`w-8 h-8 rounded-mac-sm flex items-center justify-center shrink-0 border select-none ${
                    isUser 
                      ? "bg-surface-raised border-hairline text-ink-primary font-bold" 
                      : "bg-primary/10 border-primary/20 text-white shadow-[0_0_8px_rgba(255,42,42,0.1)] font-mono"
                  }`}>
                    {isUser ? "U" : agent.avatar_url || "🤖"}
                  </div>

                  {/* Bubble content */}
                  <div className="space-y-1">
                    <div className={`px-4 py-3 text-xs leading-relaxed font-sans ${
                      isUser
                        ? "bg-primary/20 text-white border border-primary/25 rounded-tr-none text-left rounded-mac-lg"
                        : "bg-surface-raised border border-hairline text-ink-primary rounded-tl-none text-left rounded-mac-lg whitespace-pre-wrap"
                    }`}>
                      {/* Attached asset preview inside bubble */}
                      {m.attachment && (
                        <div className="mb-2.5">
                          {m.attachment.mimeType.startsWith("image/") ? (
                            <img
                              src={m.attachment.data}
                              alt={m.attachment.name}
                              className="max-h-56 max-w-full rounded-mac-sm object-contain border border-hairline shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                              referrerPolicy="no-referrer"
                              onClick={() => {
                                const newTab = window.open();
                                if (newTab) {
                                  newTab.document.write(`<img src="${m.attachment?.data}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                }
                              }}
                            />
                          ) : (
                            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-surface-base border border-hairline rounded-mac-md text-[11px] text-ink-primary font-medium w-fit break-all">
                              <FileText className="w-4 h-4 text-primary shrink-0" />
                              <div className="text-left">
                                <p className="truncate font-sans font-semibold text-white">{m.attachment.name}</p>
                                <p className="text-[9px] text-ink-tertiary font-mono">
                                  {m.attachment.mimeType} {m.attachment.size ? `• ${(m.attachment.size / 1024).toFixed(0)} KB` : ""}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {m.content}
                    </div>
                    <span className={`text-[8px] font-mono font-medium text-ink-tertiary block ${isUser ? "text-right" : "text-left"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated/Real writing pulse loader */}
            {sending && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-start animate-pulse">
                <div className="w-8 h-8 rounded-mac-sm bg-primary/10 border border-primary/25 flex items-center justify-center text-white text-sm">
                  {agent.avatar_url || "🤖"}
                </div>
                <div className="space-y-1">
                  <div className="px-4 py-3 bg-surface-raised border border-hairline text-xs text-ink-secondary rounded-mac-lg rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span>Pensando...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input panel block footer */}
      <div className="p-4 border-t border-hairline bg-surface-base shrink-0 select-none">
        
        {/* Input asset preview badge if selected */}
        {attachment && (
          <div className="mb-3.5 px-3 py-2.5 bg-surface-raised border border-hairline rounded-mac-lg flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {attachment.mimeType.startsWith("image/") ? (
                <div className="w-10 h-10 rounded-mac-sm bg-surface-base border border-hairline overflow-hidden shrink-0 flex items-center justify-center">
                  <img src={attachment.data} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-mac-sm bg-surface-base border border-hairline flex items-center justify-center text-primary shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="overflow-hidden text-left">
                <p className="text-xs font-semibold text-white truncate max-w-[180px] md:max-w-md">{attachment.name}</p>
                <p className="text-[10px] text-ink-tertiary font-mono">
                  {attachment.mimeType} {attachment.size ? `• ${(attachment.size / 1024).toFixed(0)} KB` : ""}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="w-8 h-8 rounded-full bg-surface-base hover:bg-surface-raised border border-hairline flex items-center justify-center text-ink-secondary hover:text-white transition-all active:scale-90 cursor-pointer"
              title="Remover anexo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2.5 items-center">
          {/* Hidden native input file select */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf,text/*,application/json,application/zip,application/x-zip-compressed"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="w-11 h-11 rounded-full mac-btn-secondary flex items-center justify-center text-ink-secondary hover:text-white transition-all cursor-pointer active:scale-90 shrink-0 select-none border border-hairline"
            title="Anexar arquivo ou imagem"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={attachment ? "Pergunte algo sobre o seu arquivo anexado..." : `Conversar com ${agent.name}... (Arraste arquivos aqui)`}
            className="flex-1 mac-input text-white text-sm outline-none px-4 py-3 rounded-full"
            disabled={sending}
          />
          
          <button
            type="submit"
            disabled={(!inputText.trim() && !attachment) || sending}
            className={`w-11 h-11 rounded-full mac-btn-primary flex items-center justify-center text-white transition-all select-none cursor-pointer active:scale-90 shrink-0 ${
              (!inputText.trim() && !attachment) || sending
                ? "opacity-30 cursor-not-allowed shadow-none"
                : "hover:scale-105 active:scale-95"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
