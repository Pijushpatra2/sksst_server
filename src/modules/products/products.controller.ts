import { Request, Response } from 'express';
import { ApiResponse } from '@utils/ApiResponse';
import { ProductsService } from './products.service';

export class ProductsController {
  static getProducts = async (req: Request, res: Response): Promise<void> => {
    const { categoryId, search } = req.query;
    const products = await ProductsService.listProducts({
      categoryId: categoryId as string,
      search: search as string,
    });
    ApiResponse.ok(res, products, 'Products retrieved successfully');
  };

  static getProductById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const product = await ProductsService.getProductById(id);
    ApiResponse.ok(res, product, 'Product details retrieved');
  };

  static getProductBySlug = async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    const product = await ProductsService.getProductBySlug(slug);
    ApiResponse.ok(res, product, 'Product details retrieved');
  };

  static createProduct = async (req: Request, res: Response): Promise<void> => {
    const product = await ProductsService.createProduct(req.body);
    ApiResponse.created(res, product, 'Product created successfully');
  };

  static updateProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const updated = await ProductsService.updateProduct(id, req.body);
    ApiResponse.ok(res, updated, 'Product updated successfully');
  };

  static deleteProduct = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await ProductsService.deleteProduct(id);
    ApiResponse.ok(res, null, 'Product deleted successfully');
  };
}
