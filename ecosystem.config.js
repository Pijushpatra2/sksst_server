/**
 * PM2 Ecosystem Configuration — Load Balancing via Cluster Mode
 *
 * PM2 cluster mode forks one worker per CPU core using Node.js's built-in
 * cluster module. All workers share the same TCP port.
 * Incoming HTTP requests are distributed round-robin across workers.
 *
 * Commands:
 *   npm run start:cluster      → start all workers
 *   pm2 list                   → view all running workers
 *   pm2 monit                  → live CPU / memory dashboard
 *   pm2 logs puja-server       → tail worker logs
 *   pm2 reload puja-server     → zero-downtime rolling restart
 *   pm2 stop puja-server       → stop all workers
 *   pm2 delete puja-server     → remove from PM2 registry
 */

module.exports = {
  apps: [
    {
      name: 'puja-server',

      // Entry point: compiled JS (run `npm run build` first)
      script: './dist/server.js',

      // ── Cluster mode ─────────────────────────────────────────────────────
      // 'max' = one worker per logical CPU core
      // Set to a specific number (e.g. 4) to limit workers
      instances: 'max',
      exec_mode: 'cluster',

      // ── Environment ───────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5001,
      },

      // ── Auto-restart rules ────────────────────────────────────────────────
      // Restart worker if it crashes
      autorestart: true,
      // Max restart attempts in 10 minutes before marking as errored
      max_restarts: 10,
      min_uptime: '10s',
      // Restart if memory exceeds 500MB (memory leak guard)
      max_memory_restart: '500M',

      // ── Logging ───────────────────────────────────────────────────────────
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // ── Watch (dev only) ──────────────────────────────────────────────────
      // Disable in production — use `pm2 reload` for zero-downtime restarts
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],

      // ── Graceful shutdown ─────────────────────────────────────────────────
      // Time PM2 waits for SIGTERM handler to finish before SIGKILL
      kill_timeout: 10000,
      // Send SIGINT instead of SIGTERM so our handler fires
      shutdown_with_message: false,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
