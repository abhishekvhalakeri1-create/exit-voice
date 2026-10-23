import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { ensureSeedData } from './seed';
import { attachViewer } from './authMiddleware';
import { authRouter } from './routes/auth';
import { storiesRouter } from './routes/stories';
import { companiesRouter } from './routes/companies';
import { moderationRouter } from './routes/moderation';

ensureSeedData();

async function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT || 3000);

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(attachViewer);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'ExitVoice API', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/companies', companiesRouter);
  app.use('/api', storiesRouter);
  app.use('/api', moderationRouter);

  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distPath, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ExitVoice error]', err);
    res.status(500).json({ error: 'Something went wrong on our server. Please try again.' });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`ExitVoice running on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });
}

bootstrap();
