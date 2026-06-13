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

  try {
    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
      `fields=spend,reach,impressions,inline_link_clicks,` +
      `inline_link_click_ctr,cpm,cpc,actions,purchase_roas` +
      `&date_preset=${datePreset || "last_7d"}` +
      `&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: data.data?.[0] || null })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
