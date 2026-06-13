exports.handler = async function(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const accessToken = event.queryStringParameters?.accessToken;

  if (!accessToken) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: "accessToken obrigatório" })
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/me/adaccounts?` +
      `fields=id,name,account_status,currency,timezone_name` +
      `&access_token=${accessToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, accounts: data.data || [] })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
