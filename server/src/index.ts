import { createApp } from './app';
import { serve } from '@hono/node-server';

const { app, store } = createApp();

const port = parseInt(process.env.PORT ?? '8787', 10);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`MatrixIQ backend listening on http://localhost:${info.port}`);
  console.log(`Session TTL: ${process.env.SESSION_TTL_MS ?? '1800000'}ms`);
});

// Graceful shutdown: stop the session sweep timer.
process.on('SIGTERM', () => {
  store.stopSweep();
  process.exit(0);
});
process.on('SIGINT', () => {
  store.stopSweep();
  process.exit(0);
});
