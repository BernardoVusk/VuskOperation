import { useState, useEffect, useCallback } from "react";
import { useOperator } from "../contexts/OperatorContext";

const FB_APP_ID = "1297847892562716";

export interface FacebookAuthState {
  accessToken: string | null;
  userName: string | null;
  userId: string | null;
  expiresAt: number | null;
  isConnected: boolean;
  isExpired: boolean;
  daysUntilExpiry: number | null;
}

export function useFacebookAuth() {
  const operator = useOperator();
  const STORAGE_KEY = `vusk_fb_auth_${operator.toLowerCase()}`;
  const CREDENTIALS_KEY = `vusk_fb_credentials_${operator.toLowerCase()}`;

  const loadInitialState = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return emptyState();
      const parsed = JSON.parse(stored);
      const isExpired = parsed.expiresAt ? Date.now() > parsed.expiresAt : false;
      const daysUntilExpiry = parsed.expiresAt
        ? Math.floor((parsed.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      return {
        ...parsed,
        isConnected: !!parsed.accessToken && !isExpired,
        isExpired,
        daysUntilExpiry
      };
    } catch {
      return emptyState();
    }
  }, [STORAGE_KEY]);

  const [authState, setAuthState] = useState<FacebookAuthState>(loadInitialState);

  // Sync state if operator changes
  useEffect(() => {
    setAuthState(loadInitialState());
  }, [operator, loadInitialState]);

  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(() => {
    setIsConnecting(true);
    setError(null);

    // Escopos necessários para Marketing API
    const scopes = [
      "ads_read",
      "ads_management",
      "business_management",
      "public_profile"
    ].join(",");

    const redirectUri = `${window.location.origin}/auth/facebook/callback`;

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${FB_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code` +
      `&state=${Date.now()}`;

    // Abrir popup centralizado
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "facebook_oauth",
      `width=${width},height=${height},left=${left},top=${top},` +
      `scrollbars=yes,resizable=yes,toolbar=no,menubar=no`
    );

    if (!popup) {
      setError("Popup bloqueado pelo navegador. Permita popups para este site.");
      setIsConnecting(false);
      return;
    }

    // Listener para receber o token via postMessage
    const handleMessage = (event: MessageEvent) => {
      // Aceitar apenas mensagens da própria origem
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === "FACEBOOK_AUTH_SUCCESS") {
        const { accessToken, expiresAt, userId, userName } = event.data;
        const newState: FacebookAuthState = {
          accessToken,
          expiresAt,
          userId,
          userName,
          isConnected: true,
          isExpired: false,
          daysUntilExpiry: Math.floor(
            (expiresAt - Date.now()) / (1000 * 60 * 60 * 24)
          )
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          accessToken, expiresAt, userId, userName
        }));
        
        // Also save to standard credentials key for backwards compatibility down the line if we want
        const savedCreds = localStorage.getItem(CREDENTIALS_KEY);
        let adAccountId = "";
        if (savedCreds) {
          try {
            const parsed = JSON.parse(savedCreds);
            adAccountId = parsed.adAccountId || "";
          } catch {}
        }
        localStorage.setItem(CREDENTIALS_KEY, JSON.stringify({
          accessToken,
          adAccountId,
          datePreset: "last_7d"
        }));

        setAuthState(newState);
        setIsConnecting(false);
        window.removeEventListener("message", handleMessage);
        popup.close();
      }

      if (event.data?.type === "FACEBOOK_AUTH_ERROR") {
        setError(event.data.error || "Erro na autenticação do Facebook");
        setIsConnecting(false);
        window.removeEventListener("message", handleMessage);
      }
    };

    window.addEventListener("message", handleMessage);

    // Detectar se o popup foi fechado manualmente
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        setIsConnecting(false);
      }
    }, 500);

  }, [isConnecting, STORAGE_KEY, CREDENTIALS_KEY]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CREDENTIALS_KEY);
    setAuthState(emptyState());
    setError(null);
  }, [STORAGE_KEY, CREDENTIALS_KEY]);

  return { authState, isConnecting, error, login, logout };
}

function emptyState(): FacebookAuthState {
  return {
    accessToken: null,
    userName: null,
    userId: null,
    expiresAt: null,
    isConnected: false,
    isExpired: false,
    daysUntilExpiry: null
  };
}
