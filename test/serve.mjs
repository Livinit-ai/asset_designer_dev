// Local dev/test server: static files from repo root + /api/* proxied to the
// production Vercel deployment (serverless functions don't run locally).
// Usage: node test/serve.mjs [port]
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2]) || 8123;
const ROOT = new URL('..', import.meta.url).pathname;
const UPSTREAM = 'https://asset-designer-dev.vercel.app';
// The Vercel s3proxy function just streams this public bucket (api/s3proxy.ts
// prepends 'fabric_assets/'). Falling back to it directly keeps asset-dependent
// tests running when the Vercel deployment is paused (402).
const S3_DIRECT = 'https://livinit-storage-prod.s3.us-east-2.amazonaws.com/fabric_assets/';
const CACHE = join(ROOT, 'test', '.asset-cache');
await mkdir(CACHE, { recursive: true });
const cachePath = (u) => join(CACHE, createHash('sha1').update(u).digest('hex'));

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname.startsWith('/api/')) {
      // GET asset requests are disk-cached so each asset hits upstream at most
      // once across all test runs (and tests survive upstream outages).
      const cacheable = req.method === 'GET' && url.pathname === '/api/s3proxy';
      const cp = cachePath(req.url);
      if (cacheable) {
        try {
          const meta = JSON.parse(await readFile(cp + '.json', 'utf8'));
          const body = await readFile(cp);
          res.writeHead(200, { 'content-type': meta.type });
          return res.end(body);
        } catch { /* cache miss */ }
      }
      let upstream = await fetch(UPSTREAM + req.url, {
        method: req.method,
        headers: { 'content-type': req.headers['content-type'] || '' },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : req,
        duplex: 'half',
      });
      if (cacheable && !upstream.ok && url.searchParams.get('key')) {
        upstream = await fetch(S3_DIRECT + url.searchParams.get('key'));
      }
      const type = upstream.headers.get('content-type') || 'application/octet-stream';
      if (cacheable && upstream.ok) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        await writeFile(cp, buf);
        await writeFile(cp + '.json', JSON.stringify({ type, url: req.url }));
        res.writeHead(200, { 'content-type': type });
        return res.end(buf);
      }
      res.writeHead(upstream.status, { 'content-type': type });
      if (upstream.body) {
        for await (const chunk of upstream.body) res.write(chunk);
      }
      return res.end();
    }
    const path = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!path.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500);
    res.end(String(e.message || e));
  }
}).listen(PORT, () => console.log(`serving ${ROOT} on :${PORT}, /api/* -> ${UPSTREAM}`));
