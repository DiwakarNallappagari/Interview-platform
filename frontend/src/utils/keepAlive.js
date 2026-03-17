/**
 * keepAlive.js
 * ─────────────────────────────────────────────────────────────────────────
 * Pings the Render backend every 14 minutes so the free-tier instance
 * doesn't spin down due to inactivity.
 *
 * Import this once at the top of main.jsx or App.jsx:
 *   import './utils/keepAlive'
 */

const BACKEND_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

const ping = () => {
  fetch(`${BACKEND_URL}/health`, { method: 'GET' })
    .then(() => console.log('🏓 Keep-alive ping sent'))
    .catch(() => console.warn('⚠️  Keep-alive ping failed (backend may be starting up)'));
};

// Do a first ping after 1 minute, then every 14 minutes
setTimeout(() => {
  ping();
  setInterval(ping, PING_INTERVAL_MS);
}, 60_000);

export {};
