import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '@utils/ApiError';
import { verifyAdminAccessToken, verifyStaffAccessToken } from '@utils/jwt';
import { AdminRole, CanteenStaffRole } from '../types/canteen.types';

/**
 * Authentication & Authorization Guards
 */

/**
 * Guard to verify Bearer JWT token for Admin users.
 * Decodes payload and attaches it to req.admin.
 */
export const verifyAdminJWT: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Access token is missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAdminAccessToken(token);
    req.admin = decoded;
    next();
  } catch (err) {
    return next(ApiError.unauthorized('Access token has expired or is invalid'));
  }
};

/**
 * Guard to verify Bearer JWT token for Canteen Staff workers.
 * Decodes payload and attaches it to req.staff.
 */
export const verifyStaffJWT: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Access token is missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyStaffAccessToken(token);
    req.staff = decoded;
    next();
  } catch (err) {
    return next(ApiError.unauthorized('Access token has expired or is invalid'));
  }
};

/**
 * Guard to restrict admin access to specific roles.
 * Must be registered AFTER verifyAdminJWT.
 */
export const requireAdminRole = (allowedRoles: AdminRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const admin = req.admin;
    if (!admin) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(admin.role)) {
      return next(ApiError.forbidden('You do not have permission to access this resource'));
    }

    next();
  };
};

/**
 * Guard to restrict admin access to a specific module scope (e.g. 'canteen').
 * super_admin has implicit access (module_scope is NULL).
 * Must be registered AFTER verifyAdminJWT.
 */
export const requireModuleScope = (requiredScope: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const admin = req.admin;
    if (!admin) {
      return next(ApiError.unauthorized());
    }

    // super_admin bypasses module scope restrictions
    if (admin.role === 'super_admin') {
      return next();
    }

    if (admin.moduleScope !== requiredScope) {
      return next(ApiError.forbidden(`This account is not authorized to access the "${requiredScope}" module`));
    }

    next();
  };
};

/**
 * Guard to restrict staff access to specific terminal roles (e.g. cashier, kitchen).
 * Must be registered AFTER verifyStaffJWT.
 */
export const requireStaffRole = (allowedRoles: CanteenStaffRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // If authenticated as admin, bypass staff role checks
    if (req.admin) {
      return next();
    }

    const staff = req.staff;
    if (!staff) {
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(staff.assignedRole)) {
      return next(ApiError.forbidden('Your terminal role does not have permission to execute this action'));
    }

    next();
  };
};

/**
 * Guard to verify Bearer JWT token for EITHER Admin or Canteen Staff.
 * Attaches req.admin or req.staff depending on token signature.
 */
export const verifyStaffOrAdminJWT: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Access token is missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  
  // Try admin first
  try {
    const decodedAdmin = verifyAdminAccessToken(token);
    req.admin = decodedAdmin;
    return next();
  } catch (err) {
    // Try staff next
    try {
      const decodedStaff = verifyStaffAccessToken(token);
      req.staff = decodedStaff;
      return next();
    } catch (staffErr) {
      return next(ApiError.unauthorized('Access token has expired or is invalid'));
    }
  }
};

/**
 * Guard to check if requester has Canteen Manager capability.
 * Admins bypass this; Canteen staff must have the 'manager' role.
 * Must be registered AFTER verifyStaffOrAdminJWT.
 */
export const requireCanteenManager: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  if (req.admin) {
    return next(); // Admins have manager access
  }
  
  if (req.staff && req.staff.assignedRole === 'manager') {
    return next(); // Canteen managers have access
  }
  
  next(ApiError.forbidden('You do not have permission to execute this action'));
};

