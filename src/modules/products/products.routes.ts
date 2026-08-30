import { Router } from 'express';
import { ProductsController } from './products.controller';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

// Public routes for catalog viewing
router.get('/', asyncHandler(ProductsController.getProducts));
router.get('/slug/:slug', asyncHandler(ProductsController.getProductBySlug));
router.get('/:id', asyncHandler(ProductsController.getProductById));

// Modification routes
router.post('/', asyncHandler(ProductsController.createProduct));
router.put('/:id', asyncHandler(ProductsController.updateProduct));
router.patch('/:id', asyncHandler(ProductsController.updateProduct));
router.delete('/:id', asyncHandler(ProductsController.deleteProduct));

export default router;
