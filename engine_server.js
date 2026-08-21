import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 8080;

const ISOLATION_HEADERS = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-origin'
};

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

const IMMUTABLE_ROUTES = /^\/(r160\.js|assets\/fonts\/)/;

const cacheControlFor = (route) =>
    IMMUTABLE_ROUTES.test(route) ? 'public, max-age=31536000, immutable' : 'no-cache';

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
                const mimeMatch = /^data:image\/(\w+);base64,/.exec(data.image);
                const ext = mimeMatch ? mimeMatch[1] : 'png';
                const base64Data = data.image.replace(/^data:image\/\w+;base64,/, "");
                const buf = Buffer.from(base64Data, 'base64');
                const base = path.resolve(__dirname, 'assets', 'textures');
                const filePath = path.resolve(base, `${data.name}.${ext}`);
                const relative = path.relative(base, filePath);
                if (relative.startsWith('..') || path.isAbsolute(relative)) {
                    throw new Error('Invalid file path');
                }
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
            res.writeHead(304, {...ISOLATION_HEADERS, 'ETag': etag, 'Cache-Control': cacheControl});
            return res.end();
        }

        fs.readFile(stats.ino, (error, content) => {
            if (error) {
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
                return;
            }

            let output = content;
            if (route === '/engine.html' && contentType === 'text/html') {
                try {
                    const srcDir = path.join(__dirname, 'src');
                    const getFiles = (dir) => {
                        const dirents = fs.readdirSync(dir, { withFileTypes: true });
                        const files = dirents.map((dirent) => {
                            const res = path.resolve(dir, dirent.name);
                            return dirent.isDirectory() ? getFiles(res) : res;
                        });
                        return Array.prototype.concat(...files);
                    };
                    const jsFiles = getFiles(srcDir).filter(f => f.endsWith('.js'));
                    const links = jsFiles.map(f => `<link rel="modulepreload" href="src${f.replace(srcDir, '').replace(/\\/g, '/')}">`).join('\n    ');

                    let html = output.toString('utf-8');
                    html = html.replace('<!-- DYNAMIC_PRELOADS -->', links);
                    output = Buffer.from(html, 'utf-8');
                } catch (e) {
                    console.error('Failed to generate dynamic preloads', e);
                }
            }
            res.writeHead(200, {
                ...ISOLATION_HEADERS,
                'Content-Type': contentType,
                'Cache-Control': cacheControl,
                'ETag': etag,
                'Last-Modified': stats.mtime.toUTCString(),
                'Content-Length': Buffer.byteLength(output)
            });
            res.end(output);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Level 0 Engine running at http://localhost:${PORT}`);
});
