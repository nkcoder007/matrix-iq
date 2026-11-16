import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../app';
import type { SessionStore } from '../types';

/**
 * Session middleware.
 * Validates the X-Session-ID header, rejects expired sessions immediately, and
 * attaches the SessionData to c.var.session.
 *
 * Every backend operation validates the session ID and verifies that
 * requested projects/documents belong to that session.
 */
export function createSessionMiddleware(store: SessionStore) {
  return createMiddleware<Env>(async (c, next) => {
    const sessionId = c.req.header('X-Session-ID');

    if (!sessionId || sessionId.trim() === '') {
      throw new HTTPException(401, { message: 'Missing or invalid X-Session-ID header' });
    }

    const session = store.get(sessionId);
    if (!session) {
      // Session expired or never created. Force the client to start fresh.
      throw new HTTPException(401, {
        message: 'Session not found or expired. Please reload to start a new session.',
      });
    }

    c.set('session', session);
    c.set('sessionId', sessionId);

    await next();
  });
}
