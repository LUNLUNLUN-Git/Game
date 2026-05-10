import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

for (const folderName of ['dist', 'dist-filecheck']) {
  fs.rmSync(path.join(projectRoot, folderName), { recursive: true, force: true });
}
