import { Router, Request, Response } from 'express';
import { pool } from '@config/db';
import { env } from '@config/env';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

/**
 * GET /api/health
 * Basic liveness check — confirms the server process is running.
 * Returns the PM2 worker PID so you can verify load balancing rotation.
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      data: {
        status:      'ok',
        environment: env.NODE_ENV,
        pid:         process.pid,          // Changes per PM2 worker
        uptime:      Math.floor(process.uptime()) + 's',
        timestamp:   new Date().toISOString(),
      },
    });
  }),
);

/**
 * GET /api/health/db
 * Readiness check — confirms the server can reach MySQL.
 * Used by load balancers and monitoring systems.
 */
router.get(
  '/db',
  asyncHandler(async (_req: Request, res: Response) => {
    const start = Date.now();

    // Run a lightweight query to confirm DB connectivity
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      'SELECT VERSION() AS version, NOW() AS server_time',
    );

    const latencyMs = Date.now() - start;
    const row = rows[0];

    res.status(200).json({
      success: true,
      message: 'Database connection healthy',
      data: {
        status:      'ok',
        pid:         process.pid,
        latency_ms:  latencyMs,
        mysql_version: row?.version ?? 'unknown',
        server_time:   row?.server_time ?? null,
      },
    });
  }),
);

// mysql import needed for RowDataPacket type
import mysql from 'mysql2/promise';

export default router;
