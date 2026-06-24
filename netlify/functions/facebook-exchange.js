exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const params = new URLSearchParams(event.queryStringParameters || {});
  const code = params.get("code") || event.queryStringParameters?.code;

  if (!code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "code obrigatório" })
    };
  }

  const FB_APP_ID = process.env.FACEBOOK_APP_ID || "1297847892562716";
  const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
  const FB_REDIRECT_URI = params.get("redirect_uri") ||
    process.env.FACEBOOK_REDIRECT_URI ||
    "https://vuskoperation.netlify.app/auth/facebook/callback";

  try {
    // Passo 1: code → token curto
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${FB_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message || "Erro token curto");
    }

    // Passo 2: token curto → token longo (60 dias)
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${FB_APP_ID}` +
      `&client_secret=${FB_APP_SECRET}` +
      `&fb_exchange_token=${tokenData.access_token}`;

    const longTokenRes = await fetch(longTokenUrl);
    const longTokenData = await longTokenRes.json();

    if (longTokenData.error) {
      throw new Error(longTokenData.error.message || "Erro token longo");
    }

    const longToken = longTokenData.access_token;
    const expiresAt = Date.now() + ((longTokenData.expires_in || 5184000) * 1000);

    // Passo 3: dados do usuário
    const userRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longToken}`
    );
    const userData = await userRes.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        accessToken: longToken,
        expiresAt,
        userId: userData.id || "",
        userName: userData.name || ""
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
