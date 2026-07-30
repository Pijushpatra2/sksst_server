import { AdminJwtPayload, StaffJwtPayload } from './canteen.types';

/**
 * Augment Express Request to carry the authenticated user payload
 * after the JWT middleware runs.
 */
declare global {
  namespace Express {
    interface Request {
      /** Set by verifyAdminJWT middleware */
      admin?: AdminJwtPayload;
      /** Set by verifyStaffJWT middleware */
      staff?: StaffJwtPayload;
      /** Unique request ID set by requestId middleware */
      requestId?: string;
    }
  }
}
