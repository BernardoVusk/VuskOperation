import React, { useState, useEffect, useRef } from "react";
import { Lock, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LandingScreenProps {
  onAuthenticated: (operatorName: string) => void;
}

export function LandingScreen({ onAuthenticated }: LandingScreenProps) {
  const [screenState, setScreenState] = useState<"presentation" | "password">("presentation");
  const [passwordValue, setPasswordValue] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("Senha incorreta. Tente novamente.");
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically upon entering password screen
  useEffect(() => {
    if (screenState === "password") {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 200);
    }
  }, [screenState]);

  const handleStartLogin = () => {
    setScreenState("password");
  };

  const handleBackToPresentation = () => {
    setScreenState("presentation");
    setShowError(false);
    setPasswordValue("");
    setSelectedOperator(null);
  };

  const verifyPassword = () => {
    if (!selectedOperator) {
      setErrorMsg("Selecione seu nome para continuar.");
      setShowError(true);
      return;
    }

    const OPERATORS: Record<string, string> = {
      "Bernardo": "adminvusk",
      "Gabriel": "vusk10"
    };

    const expectedPassword = OPERATORS[selectedOperator];

    if (passwordValue.trim() === expectedPassword) {
      onAuthenticated(selectedOperator);
    } else {
      setIsShaking(true);
      setErrorMsg("Senha incorreta. Tente novamente.");
      setShowError(true);
      setPasswordValue("");
      setTimeout(() => {
        setIsShaking(false);
        passwordInputRef.current?.focus();
      }, 500);
    }
  };

  const handleVerifySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedOperator) {
      setErrorMsg("Selecione seu nome para continuar.");
      setShowError(true);
      return;
    }
    if (isVerifying || !passwordValue.trim()) return;

    setIsVerifying(true);
    setShowError(false);

    // Simulate luxury 600ms check delay for realistic security feedback
    setTimeout(() => {
      setIsVerifying(false);
      verifyPassword();
    }, 600);
  };

  return (
    <div className="w-screen h-screen bg-[#060607] text-white flex flex-col items-center justify-center relative overflow-hidden select-none font-sans">
      
      {/* SVG noise texture grid overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none z-0"></div>
      
      {/* Subtle glowing radial background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full filter blur-[100px] pointer-events-none z-0"></div>

      <AnimatePresence mode="wait">
        {screenState === "presentation" ? (
          <motion.div
            key="presentation"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center p-6 text-center space-y-8 z-10 max-w-sm"
          >
            {/* Custom high-end operator hexagonal logo tag */}
            <div className="relative group flex items-center justify-center">
              <svg 
                viewBox="0 0 100 100" 
                className="w-16 h-16 text-primary filter drop-shadow-[0_0_15px_rgba(255,42,42,0.4)] animate-pulse"
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4"
              >
                {/* Hexagon shape path */}
                <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" className="stroke-primary" />
                {/* Inside Lightning bolt */}
                <path 
                  d="M52 25 L32 50 L48 50 L42 75 L68 45 L50 45 Z" 
                  fill="currentColor" 
                  className="text-primary animate-pulse"
                />
              </svg>
            </div>

            {/* Core Brand title labels */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black tracking-[0.25em] text-white uppercase font-sans">
                VUSK
              </h1>
              <p className="text-xs sm:text-sm font-mono tracking-[0.4em] text-zinc-400 uppercase font-medium">
                OPERATION
              </p>
            </div>

            {/* Subtle Divider custom bar */}
            <div className="w-16 h-0.5 bg-primary/40 mx-auto rounded-full"></div>

            {/* Slogan details text */}
            <p className="text-xs text-zinc-500 text-center max-w-[260px] leading-relaxed font-mono font-medium">
              Central de operações para times de alto desempenho em marketing digital e inteligência de funis.
            </p>

            {/* High interactive action triggers */}
            <div className="w-full pt-4">
              <button
                onClick={handleStartLogin}
                className="w-full min-h-[48px] py-4 px-8 bg-primary hover:bg-red-600 text-white font-bold tracking-widest text-xs rounded-xl uppercase shadow-[0_0_20px_rgba(255,42,42,0.4)] hover:shadow-[0_0_35px_rgba(255,42,42,0.6)] transition-all duration-300 transform hover:scale-[1.02] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span>ACESSAR SISTEMA</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="password"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center p-6 text-center z-10 w-full max-w-sm"
          >
            {/* Custom lock container screen header */}
            <div className="mb-6 w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center relative shadow-[0_0_15px_rgba(255,42,42,0.2)]">
              <Lock className="w-6 h-6 text-primary" />
            </div>

            {/* Headline lock warnings */}
            <div className="space-y-1.5 mb-6 text-center">
              <h2 className="text-xs font-mono font-bold tracking-[0.2em] text-white uppercase">
                ACESSO RESTRITO
              </h2>
              <p className="text-[11px] text-zinc-500 font-sans">
                Por favor, insira o código de segurança habilitado.
              </p>
            </div>

            {/* Seletor de Operador */}
            <div className="w-64 mb-4 mx-auto">
              <label className="text-[10px] font-bold uppercase text-zinc-500 
                tracking-wider font-mono block mb-2 text-center">
                Selecione o Operador
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Bernardo", "Gabriel"].map((name) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => {
                      setSelectedOperator(name);
                      setShowError(false);
                      setTimeout(() => {
                        passwordInputRef.current?.focus();
                      }, 100);
                    }}
                    className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider
                      font-mono transition-all border cursor-pointer ${
                      selectedOperator === name
                        ? "bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(255,42,42,0.2)]"
                        : "bg-[#141416] border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerifySubmit} className="w-full space-y-4">
              {selectedOperator && (
                <p className="text-[10px] text-zinc-500 font-mono text-center animate-fade-in mb-2">
                  Bem-vindo de volta, <span className="text-white font-bold">{selectedOperator}</span>
                </p>
              )}

              <div className={`relative ${isShaking ? "shake" : ""}`}>
                <input
                  ref={passwordInputRef}
                  type="password"
                  value={passwordValue}
                  onChange={(e) => {
                    setPasswordValue(e.target.value);
                    if (showError) setShowError(false);
                  }}
                  disabled={isVerifying || !selectedOperator}
                  placeholder="••••••••"
                  className={`w-full bg-[#111113] border text-center tracking-widest text-white px-4 py-3.5 focus:outline-none transition-all duration-200 uppercase font-mono rounded-xl max-w-[240px] mx-auto block ${
                    showError 
                      ? "border-red-500/50 bg-red-950/10 focus:border-red-500" 
                      : "border-white/5 focus:border-primary/50"
                  } ${!selectedOperator ? "opacity-40 cursor-not-allowed" : ""}`}
                  style={{ fontSize: "16px" }} // Prevent iOS Auto Zoom
                  required
                />
              </div>

              {/* Async Verification status alerts */}
              {showError && (
                <p className="text-[10px] text-red-500 font-mono font-semibold uppercase tracking-wide animate-fade-in">
                  {errorMsg}
                </p>
              )}

              {/* Login Submit actions */}
              <button
                type="submit"
                disabled={isVerifying || !passwordValue.trim() || !selectedOperator}
                className="w-full min-h-[44px] max-w-[240px] bg-primary hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-bold tracking-widest uppercase rounded-xl shadow-[0_0_15px_rgba(255,42,42,0.3)] transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <span>ENTRAR</span>
                )}
              </button>

              {/* Navigation Back Home triggers */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleBackToPresentation}
                  className="inline-flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-400 font-mono uppercase tracking-widest font-bold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Voltar</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discretely centered bottom footer markings */}
      <footer className="absolute bottom-6 text-[10px] text-zinc-700 font-mono select-none pointer-events-none">
        © {new Date().getFullYear()} VUSK OPERATION
      </footer>
    </div>
  );
}
