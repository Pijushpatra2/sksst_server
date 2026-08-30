import { generateUUID } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { uploadToS3 } from '@utils/s3';
import { ProductsModel } from './products.model';
import { ShopProduct } from '../../types/shop.types';
import { query } from '@config/db';

export class ProductsService {
  static async listProducts(filters?: { categoryId?: string; search?: string }): Promise<ShopProduct[]> {
    return ProductsModel.listAll(filters);
  }

  static async getProductById(id: string): Promise<ShopProduct> {
    const product = await ProductsModel.findById(id);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    return product;
  }

  static async getProductBySlug(slug: string): Promise<ShopProduct> {
    const product = await ProductsModel.findBySlug(slug);
    if (!product) {
      throw ApiError.notFound('Product not found');
    }
    return product;
  }

  static async createProduct(input: {
    name: string;
    description?: string;
    categoryId?: string;
    price: number;
    stock?: number;
    images?: string[];
    specs?: Record<string, string>;
    isFeatured?: boolean;
    isNew?: boolean;
  }): Promise<ShopProduct> {
    if (!input.name || !input.name.trim()) {
      throw ApiError.badRequest('Product name is required');
    }
    if (input.price === undefined || input.price < 0) {
      throw ApiError.badRequest('Valid product price is required');
    }

    const id = generateUUID();
    const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    // Process images (if any base64/local buffer URLs are passed)
    let processedImages: string[] = [];
    if (input.images && Array.isArray(input.images)) {
      for (let i = 0; i < input.images.length; i++) {
        let img = input.images[i];
        if (img.startsWith('data:image/') || (!img.startsWith('http') && img.length > 100)) {
          try {
            img = await uploadToS3(img, `${baseSlug}-${i + 1}.jpg`, 'products');
          } catch (err) {
            console.error('S3 upload fallback:', err);
          }
        }
        processedImages.push(img);
      }
    }

    return ProductsModel.create({
      id,
      name: input.name.trim(),
      slug,
      description: input.description || '',
      categoryId: input.categoryId || 'cat-idols',
      price: Number(input.price),
      stock: Number(input.stock || 0),
      images: processedImages,
      rating: 5.0,
      reviewsCount: 0,
      specs: input.specs || { Origin: 'Temple Workshop', Blessed: 'Yes' },
      isFeatured: input.isFeatured || false,
      isNew: input.isNew !== undefined ? input.isNew : true,
    });
  }

  static async updateProduct(
    id: string,
    input: {
      name?: string;
      description?: string;
      categoryId?: string;
      price?: number;
      stock?: number;
      images?: string[];
      specs?: Record<string, string>;
      isFeatured?: boolean;
      isNew?: boolean;
    },
  ): Promise<ShopProduct> {
    const existing = await ProductsModel.findById(id);
    if (!existing) {
      throw ApiError.notFound('Product not found');
    }

    let processedImages: string[] | undefined = undefined;
    if (input.images && Array.isArray(input.images)) {
      processedImages = [];
      const baseSlug = (input.name || existing.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      for (let i = 0; i < input.images.length; i++) {
        let img = input.images[i];
        if (img.startsWith('data:image/') || (!img.startsWith('http') && img.length > 100)) {
          try {
            img = await uploadToS3(img, `${baseSlug}-${i + 1}.jpg`, 'products');
          } catch (err) {
            console.error('S3 upload fallback:', err);
          }
        }
        processedImages.push(img);
      }
    }

    const updated = await ProductsModel.update(id, {
      ...input,
      images: processedImages,
    });

    // Also sync back to canteen_menu_items if this product is linked to a canteen item
    try {
      const canteenUpdates: string[] = [];
      const canteenVals: any[] = [];
      if (input.name !== undefined) {
        canteenUpdates.push('name = ?');
        canteenVals.push(input.name);
      }
      if (input.price !== undefined) {
        canteenUpdates.push('price = ?');
        canteenVals.push(input.price);
      }
      if (input.description !== undefined) {
        canteenUpdates.push('description = ?');
        canteenVals.push(input.description);
      }
      if (processedImages && processedImages.length > 0) {
        canteenUpdates.push('image_url = ?');
        canteenVals.push(processedImages[0]);
      }

      if (canteenUpdates.length > 0) {
        canteenVals.push(id);
        await query(`UPDATE canteen_menu_items SET ${canteenUpdates.join(', ')} WHERE id = ?`, canteenVals);
      }
    } catch (canteenSyncErr) {
      // Ignore if not a canteen item
    }

    return updated!;
  }

  static async deleteProduct(id: string): Promise<void> {
    const existing = await ProductsModel.findById(id);
    if (!existing) {
      throw ApiError.notFound('Product not found');
    }
    await ProductsModel.delete(id);
  }
}
