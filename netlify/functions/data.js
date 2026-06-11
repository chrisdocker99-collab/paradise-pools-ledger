const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

const sb = (path, opts = {}) =>
  fetch(SB_URL + '/rest/v1/' + path, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: 'Bearer ' + SB_KEY,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...opts.headers
    }
  });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  const parts = event.path.replace('/.netlify/functions/data', '').split('/').filter(Boolean);
  const res = parts[0] || event.queryStringParameters?.resource;
  const rid = parts[1] || null;
  if (!['holdings', 'watchlist', 'app_settings'].includes(res))
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown resource: ' + res }) };
  try {
    if (event.httpMethod === 'GET') {
      const path = rid ? res + '?id=eq.' + rid : res + '?order=created_at.asc';
      const r = await sb(path);
      return { statusCode: 200, headers: CORS, body: await r.text() };
    }
    if (event.httpMethod === 'POST') {
      const r = await sb(res, { method: 'POST', body: event.body });
      return { statusCode: r.status < 300 ? 201 : r.status, headers: CORS, body: await r.text() };
    }
    if (event.httpMethod === 'PATCH') {
      if (!rid) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id required' }) };
      const r = await sb(res + '?id=eq.' + rid, { method: 'PATCH', body: event.body });
      return { statusCode: r.status < 300 ? 200 : r.status, headers: CORS, body: await r.text() };
    }
    if (event.httpMethod === 'DELETE') {
      if (!rid) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id required' }) };
      await sb(res + '?id=eq.' + rid, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return { statusCode: 204, headers: CORS, body: '' };
    }
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
