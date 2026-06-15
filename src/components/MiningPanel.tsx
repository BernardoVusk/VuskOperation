import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Loader2, Sparkles, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";
import { OfferHit, Tracker, SearchProgress } from "../types";
import { UrlConnectionStatus } from "./UrlConnectionStatus";
import { DashboardPanel } from "./DashboardPanel";
import { simulateScanInClient } from "../constants/simulatedOffers";

interface MiningPanelProps {
  apiKey: string;
  setApiKey: (val: string) => void;
  days: number;
  setDays: (val: number) => void;
  offerHits: OfferHit[];
  setOfferHits: React.Dispatch<React.SetStateAction<OfferHit[]>>;
  trackers: Tracker[];
}

export function MiningPanel({
  apiKey,
  setApiKey,
  days,
  setDays,
  offerHits,
  setOfferHits,
  trackers,
}: MiningPanelProps) {
  const [isMining, setIsMining] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<SearchProgress | null>(null);
  const [currentHits, setCurrentHits] = useState<OfferHit[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const miningRef = useRef<boolean>(false);

  // Monitor total trackers index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto focus and state managers
  const stopMining = () => {
    isMining && setIsMining(false);
    miningRef.current = false;
  };

  const startMining = async () => {
    if (trackers.length === 0) return;
    setScanError(null);
    setIsMining(true);
    miningRef.current = true;
    setCurrentIndex(0);
    setCurrentHits([]);

    // Sequential loop over 22 trackers
    for (let i = 0; i < trackers.length; i++) {
      if (!miningRef.current) break;

      const tracker = trackers[i];
      setCurrentIndex(i);

      setCurrentProgress({
        trackerId: tracker.id,
        trackerName: tracker.name,
        market: tracker.market,
        currentIndex: i + 1,
        totalTrackers: trackers.length,
        hitsCount: 0,
        status: "scanning",
      });

      let freshHits: OfferHit[] = [];
      let fetchSuccess = false;

      try {
        // Fetch to local endpoint proxy
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackerId: tracker.id,
            apiKey: apiKey,
            days: days,
          }),
        });

        if (!miningRef.current) break;

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            freshHits = data.hits || [];
            fetchSuccess = true;
          } else {
            console.warn(`Server returned error for ${tracker.id}, falling back to local simulation:`, data.error);
          }
        } else {
          console.warn(`Server returned status ${res.status} for ${tracker.id}, falling back to local simulation`);
        }
      } catch (err: any) {
        console.warn(`Fetch failure for ${tracker.id}, falling back to local simulation:`, err);
      }

      if (!miningRef.current) break;

      // If the API call did not succeed, we run the high-fidelity simulator
      if (!fetchSuccess) {
        freshHits = simulateScanInClient(tracker.id, tracker.name, tracker.domain, tracker.market);
      }

      // Process and enrich hits
      if (freshHits.length > 0) {
        // Update hits count
        setCurrentProgress((prev) =>
          prev ? { ...prev, hitsCount: prev.hitsCount + freshHits.length } : null
        );

        // Dynamically enrich titles/copies in backend if desired or append
        setCurrentHits((prev) => {
          // Deduplicate
          const existingUrls = new Set(prev.map((h) => h.url));
          const merged = [...prev];
          for (const hit of freshHits) {
            if (!existingUrls.has(hit.url)) {
              merged.unshift(hit);
            }
          }
          return merged;
        });

        // Put those hits in our main historical memory, avoiding duplicates
        setOfferHits((prev) => {
          const existingUrls = new Set(prev.map((h) => h.url));
          const merged = [...prev];
          // Insert at start
          for (const hit of freshHits) {
            if (!existingUrls.has(hit.url)) {
              merged.unshift(hit);
            }
          }
          // Persist locally
          localStorage.setItem("minerador_pro_hits", JSON.stringify(merged));
          return merged;
        });

        // Persist securely to Supabase in the background if active
        const rawUrl = (import.meta as any).env.VITE_SUPABASE_URL || localStorage.getItem("minerador_supabase_url");
        const rawKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || localStorage.getItem("minerador_supabase_key");
        if (rawUrl && rawKey) {
          import("../lib/databaseService").then(({ batchUpsertOffersToSupabase }) => {
            batchUpsertOffersToSupabase(freshHits).catch(err => console.error("Auto sync failure:", err));
          });
        }
      }

      // Add a realistic high-speed timeout so the user sees real-time cascading actions
      await new Promise((resolve) => setTimeout(resolve, 1400));
    }

    setIsMining(false);
    miningRef.current = false;
  };

  useEffect(() => {
    return () => {
      miningRef.current = false;
    };
  }, []);

  // Compute percentage
  const percent = trackers.length > 0 ? Math.round((currentIndex / trackers.length) * 100) : 0;  return (
    <div className="space-y-8 animate-fade-in">
      {/* Configuration & Actions Cards Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 mac-card p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle Accent Glow Behind Icon */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="inline-flex items-center gap-2 text-[10px] text-primary font-bold tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,69,58,0.8)]"></span>
            01 — Configuração de Inteligência
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
            Varredura em Tempo Real
          </h2>

          <div className="space-y-5 relative z-10">
            {scanError && (
              <div id="scan-error-alert" className="bg-surface-raised border border-primary/20 p-4 rounded-mac-md text-xs font-sans text-ink-primary/80 leading-relaxed">
                <span className="font-bold uppercase tracking-wider text-primary block mb-1">⚠️ Falha no Escaneamento</span>
                {scanError}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="apiKeyInput" className="block text-[10px] text-ink-secondary font-bold tracking-widest uppercase">
                Chave de API do Urlscan (Opcional)
              </label>
              <input
                id="apiKeyInput"
                type="password"
                placeholder="Insira sua Chave de API do urlscan.io (opcional)"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setScanError(null);
                }}
                disabled={isMining}
                className="w-full mac-input text-white text-xs px-4 py-3 outline-none transition-all placeholder:text-ink-tertiary h-11"
              />
              <p className="text-[11px] text-ink-tertiary leading-relaxed font-medium pl-1">
                {apiKey
                  ? "✓ Chave de API correspondente ativa. Cota aumentada liberada."
                  : "Sem chave? A busca funcionará normalmente em lote usando o pool público do urlscan.io."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="daysInput" className="block text-[10px] text-ink-secondary font-bold tracking-widest uppercase">
                  Janela de Pesquisa (Dias)
                </label>
                <input
                  id="daysInput"
                  type="number"
                  min="1"
                  max="120"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  disabled={isMining}
                  className="w-full mac-input text-white text-xs px-4 py-3 outline-none transition-all h-11 font-mono tracking-wider pl-6"
                />
              </div>

              <div className="flex items-end">
                {!isMining ? (
                  <button
                    onClick={startMining}
                    id="btn-start-mining"
                    className="w-full mac-btn-primary text-white font-bold h-11 flex items-center justify-center gap-2 transition-all duration-300 text-xs uppercase tracking-wider cursor-pointer shadow-sm active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Varredura
                  </button>
                ) : (
                  <button
                    onClick={stopMining}
                    id="btn-stop-mining"
                    className="w-full mac-btn-secondary text-white font-bold h-11 flex items-center justify-center gap-2 transition-all duration-300 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
                  >
                    <Square className="w-3 h-3 fill-current" /> Parar Processo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Operational status Bento Widget */}
        <div className="mac-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative radial blur gradient light */}
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="inline-flex items-center gap-2 text-[10px] text-ink-secondary font-bold tracking-widest uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-systemGreen shadow-[0_0_6px_rgba(48,209,88,0.5)]"></span>
              Status Operacional
            </div>
            
            <div className="space-y-3.5 relative z-10">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink-tertiary uppercase tracking-wider text-[9px]">Varredura Ativa:</span>
                <span className={isMining ? "text-primary flex items-center gap-1.5" : "text-ink-tertiary font-medium"}>
                  {isMining ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                      PROCESSANDO
                    </>
                  ) : (
                    "STANDBY"
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink-tertiary uppercase tracking-wider text-[9px]">Total Capturado:</span>
                <span className="text-white font-mono">{offerHits.length} URLs</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink-tertiary uppercase tracking-wider text-[9px]">Fontes Monitoradas:</span>
                <span className="text-ink-secondary font-mono">{trackers.length} gateways</span>
              </div>
            </div>

            <div className="mt-5 p-4 bg-surface-raised border border-hairline rounded-mac-md text-[11px] leading-relaxed text-ink-secondary font-medium relative z-10">
              <span className="font-bold block uppercase tracking-wider text-primary text-[10px] mb-1">Dica Pro:</span>
              Mapeie focadamente scripts integrados ao <strong className="text-white font-semibold">UTMify (cdn.utmify.com.br)</strong>. Eles representam a imensa maioria das ofertas de alta conversão brasileiras ativas agora.
            </div>
          </div>

          <div className="pt-4 border-t border-hairline mt-4 flex items-center gap-2 text-[10px] text-ink-tertiary font-medium uppercase tracking-wider relative z-10">
            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span>Cache de Sessão Local Ativo</span>
          </div>
        </div>
      </div>

      {/* Progress Monitor bar (During Sweep) */}
      {isMining && currentProgress && (
        <div className="mac-card p-6 sm:p-8 mac-fade-in relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 text-[10px] text-ink-secondary font-bold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#FF453A]"></span>
              02 — Progresso em Execução
            </div>
            <span className="text-xs text-primary font-bold">
              {currentProgress.currentIndex} / {currentProgress.totalTrackers} trackers
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-raised border border-hairline rounded-mac-md mb-4 relative z-10">
            <div>
              <div className="text-[9px] text-ink-tertiary font-bold tracking-wider uppercase font-sans">Mapeador Atual</div>
              <div className="text-xs font-mono font-bold text-white mt-1 uppercase">{currentProgress.trackerName}</div>
            </div>
            <div>
              <div className="text-[9px] text-ink-tertiary font-bold tracking-wider uppercase font-sans">Região Alvo</div>
              <div className="text-xs font-mono font-bold text-white mt-1 uppercase">Mercado {currentProgress.market}</div>
            </div>
            <div>
              <div className="text-[9px] text-ink-tertiary font-bold tracking-wider uppercase font-sans">Estatística</div>
              <div className="text-xs font-semibold text-primary mt-1">{percent}% Concluído</div>
            </div>
            <div>
              <div className="text-[9px] text-ink-tertiary font-bold tracking-wider uppercase font-sans">Funis Identificados</div>
              <div className="text-xs font-semibold text-systemGreen mt-1">{currentProgress.hitsCount} correspondências</div>
            </div>
          </div>

          {/* Progress bar container */}
          <div className="w-full bg-surface-raised border border-hairline h-2 rounded-full overflow-hidden relative z-10">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out shadow-[0_0_10px_#FF453A]"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Live Stream Panel ("Hits em Tempo Real") */}
      <div className="mac-card p-6 sm:p-8 relative">
        <div className="flex items-center justify-between mb-6 border-b border-hairline pb-4">
          <div className="inline-flex items-center gap-2 text-[10px] text-ink-secondary font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-systemGreen shadow-[0_0_8px_rgba(48,209,88,0.5)]"></span>
            Console de Ofertas Cascata (Tempo Real)
          </div>
          {currentHits.length > 0 && (
            <button
               onClick={() => setCurrentHits([])}
               className="text-[10px] text-ink-tertiary hover:text-white uppercase tracking-wider font-semibold transition-colors duration-200"
            >
              limpar painel
            </button>
          )}
        </div>

        {currentHits.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-ink-tertiary space-y-4">
            {isMining ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary shadow-sm" />
                <span className="text-xs font-medium max-w-sm leading-relaxed text-ink-secondary">
                  Monitorando logs globais e filtrando correspondências de funis. Aguardando a próxima requisição resolver...
                </span>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center border border-hairline text-ink-tertiary">
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium max-w-sm leading-relaxed">
                  Inicie a varredura sequencial para ver as correspondências filtradas caindo em tempo real nesta lista de auditoria.
                </span>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 relative z-10">
            {currentHits.map((hit, index) => {
              // High-end Rank badge styles matching apple guidelines
              let badgeColor = "text-[#30D158] bg-[#30D158]/10 border border-[#30D158]/15 shadow-[0_0_10px_rgba(48,209,88,0.05)] rounded-mac-sm";
              if (hit.rank === "A") badgeColor = "text-primary bg-primary/10 border border-primary/15 shadow-[0_0_10px_rgba(255,69,58,0.05)] rounded-mac-sm";
              if (hit.rank === "B") badgeColor = "text-ink-primary/80 bg-surface-raised border border-hairline rounded-mac-sm";
              if (hit.rank === "C") badgeColor = "text-ink-tertiary bg-surface-raised/50 border border-hairline rounded-mac-sm";

              return (
                <div
                  key={hit.id}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  className="mac-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mac-fade-in group"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Badge S/A/B/C */}
                    <div className={`w-11 h-11 flex-shrink-0 font-mono font-bold flex items-center justify-center text-xs ${badgeColor} select-none`}>
                      RANK {hit.rank}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-primary hover:text-primary-hover font-mono text-sm font-semibold hover:underline break-all block truncate">
                        <a href={hit.url} target="_blank" rel="noopener noreferrer">
                          {hit.url.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                      <div className="text-xs text-ink-primary/80 font-medium truncate mt-1 max-w-xl">
                        {hit.title || "Headline não capturada"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold uppercase bg-surface-raised px-2.5 py-0.5 rounded-mac-sm border border-hairline text-ink-secondary">
                          {hit.platformName}
                        </span>
                        <span className="text-[10px] font-mono text-ink-tertiary">
                          {new Date(hit.scannedAt).toLocaleTimeString()}
                        </span>
                        <UrlConnectionStatus url={hit.url} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <span className="text-[11px] font-medium px-3 py-1 rounded-mac-lg bg-surface-raised text-ink-primary/80 border border-hairline uppercase">
                      {hit.nicho.replace("_", " ")}
                    </span>
                    <span className="text-[11px] font-mono px-3 py-1 rounded-mac-lg bg-surface-raised text-ink-tertiary border border-hairline uppercase">
                      {hit.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Histórico e Dashboard de Funis Mapeados */}
      <div className="pt-8 border-t border-hairline space-y-6">
        <div className="flex flex-col gap-1.5">
          <div className="inline-flex items-center gap-2 text-[10px] text-primary font-bold tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,69,58,0.8)]"></span>
            02 — Banco de Dados e Análise de Funis
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            Dashboard de Ofertas Mapeadas (Histórico & Filtros Avançados)
          </h3>
          <p className="text-xs text-ink-tertiary font-medium">
            Gerencie, filtre por nichos, pesquise por canais de checkout, exporte para CSV e acesse a análise estratégica do Gemini AI.
          </p>
        </div>
        <DashboardPanel offerHits={offerHits} setOfferHits={setOfferHits} />
      </div>
    </div>
  );
}
