import fs from 'fs';
import path from 'path';

// Ensure directories exist
const assetsWebDir = path.resolve('assets/web');
const distDir = path.resolve('dist');

if (!fs.existsSync(assetsWebDir)) {
  fs.mkdirSync(assetsWebDir, { recursive: true });
}
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Find whichever index.html was created
let sourceHtmlPath = null;
if (fs.existsSync(path.join(assetsWebDir, 'index.html'))) {
  sourceHtmlPath = path.join(assetsWebDir, 'index.html');
} else if (fs.existsSync(path.join(distDir, 'index.html'))) {
  sourceHtmlPath = path.join(distDir, 'index.html');
}

if (sourceHtmlPath && fs.existsSync(sourceHtmlPath)) {
  let content = fs.readFileSync(sourceHtmlPath, 'utf-8');
  
  // 1. Ensure <div id="root"></div> exists in body
  if (!content.includes('id="root"')) {
    content = content.replace('<body>', '<body>\n    <div id="root"></div>');
  }

  // 2. Convert type="module" to standard defer classic script for universal Android WebView compatibility
  content = content.replace(/<script type="module" crossorigin>/g, '<script defer>');
  content = content.replace(/<script type="module">/g, '<script defer>');
  
  // 3. Write to both assets/web/index.html and dist/index.html
  fs.writeFileSync(path.join(assetsWebDir, 'index.html'), content, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'index.html'), content, 'utf-8');

  // 4. Also mirror to android/app/src/main/assets/web if directory exists
  const androidAssetDir = path.resolve('android/app/src/main/assets/web');
  if (fs.existsSync(path.resolve('android/app/src/main'))) {
    fs.mkdirSync(androidAssetDir, { recursive: true });
    fs.writeFileSync(path.join(androidAssetDir, 'index.html'), content, 'utf-8');
    console.log('Mirrored index.html to android/app/src/main/assets/web/index.html');
  }
  
  console.log('Successfully patched & synchronized index.html in assets/web/ and dist/ for 100% Android WebView compatibility.');
} else {
  console.warn('Warning: index.html not found yet to patch.');
}
