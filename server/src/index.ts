import 'dotenv/config';
import { createApp } from './app';
import { serve } from '@hono/node-server';

const { app, store } = createApp();

const port = Number.parseInt(process.env.PORT ?? '8787', 10);
if (!Number.isInteger(port) || port <= 0) {
  console.error(`Invalid PORT value: ${process.env.PORT ?? '(missing)'}`);
  process.exit(1);
}

// Render injects PORT and expects the service to bind to all interfaces.
const hostname = process.env.HOST?.trim() || '0.0.0.0';

serve({
  fetch: app.fetch,
  port,
  hostname,
}, (info) => {
  console.log(`MatrixIQ backend listening on http://${hostname}:${info.port}`);
  console.log(`Session TTL: ${process.env.SESSION_TTL_MS ?? '1800000'}ms`);
  console.log(`Session sweep: ${process.env.SESSION_SWEEP_MS ?? '300000'}ms`);
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
