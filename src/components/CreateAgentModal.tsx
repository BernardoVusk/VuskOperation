import React, { useState, useRef } from "react";
import { X, Sparkles, AlertCircle, FileText, UploadCloud, Check, User } from "lucide-react";
import { motion } from "motion/react";

interface CreateAgentModalProps {
  onClose: () => void;
  onSave: (agent: {
    name: string;
    description: string;
    systemPrompt: string;
    avatarUrl: string;
    file?: File;
  }) => Promise<void>;
}

// Visual layout suggestions for avatar options (or let them pick/type one)
const PRESET_AVATARS = [
  "🤖", "🧠", "🔥", "🚀", "💡", "🎯", "🛡️", "💰", "🕵️", "🎨", "📈", "✍️"
];

export function CreateAgentModal({ onClose, onSave }: CreateAgentModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("🤖");
  const [saving, setSaving] = useState(false);
  const [errorInput, setErrorInput] = useState("");

  // MD File reference / drag-and-drop states
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processMdFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".md")) {
      setErrorInput("Por favor, selecione apenas arquivos do tipo Markdown (.md)");
      return;
    }
    
    setFile(selectedFile);
    setErrorInput("");

    // Read markdown file content to save as backing text
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setSystemPrompt(text);
      }
    };
    reader.onerror = () => {
      setErrorInput("Erro ao ler o arquivo Markdown.");
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processMdFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processMdFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInput("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorInput("Nome da IA é obrigatório.");
      return;
    }

    if (!systemPrompt.trim()) {
      setErrorInput("É necessário carregar um arquivo Markdown (.md) ou fornecer um prompt do sistema.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        avatarUrl,
        file: file || undefined
      });
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar agente:", err);
      setErrorInput(err.message || "Erro desconhecido ao salvar o agente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#050506]/92 backdrop-blur-md cursor-pointer"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-lg mac-card rounded-mac-lg overflow-hidden shadow-[0_0_50px_rgba(255,42,42,0.15)] flex flex-col max-h-[85vh]"
      >
        {/* Header decoration bar */}
        <div className="h-1 bg-gradient-to-r from-red-500 via-primary to-orange-500" />

        {/* Title area */}
        <div className="p-5 border-b border-hairline flex items-center justify-between bg-surface-base">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Criar Novo Agente de IA</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form panel body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 scrollbar-none">
          {errorInput && (
            <div className="p-3.5 rounded-mac-md bg-systemRed/10 border border-systemRed/25 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-systemRed shrink-0 mt-0.5" />
              <div className="text-[11px] text-red-200 leading-normal font-medium">{errorInput}</div>
            </div>
          )}

          {/* Nome Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Nome da Persona <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Copywriter Sênior Low Ticket"
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            />
          </div>

          {/* Descrição Curta */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono">
              Descrição do Agente
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Especialista em ganchos e headlines agressivas para VSL."
              className="w-full mac-input px-3 py-2.5 rounded-mac-sm text-xs font-sans outline-none"
              disabled={saving}
            />
          </div>

          {/* Avatar Icon Presets */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
              Avatar do Agente ({avatarUrl})
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarUrl(emoji)}
                  className={`w-9 h-9 rounded-mac-sm flex items-center justify-center text-sm transition-all border active:scale-90 cursor-pointer ${
                    avatarUrl === emoji
                      ? "bg-primary/15 border-primary text-white shadow-sm"
                      : "bg-surface-raised border border-hairline text-ink-secondary hover:text-white"
                  }`}
                  disabled={saving}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* MD System Prompt Zone (Drag-and-Drop) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-ink-tertiary tracking-wider font-mono block">
              Instruções base (Arquivo .MD) <span className="text-primary">*</span>
            </label>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-mac-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : file
                  ? "border-systemGreen/40 bg-systemGreen/5"
                  : "border-hairline bg-surface-base hover:bg-surface-raised"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md"
                className="hidden"
                onChange={handleFileSelect}
                disabled={saving}
              />

              {file ? (
                <div className="space-y-2.5 animate-slide-up">
                  <div className="w-10 h-10 rounded-full bg-systemGreen/10 border border-systemGreen/25 flex items-center justify-center text-systemGreen mx-auto">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white max-w-[250px] truncate">{file.name}</p>
                    <p className="text-[10px] font-mono text-systemGreen uppercase font-bold tracking-wider mt-0.5">
                      Prompt carregado com sucesso
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center text-ink-secondary mx-auto border border-hairline">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-300">
                      Arraste seu arquivo <span className="text-primary">.md</span> aqui
                    </span>
                    <p className="text-[10px] text-ink-tertiary mt-0.5">
                      Ou clique para buscar no seu dispositivo (Formato .md)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Preview */}
          {systemPrompt && (
            <div className="space-y-1.5 animate-fade-in">
              <span className="text-[9px] font-mono font-bold text-ink-tertiary uppercase tracking-widest block">
                Visualização do Prompt Interno ({systemPrompt.length} caracteres)
              </span>
              <div className="max-h-24 overflow-y-auto p-3 bg-surface-base border border-hairline rounded-mac-md text-[10px] text-ink-secondary font-mono whitespace-pre-wrap leading-relaxed scrollbar-none">
                {systemPrompt}
              </div>
            </div>
          )}
        </form>

        {/* Footer actions */}
        <div className="p-5 border-t border-hairline bg-surface-base flex items-center justify-end gap-3 select-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 mac-btn-secondary text-white rounded-mac-sm text-xs font-bold tracking-wide transition-all cursor-pointer"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 mac-btn-primary text-white rounded-mac-sm text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer"
            disabled={saving}
          >
            {saving ? "Salvando..." : (
              <>
                <Check className="w-3.5 h-3.5" /> Salvar Agente
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
