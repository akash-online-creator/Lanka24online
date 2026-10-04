import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('assets/web/index.html');
if (fs.existsSync(htmlPath)) {
  let content = fs.readFileSync(htmlPath, 'utf-8');
  
  // Convert type="module" to standard classic script for universal Android WebView compatibility
  content = content.replace(/<script type="module" crossorigin>/g, '<script>');
  content = content.replace(/<script type="module">/g, '<script>');
  
  fs.writeFileSync(htmlPath, content, 'utf-8');
  console.log('Successfully patched assets/web/index.html for 100% Android WebView compatibility (classic script).');
} else {
  console.error('assets/web/index.html not found to patch.');
}
