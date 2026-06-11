exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  try {
    const tickers = (event.queryStringParameters?.tickers || '').split(',').filter(Boolean);
    const cryptoIds = (event.queryStringParameters?.crypto || '').split(',').filter(Boolean);
    const EODHD_KEY = process.env.EODHD_API_KEY;
    const CG_KEY = process.env.COINGECKO_API_KEY;
    const result = { quotes: {}, fx: {}, crypto: {}, ts: Date.now() };

    // FX: USD->AUD
    if (EODHD_KEY) {
      try {
        const r = await fetch('https://eodhd.com/api/real-time/USDAUD.FOREX?api_token=' + EODHD_KEY + '&fmt=json');
        if (r.ok) { const d = await r.json(); result.fx.USDAUD = parseFloat(d.close) || parseFloat(d.adjusted_close) || 1.54; }
      } catch(e) { result.fx.USDAUD = 1.54; }
    } else { result.fx.USDAUD = 1.54; }

    // Equities via EODHD (ASX + International)
    if (tickers.length > 0 && EODHD_KEY) {
      try {
        const url = 'https://eodhd.com/api/real-time/' + tickers[0] + '?api_token=' + EODHD_KEY + '&fmt=json&s=' + tickers.join(',');
        const r = await fetch(url);
        if (r.ok) {
          const raw = await r.json();
          const arr = Array.isArray(raw) ? raw : [raw];
          for (const q of arr) {
            result.quotes[q.code] = { price: parseFloat(q.close) || parseFloat(q.adjusted_close) || 0, change_pct: parseFloat(q.change_p) || 0 };
          }
        }
      } catch(e) {}
    }

    // Crypto via CoinGecko (priced directly in AUD)
    if (cryptoIds.length > 0) {
      try {
        const cgHeaders = CG_KEY ? { 'x-cg-demo-api-key': CG_KEY } : {};
        const cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=' + cryptoIds.join(',') + '&vs_currencies=aud&include_24hr_change=true';
        const r = await fetch(cgUrl, { headers: cgHeaders });
        if (r.ok) { const d = await r.json(); for (const [id, v] of Object.entries(d)) { result.crypto[id] = { price_aud: v.aud || 0, change_24h: v.aud_24h_change || 0 }; } }
      } catch(e) {}
    }

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch(err) { return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }; }
};
