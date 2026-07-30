import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { env }                    from '@config/env';
import { corsOptions }            from '@config/cors';
import { httpLogger }             from '@middleware/logger.middleware';
import { requestIdMiddleware }    from '@middleware/requestId.middleware';
import { generalRateLimiter }     from '@middleware/rateLimit.middleware';
import { errorMiddleware,
         notFoundHandler }        from '@middleware/error.middleware';

// Route modules
import healthRoutes      from '@modules/health/health.routes';
import authRoutes        from '@modules/auth/auth.routes';
import canteenAuthRoutes from '@modules/canteen/auth/canteenAuth.routes';
import staffRoutes       from '@modules/canteen/staff/staff.routes';
import tableRoutes       from '@modules/canteen/tables/tables.routes';
import menuRoutes        from '@modules/canteen/menu/menu.routes';
import customerRoutes    from '@modules/canteen/customers/customers.routes';
import orderRoutes       from '@modules/canteen/orders/orders.routes';
import bookingRoutes     from '@modules/canteen/bookings/bookings.routes';
import inventoryRoutes   from '@modules/canteen/inventory/inventory.routes';
import reportsRoutes     from '@modules/canteen/reports/reports.routes';
import syncRoutes        from '@modules/canteen/sync/sync.routes';
import categoriesRoutes  from '@modules/canteen/categories/categories.routes';
import uploadRoutes      from '@modules/canteen/upload/upload.routes';


export function createApp(): Application {
  const app = express();

  // ─── Trust proxy (required when behind NGINX or a load balancer) ──────────
  app.set('trust proxy', 1);

  // ─── Security headers ──────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false, // Needed for some API clients
    }),
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.use(cors(corsOptions));

  // ─── Compression (gzip) ───────────────────────────────────────────────────
  app.use(compression());

  // ─── Request ID (must be before logger so it's included in logs) ──────────
  app.use(requestIdMiddleware);

  // ─── HTTP request logging ─────────────────────────────────────────────────
  app.use(httpLogger);

  // ─── Body parsers ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── General rate limiter (all routes) ────────────────────────────────────
  app.use(generalRateLimiter);

  // =========================================================================
  //   API Routes
  // =========================================================================
  const API = env.API_PREFIX;

  // Health checks (no auth required)
  app.use(`${API}/health`, healthRoutes);

  // Auth module
  app.use(`${API}/auth`, authRoutes);

  // Canteen staff auth
  app.use(`${API}/canteen/auth`, canteenAuthRoutes);

  // Canteen staff CRUD management (admin only)
  app.use(`${API}/canteen/staff`, staffRoutes);

  // Canteen layout tables
  app.use(`${API}/canteen/tables`, tableRoutes);

  // Canteen food menu catalog
  app.use(`${API}/canteen/menu`, menuRoutes);

  // Canteen food categories
  app.use(`${API}/canteen/categories`, categoriesRoutes);

  // Canteen devotee customers CRM
  app.use(`${API}/canteen/customers`, customerRoutes);

  // Canteen orders and billing lifecycle
  app.use(`${API}/canteen/orders`, orderRoutes);

  // Canteen reservations bookings calendar
  app.use(`${API}/canteen/bookings`, bookingRoutes);

  // Canteen stock levels inventory and waste logs
  app.use(`${API}/canteen/inventory`, inventoryRoutes);

  // Canteen revenue management reports
  app.use(`${API}/canteen/reports`, reportsRoutes);

  // Canteen dynamic image file upload to S3
  app.use(`${API}/canteen/upload`, uploadRoutes);

  // Offline-first bulk sync — replays offline mutations when device reconnects
  app.use(`${API}/canteen/sync`, syncRoutes);

  // =========================================================================
  //   Error Handling (must be LAST)
  // =========================================================================
  app.use(notFoundHandler);
  app.use(errorMiddleware);

  return app;
}
