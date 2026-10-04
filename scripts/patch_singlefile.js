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
  
  // Convert type="module" to standard classic script for universal Android WebView compatibility
  content = content.replace(/<script type="module" crossorigin>/g, '<script>');
  content = content.replace(/<script type="module">/g, '<script>');
  
  // Write to both assets/web/index.html and dist/index.html
  fs.writeFileSync(path.join(assetsWebDir, 'index.html'), content, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'index.html'), content, 'utf-8');
  
  console.log('Successfully patched & synchronized index.html in both assets/web/ and dist/ for 100% Android WebView compatibility.');
} else {
  console.warn('Warning: index.html not found yet to patch.');
}
