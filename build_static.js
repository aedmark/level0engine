import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

const getFiles = (dir) => {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        const relative = path.relative(dir, res);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            throw new Error('Invalid file path');
        }
        return dirent.isDirectory() ? getFiles(res) : res;
    });
    return Array.prototype.concat(...files);
};

const jsFiles = getFiles(srcDir).filter(f => f.endsWith('.js'));
const links = jsFiles.map(f => `<link rel="modulepreload" href="src${f.replace(srcDir, '').replace(/\\/g, '/')}">`).join('\n    ');

const enginePath = path.join(__dirname, 'engine.html');
let html = fs.readFileSync(enginePath, 'utf-8');
html = html.replace('<!-- DYNAMIC_PRELOADS -->', links);

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

const filesToCopy = ['engine.html', 'index.html', 'r160.js', 'main.js', 'readme.html', 'changelog.md'];
const dirsToCopy = ['src', 'assets', 'data'];

function copyRecursiveSync(src, dest) {
    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

console.log('Building static export for itch.io...');

filesToCopy.forEach(f => {
    if (fs.existsSync(path.join(__dirname, f))) {
        if (f === 'engine.html') {
            fs.writeFileSync(path.join(buildDir, f), html);
        } else {
            fs.copyFileSync(path.join(__dirname, f), path.join(buildDir, f));
        }
    }
});

dirsToCopy.forEach(d => {
    if (fs.existsSync(path.join(__dirname, d))) {
        copyRecursiveSync(path.join(__dirname, d), path.join(buildDir, d));
    }
});

console.log('Build complete. You can upload the /build/ directory to itch.io!');
