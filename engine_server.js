import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.md': 'text/markdown',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

// Two caching lanes. Content that is versioned by its own filename and never edited
// in place — the three.js build, the self-hosted font subsets — is safe to pin for a
// year, so a warm boot never touches the network for it. Everything else (source
// modules, HTML, and the texture WebPs, which DO get rewritten whenever
// assets/export_textures.html is re-run) gets `no-cache`: the browser still stores
// the body, but revalidates first and gets a bodiless 304 when nothing changed. That
// keeps the multi-megabyte re-download off every boot without ever risking a stale
// asset mid-export-iteration, which plain `immutable` would.
const IMMUTABLE_ROUTES = /^\/(r160\.js|assets\/fonts\/)/;

const cacheControlFor = (route) =>
    IMMUTABLE_ROUTES.test(route) ? 'public, max-age=31536000, immutable' : 'no-cache';

// Weak validator built from the two things a local file edit always changes. Cheap
// to compute (one stat, no hashing) and enough for revalidation to be correct here.
const etagFor = (stats) => `W/"${stats.size.toString(16)}-${stats.mtimeMs.toString(16)}"`;

const server = http.createServer((req, res) => {
    const route = req.url.split('?')[0];

    if (req.method === 'POST' && route === '/export-meta') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const filePath = path.join(__dirname, 'assets', 'textures', 'metadata.json');
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, body);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.toString());
            }
        });
        return;
    }

    if (req.method === 'POST' && route === '/export') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                // The exporter now hands us `canvas.toDataURL('image/webp')` directly, so
                // the extension follows whatever the data URL actually declares rather than
                // being hardcoded to .png. That closes the manual PNG->WebP conversion gap
                // between what the exporter wrote and what StaticTextureLoader fetches.
                const mimeMatch = /^data:image\/(\w+);base64,/.exec(data.image);
                const ext = mimeMatch ? mimeMatch[1] : 'png';
                const base64Data = data.image.replace(/^data:image\/\w+;base64,/, "");
                const buf = Buffer.from(base64Data, 'base64');
                const filePath = path.join(__dirname, 'assets', 'textures', `${data.name}.${ext}`);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, buf);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(err.toString());
            }
        });
        return;
    }

    let filePath = path.join(__dirname, route === '/' ? 'index.html' : route);

    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('403 Forbidden');
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.stat(filePath, (statErr, stats) => {
        if (statErr || !stats.isFile()) {
            if (!statErr || statErr.code === 'ENOENT' || statErr.code === 'ENOTDIR') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                return res.end(`<h1>404 Not Found</h1><p>The file ${route} was not found on this server.</p>`, 'utf-8');
            }
            res.writeHead(500);
            return res.end(`Sorry, check with the site admin for error: ${statErr.code} ..\n`);
        }

        const etag = etagFor(stats);
        const cacheControl = cacheControlFor(route);

        if (req.headers['if-none-match'] === etag) {
            res.writeHead(304, {'ETag': etag, 'Cache-Control': cacheControl});
            return res.end();
        }

        fs.readFile(filePath, (error, content) => {
            if (error) {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
                return;
            }
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
                'ETag': etag,
                'Last-Modified': stats.mtime.toUTCString()
            });
            res.end(content);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Level 0 Engine running at http://localhost:${PORT}`);
});
