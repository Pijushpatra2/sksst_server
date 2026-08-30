import { Router } from 'express';
import productsRoutes from '../products/products.routes';
import categoriesRoutes from './categories/categories.routes';
import ordersRoutes from './orders/orders.routes';
import customersRoutes from './customers/customers.routes';
import couponsRoutes from './coupons/coupons.routes';
import reviewsRoutes from './reviews/reviews.routes';

const router = Router();

// Mount all shop sub-modules
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/orders', ordersRoutes);
router.use('/customers', customersRoutes);
router.use('/coupons', couponsRoutes);
router.use('/reviews', reviewsRoutes);

export default router;
