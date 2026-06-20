import React, { useState, useEffect, useRef } from "react";
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Copy, 
  Check, 
  Loader2, 
  Tag, 
  Search, 
  FolderHeart, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Database, 
  Eye, 
  Layers, 
  ArrowRight,
  TrendingDown,
  ExternalLink,
  ChevronRight,
  Trophy
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import imageCompression from "browser-image-compression";
import { cleanMetadataAndVaryHash } from "../lib/imageVariation";

// SQL creation script that the developer can paste into the SQL editor
export const VAULT_SQL_SCRIPT = `-- 1. Crie a tabela de criativos
create table if not exists public.creatives (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  name text not null,
  size_kb double precision not null,
  original_size_kb double precision,
  tags text[] default array[]::text[],
  nicho text default 'outros',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilite a RLS na tabela de criativos
alter table public.creatives enable row level security;

-- 3. Crie políticas públicas ou autenticadas para livre controle
create policy "Permitir leitura geral" on public.creatives for select using (true);
create policy "Permitir inserção geral" on public.creatives for insert with check (true);
create policy "Permitir deleção geral" on public.creatives for delete using (true);

-- 4. Instancie o bucket 'creatives' no sistema de Storage do Supabase se não existir
insert into storage.buckets (id, name, public)
values ('creatives', 'creatives', true)
on conflict (id) do nothing;

-- 5. Crie políticas de RLS livres para o bucket creatives no Storage
create policy "Acesso a leitura de imagens" on storage.objects for select using (bucket_id = 'creatives');
create policy "Acesso a upload de imagens" on storage.objects for insert with check (bucket_id = 'creatives');
create policy "Acesso a deleção de imagens" on storage.objects for delete using (bucket_id = 'creatives');`;

export interface CreativeItem {
  id: string;
  image_url: string;
  name: string;
  size_kb: number;
  original_size_kb?: number;
  tags: string[];
  nicho: string;
  created_at: string;
  is_winner?: boolean;
}

