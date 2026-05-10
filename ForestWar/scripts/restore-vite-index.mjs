import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const templatePath = path.join(__dirname, 'index.vite.template.html');
const indexPath = path.join(projectRoot, 'index.html');

const template = fs.readFileSync(templatePath, 'utf8');
fs.writeFileSync(indexPath, template, 'utf8');
