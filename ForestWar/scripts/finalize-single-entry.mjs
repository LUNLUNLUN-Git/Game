import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distIndexPath = path.join(projectRoot, 'dist', 'index.html');
const rootIndexPath = path.join(projectRoot, 'index.html');
const distFaviconPath = path.join(projectRoot, 'dist', 'favicon.ico');
const rootFaviconPath = path.join(projectRoot, 'favicon.ico');

if (!fs.existsSync(distIndexPath)) {
  throw new Error(`dist/index.html not found: ${distIndexPath}`);
}

let html = fs.readFileSync(distIndexPath, 'utf8');
html = html.replaceAll('"./assets/', '"./dist/assets/');
html = html.replaceAll("'./assets/", "'./dist/assets/");
html = html.replaceAll('"./audio/', '"./dist/audio/');
html = html.replaceAll("'./audio/", "'./dist/audio/");
html = html.replaceAll('href="./favicon.ico"', 'href="./dist/favicon.ico"');
html = html.replaceAll("href='./favicon.ico'", "href='./dist/favicon.ico'");
html = html.replaceAll('href="/favicon.ico"', 'href="./dist/favicon.ico"');
html = html.replaceAll("href='/favicon.ico'", "href='./dist/favicon.ico'");

fs.writeFileSync(rootIndexPath, html, 'utf8');
if (fs.existsSync(distFaviconPath)) {
  fs.copyFileSync(distFaviconPath, rootFaviconPath);
}
fs.rmSync(distIndexPath, { force: true });
