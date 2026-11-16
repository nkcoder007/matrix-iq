import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import type { SessionData, SessionStore } from './types';
import { sessionStore as defaultSessionStore } from './services/sessionStore';
import { createSessionMiddleware } from './middleware/session';
import { readCorsOrigins } from './config';
import projectsRoute from './routes/projects';

export type Env = {
  Variables: {
    sessionId: string;
    session: SessionData;
  };
};

export interface CreateAppOptions {
  store?: SessionStore;
  corsOrigins?: string[];
}

export function createApp(options: CreateAppOptions = {}) {
  const store = options.store ?? defaultSessionStore;
  const corsOrigins = options.corsOrigins ?? readCorsOrigins();
  const app = new Hono<Env>();

  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: corsOrigins,
      allowHeaders: ['X-Session-ID', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: false,
    })
  );

  // Health check (no session required — used for readiness probes).
  app.get('/health', (c) => {
    return c.json({ ok: true, sessions: store.size() });
  });

  // Public bootstrap endpoint. Protected routes reject unknown session IDs.
  app.post('/session', (c) => {
    const sessionId = crypto.randomUUID();
    store.create(sessionId);
    c.header('Cache-Control', 'no-store');
    return c.json({ sessionId }, 201);
  });

  // All other routes require a valid session.
  app.use('*', createSessionMiddleware(store));

  // Mount feature routes.
  app.route('/projects', projectsRoute);

  // 404 handler.
  app.notFound((c) => {
    return c.json({ message: `Route not found: ${c.req.method} ${c.req.path}` }, 404);
  });

  // Global error handler matching the ApiError shape in src/services/api.ts.
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ message: err.message }, err.status);
    }
    console.error('Unhandled error:', err);
    return c.json({ message: 'Internal server error.' }, 500);
  });

  return { app, store };
}
