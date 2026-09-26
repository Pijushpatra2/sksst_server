import { Request, Response } from 'express';
import { ShopkeeperService } from './shopkeeper.service';

export class ShopkeeperController {
  /**
   * Shopkeeper login.
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    const result = await ShopkeeperService.login({ email, password });

    res.cookie('shopkeeper_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(200).json({
      status: 'success',
      message: 'Shopkeeper logged in successfully',
      data: {
        shopkeeper: result.shopkeeper,
        accessToken: result.accessToken,
      },
    });
  }

  /**
   * Get currently logged-in shopkeeper profile.
   */
  static async me(req: Request, res: Response): Promise<void> {
    const shopkeeperId = req.shopkeeper?.id;
    if (shopkeeperId) {
      try {
        const profile = await ShopkeeperService.getProfile(shopkeeperId);
        res.status(200).json({
          status: 'success',
          data: {
            shopkeeper: profile,
          },
        });
        return;
      } catch (err) {
        // Fallback if record not found
      }
    }

    // Admin fallback session
    if (req.admin) {
      res.status(200).json({
        status: 'success',
        data: {
          shopkeeper: {
            id: String(req.admin.id),
            name: 'System Administrator',
            email: req.admin.email || 'admin@sksstkampala.org',
            role: req.admin.role ? req.admin.role.toUpperCase() : 'SUPER_ADMIN',
            store_name: 'Main Temple Store Desk',
            status: 'ACTIVE',
            is_active: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      });
      return;
    }

    res.status(401).json({
      status: 'error',
      message: 'Unauthorized shopkeeper session',
    });
  }

  /**
   * Shopkeeper changes their OWN password with old password verification.
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    const shopkeeperId = req.shopkeeper?.id;
    if (!shopkeeperId) {
      if (req.admin) {
        res.status(400).json({
          status: 'error',
          message: 'Admin password should be updated via Staff Admin settings.',
        });
        return;
      }
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized shopkeeper session',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const result = await ShopkeeperService.changePassword(shopkeeperId, {
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }

  /**
   * Shopkeeper updates their own profile details.
   */
  static async updateOwnProfile(req: Request, res: Response): Promise<void> {
    const shopkeeperId = req.shopkeeper?.id;
    if (shopkeeperId) {
      const updated = await ShopkeeperService.updateOwnProfile(shopkeeperId, req.body);
      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          shopkeeper: updated,
        },
      });
      return;
    }

    if (req.admin) {
      res.status(200).json({
        status: 'success',
        message: 'Profile updated successfully',
        data: {
          shopkeeper: {
            id: String(req.admin.id),
            name: req.body.name || 'System Administrator',
            email: req.admin.email || 'admin@sksstkampala.org',
            role: req.admin.role ? req.admin.role.toUpperCase() : 'SUPER_ADMIN',
            store_name: 'Main Temple Store Desk',
            status: 'ACTIVE',
            is_active: 1,
            phone: req.body.phone,
            address: req.body.address,
          },
        },
      });
      return;
    }

    res.status(401).json({
      status: 'error',
      message: 'Unauthorized shopkeeper session',
    });
  }

  /**
   * Get store dashboard stats for Shopkeeper.
   */
  static async getDashboardStats(_req: Request, res: Response): Promise<void> {
    const stats = await ShopkeeperService.getDashboardStats();
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  }

  // =========================================================================
  //   ADMIN CONTROLLER HANDLERS
  // =========================================================================

  /**
   * Admin lists all shopkeepers.
   */
  static async adminListAll(_req: Request, res: Response): Promise<void> {
    const list = await ShopkeeperService.listAllForAdmin();
    res.status(200).json({
      status: 'success',
      data: {
        shopkeepers: list,
      },
    });
  }

  /**
   * Admin creates a new shopkeeper.
   */
  static async adminCreate(req: Request, res: Response): Promise<void> {
    const adminId = req.admin?.id;
    const created = await ShopkeeperService.adminCreateShopkeeper(req.body, adminId);

    res.status(201).json({
      status: 'success',
      message: 'Shopkeeper account created successfully',
      data: {
        shopkeeper: created,
      },
    });
  }

  /**
   * Admin updates a shopkeeper's profile and status.
   */
  static async adminUpdate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updated = await ShopkeeperService.adminUpdateShopkeeper(id, req.body);

    res.status(200).json({
      status: 'success',
      message: 'Shopkeeper details updated successfully',
      data: {
        shopkeeper: updated,
      },
    });
  }

  /**
   * Admin resets a shopkeeper's password directly (NO OLD PASSWORD REQUIRED).
   */
  static async adminResetPassword(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      res.status(400).json({
        status: 'error',
        message: 'New password is required',
      });
      return;
    }

    const result = await ShopkeeperService.adminResetPassword(id, password);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }

  /**
   * Admin deletes a shopkeeper account.
   */
  static async adminDelete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await ShopkeeperService.adminDeleteShopkeeper(id);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  }
}
