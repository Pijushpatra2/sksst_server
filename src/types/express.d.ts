import { AdminJwtPayload, StaffJwtPayload } from './canteen.types';
import { DevoteeJwtPayload } from './devotee.types';

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
      /** Set by verifyDevoteeJWT middleware */
      devotee?: DevoteeJwtPayload;
      /** Unique request ID set by requestId middleware */
      requestId?: string;
    }
  }
}

