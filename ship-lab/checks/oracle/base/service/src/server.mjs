// The HTTP service. Plain node:http, no framework.
//   POST /api/chat   { "query": "..." }  ->  { answer, citations, meta }
//   GET  /healthz                          ->  200 { ok, checks }
// The server listens on HOST (127.0.0.1 unless you set it). A container has to listen on every address, so its Dockerfile sets HOST=0.0.0.0.
// startService() is what the tests, the checks and `npm run serve` all use, so keep its shape: startService({ port, config, model, logger }).
import http from 'node:http';
import { config as defaultConfig } from './config.mjs';
import { createLogger } from './log.mjs';
import { createModel } from './model.mjs';
import { loadKb, retrieve } from './retrieve.mjs';
import { answer } from './answer.mjs';
import { checkHealth } from './health.mjs';

const readBody = req => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', c => { data += c; if (data.length > 1e6) reject(new Error('body too large')); });
  req.on('end', () => resolve(data));
  req.on('error', reject);
});
const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
};

export async function startService({ port = 0, config = defaultConfig, model = createModel(config), logger = createLogger(config) } = {}) {
  const kb = loadKb(config.kbDir);
  const deps = { config, logger, model, kb, retrieve: (q, k) => retrieve(kb, q, k) };
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/healthz') {
        const h = await checkHealth(deps);
        return send(res, h.ok ? 200 : 503, h);
      }
      if (req.method === 'POST' && req.url === '/api/chat') {
        let body;
        try { body = JSON.parse((await readBody(req)) || '{}'); } catch { return send(res, 400, { error: 'bad_json' }); }
        if (typeof body.query !== 'string' || !body.query.trim()) return send(res, 400, { error: 'query_required' });
        return send(res, 200, await answer(body.query, deps));
      }
      return send(res, 404, { error: 'not_found' });
    } catch (e) {
      // A handler can fail on purpose with a status: throw Object.assign(new Error('...'), { status: 504, code: 'model_timeout' })
      logger.error('server.error', { message: e.message, code: e.code });
      return send(res, e.status ?? 500, { error: e.code ?? 'server_error' });
    }
  });
  await new Promise(resolve => server.listen(port, process.env.HOST ?? '127.0.0.1', resolve));
  const actual = server.address().port;
  return { url: `http://127.0.0.1:${actual}`, port: actual, deps, close: () => new Promise(resolve => server.close(resolve)) };
}
