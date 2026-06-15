import { useEffect, useState } from "react";

export function FacebookCallbackHandler() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (error || !code) {
      const msg = errorDescription || error || "Autorização cancelada pelo usuário";
      setErrorMsg(msg);
      setStatus("error");
      if (window.opener) {
        window.opener.postMessage(
          { type: "FACEBOOK_AUTH_ERROR", error: msg },
          window.location.origin
        );
        setTimeout(() => window.close(), 1500);
      }
      return;
    }

    // Trocar o code pelo token via backend
    fetch(`/.netlify/functions/facebook-exchange?code=${encodeURIComponent(code)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || "Erro ao trocar token");

        setStatus("success");

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "FACEBOOK_AUTH_SUCCESS",
              accessToken: data.accessToken,
              expiresAt: data.expiresAt,
              userId: data.userId,
              userName: data.userName
            },
            window.location.origin
          );
          setTimeout(() => window.close(), 1000);
        }
      })
      .catch(err => {
        setErrorMsg(err.message);
        setStatus("error");
        if (window.opener) {
          window.opener.postMessage(
            { type: "FACEBOOK_AUTH_ERROR", error: err.message },
            window.location.origin
          );
          setTimeout(() => window.close(), 2000);
        }
      });
  }, []);

  return (
    <div style={{
      background: "#060607",
      color: "white",
      fontFamily: "sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      margin: 0,
      flexDirection: "column",
      gap: "16px"
    }}>
      {status === "loading" && (
        <>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#1877F2", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "20px", fontWeight: "900", color: "white"
          }}>f</div>
          <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>
            Conectando ao Vusk Operation...
          </p>
          <div style={{
            width: "24px", height: "24px",
            border: "2px solid #333",
            borderTop: "2px solid #1877F2",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#10B981", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "20px", color: "white"
          }}>✓</div>
          <p style={{ fontSize: "13px", color: "#10B981", margin: 0 }}>
            Conectado! Fechando...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: "#FF453A", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: "20px", color: "white"
          }}>✗</div>
          <p style={{ fontSize: "13px", color: "#FF453A", margin: 0, textAlign: "center", maxWidth: "300px" }}>
            {errorMsg}
          </p>
          <p style={{ fontSize: "11px", color: "#444", margin: 0 }}>
            Fechando automaticamente...
          </p>
        </>
      )}
    </div>
  );
}
