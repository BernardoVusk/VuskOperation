import { useRef, useState, useEffect } from "react";
import {
  Bold, Italic, Underline, Heading1, Heading2, Pilcrow,
  List, ListOrdered, Quote, Palette, Highlighter, Link2, Unlink
} from "lucide-react";

interface RichTextEditorProps {
  value: string;        // HTML
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;    // default "100px"
}

const TEXT_COLORS = [
  { label: "Padrão", value: "#FFFFFF" },
  { label: "Vermelho", value: "#FF453A" },
  { label: "Verde", value: "#10B981" },
  { label: "Azul", value: "#3B82F6" },
  { label: "Amarelo", value: "#F59E0B" },
  { label: "Roxo", value: "#A855F7" },
];

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", value: "#F59E0B33" },
  { label: "Vermelho", value: "#FF453A33" },
  { label: "Verde", value: "#10B98133" },
  { label: "Azul", value: "#3B82F633" },
  { label: "Remover", value: "transparent" },
];

export function RichTextEditor({ value, onChange, placeholder, minHeight = "100px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Inicializa o conteúdo apenas uma vez (evita reset de cursor durante digitação)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []); // apenas no mount

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    try {
      document.execCommand(command, false, val);
    } catch {
      // fallback silencioso para comandos não suportados
    }
    handleInput();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleHighlight = (color: string) => {
    editorRef.current?.focus();
    try {
      document.execCommand("hiliteColor", false, color);
    } catch {
      try {
        document.execCommand("backColor", false, color);
      } catch {
        // Fallback fallback
      }
    }
    handleInput();
    setShowHighlightPicker(false);
  };

  const handleLink = () => {
    const url = window.prompt("Digite a URL do link:");
    if (url) {
      exec("createLink", url);
    }
  };

  return (
    <div className="border border-hairline rounded-mac-lg bg-surface-base overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-hairline flex-wrap bg-surface-base">
        
        <ToolbarButton icon={Bold} onClick={() => exec("bold")} title="Negrito" />
        <ToolbarButton icon={Italic} onClick={() => exec("italic")} title="Itálico" />
        <ToolbarButton icon={Underline} onClick={() => exec("underline")} title="Sublinhado" />

        <Divider />

        <ToolbarButton icon={Heading1} onClick={() => exec("formatBlock", "H1")} title="Título 1" />
        <ToolbarButton icon={Heading2} onClick={() => exec("formatBlock", "H2")} title="Título 2" />
        <ToolbarButton icon={Pilcrow} onClick={() => exec("formatBlock", "P")} title="Texto normal" />

        <Divider />

        <ToolbarButton icon={List} onClick={() => exec("insertUnorderedList")} title="Lista com marcadores" />
        <ToolbarButton icon={ListOrdered} onClick={() => exec("insertOrderedList")} title="Lista numerada" />
        <ToolbarButton icon={Quote} onClick={() => exec("formatBlock", "BLOCKQUOTE")} title="Citação" />

        <Divider />

        {/* Color picker */}
        <div className="relative">
          <ToolbarButton 
            icon={Palette} 
            onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }} 
            title="Cor do texto" 
          />
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-surface-raised border border-hairline 
              rounded-mac-md p-2 flex gap-1.5 shadow-lg">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { exec("foreColor", c.value); setShowColorPicker(false); }}
                  title={c.label}
                  className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight picker */}
        <div className="relative">
          <ToolbarButton 
            icon={Highlighter} 
            onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }} 
            title="Realçar texto" 
          />
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-surface-raised border border-hairline 
              rounded-mac-md p-2 flex gap-1.5 shadow-lg">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleHighlight(c.value)}
                  title={c.label}
                  className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.value === "transparent" ? "#27272a" : c.value }}
                />
              ))}
            </div>
          )}
        </div>

        <Divider />

        <ToolbarButton icon={Link2} onClick={handleLink} title="Inserir link" />
        <ToolbarButton icon={Unlink} onClick={() => exec("unlink")} title="Remover link" />
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="rte-content px-4 py-3 text-xs text-ink-primary font-sans 
          leading-relaxed focus:outline-none overflow-y-auto"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}

function ToolbarButton({ icon: Icon, onClick, title }: { icon: any; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-mac-sm text-ink-secondary hover:text-white hover:bg-surface-raised 
        transition-colors cursor-pointer"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-hairline mx-0.5" />;
}
