import 'dotenv/config';
import http from 'http';
import { env }                      from '@config/env';
import { verifyDatabaseConnection,
         closeDatabasePool }        from '@config/db';
import { createApp }                from './app';



async function bootstrap(): Promise<void> {
  // ── Step 1: Verify DB before accepting traffic ──────────────────────────
  await verifyDatabaseConnection();

  // ── Step 2: Create Express app ──────────────────────────────────────────
  const app    = createApp();
  const server = http.createServer(app);

  // ── Step 3: Start listening ─────────────────────────────────────────────
  server.listen(env.PORT, () => {
    console.log(`
  ┌────────────────────────────────────────────┐
  │  🚀  Puja Software API Server              │
  ├────────────────────────────────────────────┤
  │  ENV  : ${env.NODE_ENV.padEnd(34)} │
  │  PORT : ${String(env.PORT).padEnd(34)} │
  │  PID  : ${String(process.pid).padEnd(34)} │
  │  PREFIX: ${env.API_PREFIX.padEnd(33)} │
  └────────────────────────────────────────────┘
    `);
  });

  // ── Step 4: Graceful shutdown ───────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n⚠️   ${signal} received — shutting down gracefully (PID ${process.pid})`);

    // Stop accepting new connections
    server.close(async () => {
      try {
        await closeDatabasePool();
        console.log(`✅  Worker ${process.pid} shut down cleanly`);
        process.exit(0);
      } catch (err) {
        console.error('❌  Error during shutdown:', err);
        process.exit(1);
      }
    });

    // Force-exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      console.error('❌  Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Catch unhandled rejections and uncaught exceptions
  process.on('unhandledRejection', (reason) => {
    console.error('❌  Unhandled Rejection:', reason);
    shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    console.error('❌  Uncaught Exception:', err);
    shutdown('uncaughtException');
  });
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
