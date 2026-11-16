import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { SessionData } from './types';
import { sessionStore } from './services/sessionStore';
import { sessionMiddleware } from './middleware/session';
import projectsRoute from './routes/projects';

export type Env = {
  Bindings: {
    SESSION_TTL_MS: string;
    SESSION_SWEEP_MS: string;
  };
  Variables: {
    sessionId: string;
    session: SessionData;
  };
};

export function createApp() {
  const app = new Hono<Env>();

  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      allowHeaders: ['X-Session-ID', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: false,
    })
  );

  // Health check (no session required — used for readiness probes).
  app.get('/health', (c) => {
    return c.json({ ok: true, sessions: sessionStore.size() });
  });

  // All other routes require a valid session.
  app.use('*', sessionMiddleware);

  // Mount feature routes.
  app.route('/projects', projectsRoute);

  // 404 handler.
  app.notFound((c) => {
    return c.json({ message: `Route not found: ${c.req.method} ${c.req.path}` }, 404);
  });

  // Global error handler matching the ApiError shape in src/services/api.ts.
  app.onError((err, c) => {
    if (err instanceof Error && 'status' in err) {
      const status = (err as { status: number }).status as number;
      c.status(status as any);
      return c.json({ message: err.message ?? `Request failed with status ${status}.` });
    }
    console.error('Unhandled error:', err);
    c.status(500);
    return c.json({ message: 'Internal server error.' });
  });

  return { app, store: sessionStore };
}
