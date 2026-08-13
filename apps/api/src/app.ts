import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorMiddleware } from './lib/errors';
import { authRouter } from './modules/auth/routes';
import { usersRouter } from './modules/users/routes';
import { videosRouter } from './modules/videos/routes';
import { videoWebhookRouter } from './modules/videos/webhook';
import { musicRouter } from './modules/music/routes';
import { newsRouter } from './modules/news/routes';
import { eventsRouter } from './modules/events/routes';
import { foldersRouter } from './modules/folders/routes';
import { activityRouter } from './modules/activity/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { storageRouter, devStorageRouter } from './modules/storage/routes';

export function createApp(): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: config.webOrigin === '*' ? true : [config.webOrigin, 'https://xrk-web.vercel.app', 'http://localhost:3000'],
      credentials: true,
    }),
  );

  app.use('/api/dev-storage', devStorageRouter);

  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    }),
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/webhooks', videoWebhookRouter);
  app.use('/api/music', musicRouter);
  app.use('/api/news', newsRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/folders', foldersRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/storage', storageRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorMiddleware);
  return app;
}
