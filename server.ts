import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Health Check API
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now(), service: 'Sahaya Seva API' });
});

// Serve built static assets from assets/web or root
app.use(express.static(path.join(__dirname, 'assets/web')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'assets/web', 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'index.html'));
    }
  });
});

app.listen(port, () => {
  console.log(`Sahaya Seva Server listening on port ${port}`);
});
