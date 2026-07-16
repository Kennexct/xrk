import http from 'node:http';
import { createApp } from './app';
import { config } from './config';
import { createRealtimeGateway } from './realtime/gateway';
import { startNewsScheduler } from './modules/news/scheduler';
import { prisma } from './lib/prisma';

async function main() {
  const app = createApp();
  const server = http.createServer(app);
  createRealtimeGateway(server);
  startNewsScheduler();

  server.listen(config.port, () => {
    console.log(`SYT API listening on :${config.port}`);
    console.log(`  storage driver: ${config.storage.driver} | video driver: ${config.video.driver}`);
  });

  const shutdown = async () => {
    console.log('Shutting down…');
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