export function CreativeVault() {
  const [creatives, setCreatives] = useState<CreativeItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNicheFilter, setSelectedNicheFilter] = useState("all");

  // New item upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [creativeName, setCreativeName] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("outros");
  const [tagsInput, setTagsInput] = useState("");
  
  // Compression status info
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);
  const [origSize, setOrigSize] = useState<number | null>(null);
  const [finalSize, setFinalSize] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Copy success feedback maps
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSqlCopied, setIsSqlCopied] = useState(false);

  // Lightbox overlay zoom
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch creatives from Supabase on init
  useEffect(() => {
    if (isSupabaseConfigured) {
      loadCreatives();
    }
  }, []);

  const loadCreatives = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("creatives")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching creatives:", error);
      } else if (data) {
        setCreatives(data as CreativeItem[]);
      }
    } catch (err) {
      console.error("Crash loading creative vault:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert files instantly to WebP on selection & compress
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await compressAndReview(file);
  };

  const compressAndReview = async (file: File) => {
    setIsCompressing(true);
    setErrorMessage("");
    setSelectedFile(file);
    
    const sizeInKb = file.size / 1024;
    setOrigSize(sizeInKb);

    // Set fallback name as title
    const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setCreativeName(cleanName);

    let baseFile: File = file;
    try {
      // Configuration for super-efficient browser-image-compression
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: "image/webp" // Convert all PNG, JPEG, GIF outputs to high efficiency WebP
      };

      baseFile = await imageCompression(file, options);
    } catch (err: any) {
      console.error("Local compression failed, usando arquivo original antes da limpeza de metadados:", err);
    }

    try {
      // Limpa EXIF/GPS/device e varia o hash de conteúdo (ver lib/imageVariation.ts)
      const cleanedBlob = await cleanMetadataAndVaryHash(baseFile, "image/webp");
      const cleanedFile = new File(
        [cleanedBlob],
        baseFile.name.replace(/\.[^.]+$/, "") + ".webp",
        { type: "image/webp" }
      );
      const finalSizeInKb = cleanedFile.size / 1024;

      setCompressedFile(cleanedFile);
      setFinalSize(finalSizeInKb);
      setCompressionRatio(Math.max(0, 100 - (finalSizeInKb / sizeInKb) * 100));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(cleanedFile);
    } catch (err: any) {
      console.error("Metadata cleanup failed, usando arquivo sem limpeza:", err);
      const finalSizeInKb = baseFile.size / 1024;
      setCompressedFile(baseFile);
      setFinalSize(finalSizeInKb);
      setCompressionRatio(Math.max(0, 100 - (finalSizeInKb / sizeInKb) * 100));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(baseFile);
    } finally {
      setIsCompressing(false);
    }
  };

  const triggerUpload = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage("Por favor, conecte o Supabase primeiro clicando no botão no topo do site.");
      return;
    }
    if (!compressedFile || !creativeName) {
      setErrorMessage("Por favor, selecione uma imagem e preencha o nome do criativo.");
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    try {
      // Proactively ensure that the public bucket 'creatives' exists in Storage
      try {
        await supabase.storage.createBucket("creatives", { public: true });
      } catch (bucketErr) {
        // Ignored if the bucket already exists or the user does not have administrative rights
        console.log("Bucket 'creatives' check/creation complete or skipped:", bucketErr);
      }

      // Generate unique name for WebP conversion
      const fileId = crypto.randomUUID();
      const cleanFileName = creativeName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
      const filePath = `creatives_${fileId}_${cleanFileName}.webp`;

      // Upload file directly into supabase creatives storage bucket
      const { error: uploadError } = await supabase.storage
        .from("creatives")
        .upload(filePath, compressedFile, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Upload falhou: ${uploadError.message}`);
      }

      // Retrieve public URL
      const { data: publicUrlData } = supabase.storage
        .from("creatives")
        .getPublicUrl(filePath);

      const publicImageUrl = publicUrlData.publicUrl;

      // Extract parsed tags
      const splitTags = tagsInput
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      // Save row to Postgres DB
      const newRow = {
        name: creativeName,
        image_url: publicImageUrl,
        size_kb: parseFloat((finalSize || 0).toFixed(1)),
        original_size_kb: parseFloat((origSize || 0).toFixed(1)),
        nicho: selectedNiche,
        tags: splitTags
      };

      const { data, error: insertError } = await supabase
        .from("creatives")
        .insert([newRow])
        .select();

      if (insertError) {
        // If Postgres fails, let's inform that they need to execute the SQL setup
        if (insertError.code === "PGRST116" || insertError.message.includes("does not exist")) {
          throw new Error("Erro de infraestrutura: A tabela 'creatives' não foi criada no seu Supabase. Copie e execute o script SQL abaixo.");
        }
        throw new Error(`Insert DB falhou: ${insertError.message}`);
      }

      // Upload completed successfully! Add to state grid
      if (data && data[0]) {
        setCreatives(prev => [data[0] as CreativeItem, ...prev]);
      }

      // Reset form states
      setSelectedFile(null);
      setCompressedFile(null);
      setPreviewUrl(null);
      setCreativeName("");
      setTagsInput("");
      setOrigSize(null);
      setFinalSize(null);
      setCompressionRatio(null);

    } catch (err: any) {
      console.error("Process error uploading creative:", err);
      setErrorMessage(err.message || "Erro desconhecido ao enviar.");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteCreative = async (item: CreativeItem) => {
    if (!supabase) return;
    if (!window.confirm("Deseja deletar este criativo do cofre permanentemente?")) return;

    try {
      // 1. Delete DB Row
      const { error: dbError } = await supabase
        .from("creatives")
        .delete()
        .eq("id", item.id);

      if (dbError) {
        alert(`Erro ao apagar do Banco: ${dbError.message}`);
        return;
      }

      // 2. Try extraction of filepath to delete from Storage as well
      try {
        const urlParts = item.image_url.split("/object/public/creatives/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("creatives").remove([filePath]);
        }
      } catch (stErr) {
        console.warn("Storage item removal skipped/failed:", stErr);
      }

      // Refresh list
      setCreatives(prev => prev.filter(c => c.id !== item.id));
    } catch (err: any) {
      console.error("Error during deletion execution:", err);
    }
  };

  const copyUrlToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const copySqlCode = () => {
    navigator.clipboard.writeText(VAULT_SQL_SCRIPT);
    setIsSqlCopied(true);
    setTimeout(() => setIsSqlCopied(false), 2000);
  };

  const getFormatNicho = (n: string) => {
    switch (n) {
      case "emagrecimento": return "Emagrecimento";
      case "saude_masculina": return "Saúde Masculina";
      case "saude_bem_estar": return "Bem Estar";
      case "renda_extra": return "Renda Extra";
      case "relacionamento": return "Relacionamento";
      case "financas": return "Finanças";
      case "cripto": return "Cripto";
      case "beleza": return "Beleza";
      default: return n.toUpperCase();
    }
  };

  // Drag over handler for instant screen dropping
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await compressAndReview(file);
    }
  };

  // Filter creatives live
  const filteredCreatives = creatives.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedNicheFilter === "all") {
      return matchesSearch;
    }
    return matchesSearch && c.nicho === selectedNicheFilter;
  });

  // Calculate high value stats
  const totalOriginalSizeKb = creatives.reduce((acc, c) => acc + (c.original_size_kb || c.size_kb), 0);
  const totalCompressedSizeKb = creatives.reduce((acc, c) => acc + c.size_kb, 0);
  const sizeSavedMb = ((totalOriginalSizeKb - totalCompressedSizeKb) / 1024).toFixed(2);
  const compressionSavingsPct = totalOriginalSizeKb > 0 
    ? ((1 - (totalCompressedSizeKb / totalOriginalSizeKb)) * 100).toFixed(0)
    : "0";

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Dynamic Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 mac-card select-none">
        <div className="space-y-1">
          <span className="text-[9px] text-primary font-bold uppercase tracking-widest block font-sans">MÓDULO COFRE DE CRIATIVOS</span>
          <h2 className="text-xl font-bold font-sans text-white tracking-tight flex items-center gap-2">
            <FolderHeart className="w-5 h-5 text-primary" /> Armazenamento Inteligente de Imagens WebP
          </h2>
          <p className="text-xs text-ink-secondary max-w-xl leading-relaxed">
            Seus melhores criativos otimizados localmente no browser antes do upload. Menos consumo de banda, indexação instantânea do PostgreSQL do Supabase e links com CDN global de alta velocidade.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Active indicator */}
          {isSupabaseConfigured ? (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-systemGreen font-mono bg-systemGreen/10 border border-systemGreen/25 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold select-none">
              <span className="w-1.5 h-1.5 bg-systemGreen rounded-full shadow-[0_0_6px_rgba(48,209,88,0.5)]"></span>
              Banco Vinculado
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-systemYellow font-mono bg-systemYellow/10 border border-systemYellow/25 px-3 py-1 rounded-full uppercase tracking-wider font-extrabold select-none">
              <span className="w-1.5 h-1.5 bg-systemYellow rounded-full"></span>
              Apenas Local
            </div>
          )}
        </div>
      </div>

      {/* Spatial Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BLOCK 1: Upload, Local Optimization controls (Width: 5 Cols on large) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="mac-card p-6 relative overflow-hidden flex flex-col justify-between min-h-[480px]">
            {/* Subtle glow background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest block font-mono">Input de Importação</span>
                <span className="text-[10px] text-ink-tertiary font-mono">WebP Converter Ativo</span>
              </div>

              {/* High-Fi Drag & Drop Uploader Component */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-mac-md p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  previewUrl 
                    ? "border-systemGreen/40 bg-systemGreen/5" 
                    : "border-hairline hover:border-primary/40 bg-surface-base hover:bg-surface-raised"
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                {previewUrl ? (
                  <div className="relative group w-full flex flex-col items-center">
                    <img 
                      src={previewUrl} 
                      alt="Otimizado" 
                      className="max-h-36 rounded-mac-sm object-contain border border-hairline shadow-lg"
                    />
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-systemGreen font-mono leading-none">
                      <Sparkles className="w-3.5 h-3.5 text-systemGreen animate-pulse" />
                      <span>WebP Otimizado com sucesso!</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center mx-auto text-zinc-300 border border-hairline group-hover:scale-110 transition-transform">
                      {isCompressing ? (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      ) : (
                        <Upload className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Arraste a imagem ou clique</p>
                      <p className="text-[10px] text-ink-tertiary mt-1">Imagens originais pesadas serão convertidas localmente no seu computador</p>
                    </div>
                  </div>
                )}
              </div>

              {/* If compression succeeded, display super stats */}
              {compressionRatio !== null && previewUrl && (
                <div className="bg-surface-raised border border-hairline p-4 rounded-mac-md space-y-2 select-none animate-scale-in">
                  <div className="text-[10px] text-ink-tertiary font-bold uppercase tracking-widest font-mono">Eficiência no Cliente</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-surface-base">
                      <div className="text-[10px] text-ink-tertiary uppercase">Original</div>
                      <div className="text-xs font-bold text-ink-secondary font-mono mt-0.5">{(origSize || 0).toFixed(1)} KB</div>
                    </div>
                    <div className="p-2 rounded bg-surface-base">
                      <div className="text-[10px] text-ink-tertiary uppercase font-bold text-systemGreen">WebP Final</div>
                      <div className="text-xs font-bold text-white font-mono mt-0.5">{(finalSize || 0).toFixed(1)} KB</div>
                    </div>
                    <div className="p-2 rounded bg-primary/10 border border-primary/15 text-primary">
                      <div className="text-[10px] uppercase font-bold flex items-center justify-center gap-0.5"><TrendingDown className="w-3 h-3" /> Redução</div>
                      <div className="text-xs font-extrabold font-mono mt-0.5">{compressionRatio.toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Creative Upload Meta Config Details */}
              {previewUrl && (
                <div className="space-y-3.5 animate-scale-in pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-ink-tertiary font-bold uppercase tracking-wider pl-1">Nome do Criativo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: criativo_vsl_emagrecimento_01"
                      className="w-full mac-input text-white text-xs px-4 py-2.5 outline-none h-10"
                      value={creativeName}
                      onChange={(e) => setCreativeName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-ink-tertiary font-bold uppercase tracking-wider pl-1">Segmentação / Nicho</label>
                      <select 
                        className="w-full mac-input text-white text-xs px-3.5 py-2.5 outline-none cursor-pointer h-10"
                        value={selectedNiche}
                        onChange={(e) => setSelectedNiche(e.target.value)}
                      >
                        <option value="emagrecimento">Emagrecimento</option>
                        <option value="saude_masculina">Saúde Masculina</option>
                        <option value="saude_bem_estar">Bem Estar</option>
                        <option value="renda_extra">Renda Extra</option>
                        <option value="relacionamento">Relacionamento</option>
                        <option value="financas">Finanças</option>
                        <option value="cripto">Cripto</option>
                        <option value="beleza">Beleza</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider pl-1">Tags (separadas por vírgula)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: vsl, facebook, 50anos"
                        className="w-full mac-input text-white text-xs px-4 py-2.5 outline-none h-10"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error state wrapper */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-systemRed/10 border border-systemRed/25 rounded-xl text-systemRed text-xs flex gap-2 items-start animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-sans leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <div className="pt-6">
              {previewUrl ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setCompressedFile(null);
                      setPreviewUrl(null);
                      setOrigSize(null);
                      setFinalSize(null);
                      setCompressionRatio(null);
                    }}
                    className="flex-1 text-[10px] uppercase tracking-wider text-white font-bold py-3.5 mac-btn-secondary"
                  >
                    Descartar Imagem
                  </button>

                  <button
                    onClick={triggerUpload}
                    disabled={isUploading}
                    className="flex-[2] mac-btn-primary text-white font-bold py-3.5 px-6 rounded-full text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando...
                      </>
                    ) : (
                      <>
                        Enviar para o Cofre <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-ink-tertiary text-center leading-relaxed font-sans select-none">
                  *A imagem sofrerá conversão para WebP de formato comprimido inteligente de camada única, sem poluir seu storage.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* BLOCK 2: Live Database Grid, Stats & Gallery Items (8 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Bento Header Mini Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            {/* Total creatives */}
            <div className="mac-card p-4 flex items-center justify-between gap-2 select-none">
              <div>
                <span className="text-[9px] text-ink-tertiary font-bold uppercase tracking-widest block font-mono">Indexados</span>
                <span className="text-xl font-extrabold text-white font-sans mt-1 block">{creatives.length} <span className="text-xs text-ink-tertiary font-medium font-sans">arquivos</span></span>
              </div>
              <div className="w-9 h-9 bg-primary/10 border border-primary/25 rounded-mac-lg flex items-center justify-center text-primary">
                <ImageIcon className="w-4 h-4" />
              </div>
            </div>

            {/* Storage economy in Megabytes */}
            <div className="mac-card p-4 flex items-center justify-between gap-2 select-none">
              <div>
                <span className="text-[9px] text-ink-tertiary font-bold uppercase tracking-widest block font-mono">Banda Salva</span>
                <span className="text-xl font-extrabold text-systemGreen font-sans mt-1 block">{sizeSavedMb} <span className="text-xs text-ink-tertiary font-medium font-sans">MB</span></span>
              </div>
              <div className="w-9 h-9 bg-systemGreen/10 border border-systemGreen/25 rounded-mac-lg flex items-center justify-center text-systemGreen">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>

            {/* Savings percent in WebP standard */}
            <div className="mac-card p-4 col-span-2 sm:col-span-1 flex items-center justify-between gap-2 select-none">
              <div>
                <span className="text-[9px] text-ink-tertiary font-bold uppercase tracking-widest block font-mono">Taxa Total Poupada</span>
                <span className="text-xl font-extrabold text-white font-sans mt-1 block">~ {compressionSavingsPct}% <span className="text-[10px] text-ink-tertiary font-mono font-bold tracking-widest uppercase ml-0.5">MÉDIA</span></span>
              </div>
              <div className="w-9 h-9 bg-surface-raised border border-hairline rounded-mac-lg flex items-center justify-center text-ink-primary">
                <Layers className="w-4 h-4" />
              </div>
            </div>

          </div>

          {/* Gallery controls / Filters bar */}
          <div className="mac-card p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
            
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <input 
                type="text" 
                placeholder="Buscar por tag ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full mac-input text-white pl-8 pr-4 py-2 rounded-full outline-none transition-all h-9 placeholder:text-ink-tertiary"
              />
              <Search className="w-3.5 h-3.5 text-ink-tertiary absolute left-3 top-2.5" />
            </div>

            {/* Filter tags buttons row */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto overflow-x-auto justify-end select-none scrollbar-none">
              <button
                onClick={() => setSelectedNicheFilter("all")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                  selectedNicheFilter === "all" 
                    ? "mac-btn-primary text-white" 
                    : "mac-btn-secondary text-ink-secondary hover:text-white"
                }`}
              >
                Todos
              </button>
              {["emagrecimento", "saude_masculina", "saude_bem_estar", "renda_extra", "relacionamento", "financas", "cripto", "beleza", "outros"].map(n => {
                // Check if there is at least one item of this niche to display filters nicely
                const hasItem = creatives.some(c => c.nicho === n);
                if (!hasItem) return null;

                return (
                  <button
                    key={n}
                    onClick={() => setSelectedNicheFilter(n)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-sans font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                      selectedNicheFilter === n 
                        ? "mac-btn-primary text-white" 
                        : "mac-btn-secondary text-ink-secondary hover:text-white"
                    }`}
                  >
                    {getFormatNicho(n)}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Grid list container (Bento items) */}
          {isLoading ? (
            <div className="h-64 border border-hairline rounded-mac-lg bg-surface-base flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs text-ink-tertiary font-mono">Buscando criativos do Supabase...</span>
            </div>
          ) : filteredCreatives.length === 0 ? (
            <div className="h-64 border border-hairline rounded-mac-lg bg-surface-base flex flex-col items-center justify-center gap-3 text-center p-6 select-none animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-surface-raised border border-hairline flex items-center justify-center text-ink-tertiary">
                <ImageIcon className="w-5 h-5 text-ink-tertiary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Cofre de criativos vazio</p>
                <p className="text-[10px] text-ink-tertiary max-w-sm mx-auto">Nenhum criativo foi indexado ainda ou corresponde aos filtros atuais. Faça o upload do seu primeiro arquivo na caixa do lado.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {filteredCreatives.map((item) => (
                <div 
                  key={item.id}
                  className="mac-card overflow-hidden group hover:border-white/10 transition-all duration-300 relative select-none flex flex-col h-70 shadow-lg justify-between"
                >
                  
                  {/* Image container box */}
                  <div className="relative w-full h-40 bg-surface-base border-b border-hairline flex items-center justify-center overflow-hidden">
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient top cover overlay */}
                    <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>

                    {/* Left Niches Badge */}
                    <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 bg-surface-raised text-white border border-hairline px-2.5 py-1 rounded-mac-sm text-[9px] font-sans font-bold uppercase tracking-wider select-none h-6">
                      <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_4px_#FF453A]"></span>
                      {getFormatNicho(item.nicho)}
                    </div>

                    {/* Right Size badge */}
                    <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 bg-surface-base text-ink-secondary border border-hairline px-2 py-0.5 rounded-mac-sm text-[9px] font-mono select-none">
                      WebP • {item.size_kb.toFixed(0)} KB
                    </div>

                    {/* Winner badge, set via ação do Agente IA (marcar_criativo_vencedor) */}
                    {item.is_winner && (
                      <div className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 bg-systemYellow/15 text-systemYellow border border-systemYellow/30 px-2 py-0.5 rounded-mac-sm text-[9px] font-mono font-bold uppercase tracking-wider select-none">
                        <Trophy className="w-3 h-3" /> Vencedor
                      </div>
                    )}

                    {/* Hover controls action triggers overlay */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                      <button
                        onClick={() => setActiveLightbox(item.image_url)}
                        className="w-9 h-9 mac-btn-secondary text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md"
                        title="Visualizar criativo ampliado"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => copyUrlToClipboard(item.image_url, item.id)}
                        className="w-9 h-9 mac-btn-secondary text-white hover:text-systemGreen rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md"
                        title="Copiar URL pública do creative"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-systemGreen" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => deleteCreative(item)}
                        className="w-9 h-9 bg-systemRed/10 border border-systemRed/25 text-systemRed rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md"
                        title="Excluir criativo permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* Creative meta stats footer */}
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <div className="text-xs font-bold text-white line-clamp-1 break-all" title={item.name}>
                        {item.name}
                      </div>

                      {/* Display tags list */}
                      {item.tags && item.tags.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 mt-2.5">
                          {item.tags.map((tg, i) => (
                            <span 
                              key={i}
                              className="text-[9px] font-sans font-semibold tracking-wide text-ink-secondary bg-surface-raised border border-hairline px-1.5 py-0.5 rounded-mac-sm cursor-pointer hover:bg-white/5 hover:text-white transition-all select-none"
                            >
                              #{tg}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] text-ink-tertiary mt-2 font-sans italic select-none">
                          Sem tags inseridas
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-ink-secondary mt-3 pt-2.5 border-t border-hairline select-none h-6">
                      <span className="font-mono">
                        {new Date(item.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        })}
                      </span>

                      {item.original_size_kb && (
                        <span className="text-[9px] font-mono text-systemGreen bg-systemGreen/10 border border-systemGreen/25 rounded-mac-sm px-1.5 py-0.5 font-bold">
                          Poupança de {(100 - (item.size_kb / item.original_size_kb) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Full screen Lightbox preview modal for creatives zoom (Spatial aesthetic) */}
      {activeLightbox && (
        <div className="fixed inset-0 mac-glass z-[60] flex items-center justify-center p-4 animate-fade-in font-sans">
          
          {/* Close trigger overlay click */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setActiveLightbox(null)}></div>
          
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            
            <img 
              src={activeLightbox} 
              alt="Creative zoom" 
              className="max-h-[85vh] max-w-full rounded-mac-md border border-hairline shadow-2xl z-10 animate-scale-in object-contain select-none"
            />

            {/* Quick action controls at the zoom bottom floating */}
            <div className="mt-4 flex gap-4 select-none z-10">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeLightbox);
                  alert("URL pública copiada para a área de transferência!");
                }}
                className="text-[10px] text-white font-extrabold uppercase tracking-widest px-4 py-2 mac-btn-secondary flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3" /> Copiar Link
              </button>

              <button
                onClick={() => setActiveLightbox(null)}
                className="text-[10px] text-white font-extrabold uppercase tracking-widest px-4 py-2 mac-btn-primary rounded-full transition-all cursor-pointer h-8"
              >
                Voltar ao Cofre
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
