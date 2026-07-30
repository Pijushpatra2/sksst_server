/**
 * ecosystem.config.cjs
 *
 * PM2 Ecosystem Configuration — Swami Canteen POS API Server
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs        # Start all instances
 *   pm2 reload ecosystem.config.cjs       # Zero-downtime reload
 *   pm2 stop ecosystem.config.cjs         # Stop all instances
 *   pm2 delete ecosystem.config.cjs       # Remove from PM2 registry
 *   pm2 logs canteen-api                  # Stream logs
 *
 * Cluster Mode:
 *   PM2 forks 4 Node.js workers (one per CPU core recommended).
 *   NGINX distributes requests across them using least_conn.
 *
 * Each instance uses the same PORT — NGINX upstream pool handles routing.
 * If you want separate ports per instance, use PORT_BASE env trick below.
 */

module.exports = {
  apps: [
    {
      name: 'canteen-api',
      script: 'dist/server.js',           // Compiled TypeScript output
      cwd: __dirname,
      instances: 4,                        // 4 worker processes (match upstream servers in nginx)
      exec_mode: 'cluster',               // Node.js cluster mode — shared port
      watch: false,                        // Disable file watching in production
      max_memory_restart: '512M',          // Restart if memory exceeds 512MB

      env: {
        NODE_ENV: 'production',
        PORT: 5001,                        // All cluster workers share this port
        DB_HOST: 'sksstdatabase.c9c4wq4gcxjc.eu-north-1.rds.amazonaws.com',
        DB_PORT: 3306,
        DB_NAME: 'sksstdatabase',
        DB_USER: 'sksst',
        DB_PASS: 'Sksst2026',              // Set in production via env file or secrets manager
      },

      env_development: {
        NODE_ENV: 'development',
        PORT: 5001,
      },

      // ─── Log Configuration ──────────────────────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,                    // Merge logs from all cluster workers

      // ─── Restart Policy ─────────────────────────────────────────────────
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',                   // Must stay up 10s to be considered stable
      restart_delay: 3000,                 // Wait 3 seconds before restarting
    },
  ],
};
