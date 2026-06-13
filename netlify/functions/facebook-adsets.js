exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { accessToken, campaignId, datePreset } = event.queryStringParameters || {};

  if (!accessToken || !campaignId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "accessToken e campaignId obrigatórios" })
    };
  }

  const preset = datePreset || "last_7d";

  try {
    const url = `https://graph.facebook.com/v19.0/${campaignId}/adsets?` +
      `fields=id,name,status,daily_budget,insights.date_preset(${preset}){spend,reach,ctr,cpc}` +
      `&access_token=${accessToken}` +
      `&limit=50`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, adsets: data.data || [] })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
