import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');
const distIndexPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distIndexPath)) {
  throw new Error(`dist/index.html not found: ${distIndexPath}`);
}

const assetFiles = fs.readdirSync(assetsDir);
const cssFile = assetFiles.find((name) => /^(main|index)-.*\.css$/.test(name));
const mainFile = assetFiles.find((name) => /^(main|index)-.*\.js$/.test(name));

if (!cssFile || !mainFile) {
  throw new Error('Unable to find built main CSS/JS assets in dist/assets');
}

const cssPath = path.join(assetsDir, cssFile);
const mainPath = path.join(assetsDir, mainFile);
const cssCode = fs.readFileSync(cssPath, 'utf8');
let mainCode = fs.readFileSync(mainPath, 'utf8');

for (const assetName of assetFiles) {
  if (assetName === cssFile || assetName === mainFile) continue;
  mainCode = mainCode.replaceAll(`"./${assetName}"`, `"./assets/${assetName}"`);
  mainCode = mainCode.replaceAll(`'./${assetName}'`, `'./assets/${assetName}'`);
  mainCode = mainCode.replaceAll(`new URL("${assetName}",import.meta.url)`, `new URL("./assets/${assetName}",import.meta.url)`);
  mainCode = mainCode.replaceAll(`new URL('${assetName}',import.meta.url)`, `new URL('./assets/${assetName}',import.meta.url)`);
}

mainCode = mainCode.replaceAll('`../audio/${b}`', '`./audio/${b}`');
mainCode = mainCode.replaceAll('"../audio/', '"./audio/');
mainCode = mainCode.replaceAll("'../audio/", "'./audio/");

const standaloneHtml = `<!doctype html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/x-icon" href="./favicon.ico" />
    <title>森林保衛戰 Roguelike 倖存者</title>
    <style>${cssCode}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
${mainCode}
    </script>
  </body>
</html>
`;

fs.writeFileSync(distIndexPath, standaloneHtml, 'utf8');
