import express from 'express';
import path from 'node:path';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import modelRoutes from './routes/modelRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';
import { dbState } from './config/db.js';
import { UPLOADS_DIR } from './services/storage/storageService.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'furniture-studio-api', phase: 7, db: dbState() });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/models', modelRoutes);

// Production: serve the built client and fall back to the SPA entry.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(process.cwd(), '../client/dist');
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
