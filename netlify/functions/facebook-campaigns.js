exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { accessToken, adAccountId, datePreset } = event.queryStringParameters || {};

  if (!accessToken || !adAccountId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "accessToken e adAccountId obrigatórios" })
    };
  }

  const preset = datePreset || "last_7d";

  try {
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?` +
      `fields=id,name,status,daily_budget,insights.date_preset(${preset}){spend,reach,impressions,` +
      `inline_link_clicks,inline_link_click_ctr,cpm,cpc,actions,purchase_roas}` +
      `&access_token=${accessToken}` +
      `&limit=50`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, campaigns: data.data || [] })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
