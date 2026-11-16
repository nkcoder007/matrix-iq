import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, '.', '');
  const proxyTarget = env.VITE_API_PROXY_TARGET?.trim();

  // A production bundle must never silently fall back to local mode or a
  // development API URL. Vercel supplies these values at build time. Previewing
  // an existing dist/ does not rebuild or read these variables.
  if (command === 'build' && mode === 'production') {
    if (env.VITE_API_MODE?.trim() !== 'remote') {
      throw new Error('Production builds require VITE_API_MODE=remote.');
    }

    const rawBaseUrl = env.VITE_API_BASE_URL?.trim();
    if (!rawBaseUrl) {
      throw new Error('Production builds require VITE_API_BASE_URL.');
    }

    let apiUrl: URL;
    try {
      apiUrl = new URL(rawBaseUrl);
    } catch {
      throw new Error('VITE_API_BASE_URL must be an absolute URL.');
    }

    if (apiUrl.protocol !== 'https:') {
      throw new Error('VITE_API_BASE_URL must use HTTPS in production.');
    }
    if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(apiUrl.hostname)) {
      throw new Error('VITE_API_BASE_URL must not point at localhost in production.');
    }
    if (apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
      throw new Error(
        'VITE_API_BASE_URL must be the backend origin only, without a path such as /api.',
      );
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: proxyTarget
        ? {
            '/api': {
              target: proxyTarget,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
            },
          }
        : undefined,
    },
  };
});
