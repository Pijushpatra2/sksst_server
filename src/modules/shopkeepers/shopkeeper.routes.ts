import { Router } from 'express';
import { ShopkeeperController } from './shopkeeper.controller';
import {
  verifyAdminJWT,
  verifyShopkeeperOrAdminJWT
} from '@middleware/auth.middleware';

const router = Router();

// =========================================================================
//   SHOPKEEPER PUBLIC & AUTHENTICATED ROUTES
// =========================================================================

// Shopkeeper Login
router.post('/login', ShopkeeperController.login);

// Shopkeeper Profile (Self)
router.get('/me', verifyShopkeeperOrAdminJWT, ShopkeeperController.me);

// Shopkeeper Self Profile Update
router.put('/profile', verifyShopkeeperOrAdminJWT, ShopkeeperController.updateOwnProfile);

// Shopkeeper Self Password Change (Requires current old password)
router.put('/change-password', verifyShopkeeperOrAdminJWT, ShopkeeperController.changePassword);

// Shopkeeper Dashboard Live Statistics
router.get('/dashboard/stats', verifyShopkeeperOrAdminJWT, ShopkeeperController.getDashboardStats);

// =========================================================================
//   ADMIN EXCLUSIVE SHOPKEEPER MANAGEMENT ROUTES
// =========================================================================

// List all shopkeepers (Directory for Requisitions & Admin)
router.get('/list', ShopkeeperController.adminListAll);
router.get('/admin/list', ShopkeeperController.adminListAll);

// Admin Create new shopkeeper
router.post('/admin/create', verifyAdminJWT, ShopkeeperController.adminCreate);

// Admin Update shopkeeper details & status
router.put('/admin/:id', verifyAdminJWT, ShopkeeperController.adminUpdate);

// Admin Reset shopkeeper password directly (NO OLD PASSWORD REQUIRED)
router.put('/admin/:id/reset-password', verifyAdminJWT, ShopkeeperController.adminResetPassword);

// Admin Delete shopkeeper
router.delete('/admin/:id', verifyAdminJWT, ShopkeeperController.adminDelete);

export default router;
