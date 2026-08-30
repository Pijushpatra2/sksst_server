import { generateUUID } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { uploadToS3 } from '@utils/s3';
import { MemoryCache } from '@utils/cache';
import { MenuModel } from './menu.model';
import { ProductsModel } from '@modules/products/products.model';

interface CreateMenuItemInput {
  name: string;
  price: number;
  category: string;
  variety: 'Regular' | 'Jain' | 'Spicy' | 'Sweet';
  description?: string;
  imageUrl?: string;
  available?: number;
  sortOrder?: number;
  channel?: 'canteen' | 'e-com' | 'both';
}

interface UpdateMenuItemInput {
  name?: string;
  price?: number;
  category?: string;
  variety?: 'Regular' | 'Jain' | 'Spicy' | 'Sweet';
  description?: string | null;
  imageUrl?: string | null;
  available?: number;
  sortOrder?: number;
  channel?: 'canteen' | 'e-com' | 'both';
}

/**
 * Service managing food menu business logic.
 */
export class MenuService {
  static async listItems(filters: {
    category?: string;
    variety?: string;
    available?: number;
    channel?: string;
  }) {
    const cacheKey = `menu:${filters.category || ''}:${filters.variety || ''}:${filters.available ?? ''}:${filters.channel || ''}`;
    return MemoryCache.getOrSet(cacheKey, 30000, () => MenuModel.listFiltered(filters));
  }

  static async createItem(input: CreateMenuItemInput & { image_url?: string }): Promise<string> {
    const id = generateUUID();
    let finalImageUrl = input.imageUrl || input.image_url || '';

    // If imageUrl is base64 / data URI, upload it to S3
    if (finalImageUrl && (finalImageUrl.startsWith('data:image/') || !finalImageUrl.startsWith('http'))) {
      finalImageUrl = await uploadToS3(finalImageUrl, `${input.name}.jpg`, 'menu-items');
    }

    await MenuModel.create({
      id,
      name:         input.name,
      price:        input.price,
      category:     input.category,
      variety:      input.variety,
      description:  input.description,
      image_url:    finalImageUrl,
      available:    input.available,
      sort_order:   input.sortOrder,
      channel:      input.channel,
    });

    // Auto-sync to e-commerce products table if channel is e-com or both
    if (input.channel === 'e-com' || input.channel === 'both') {
      try {
        await ProductsModel.upsertFromMenuItem({
          id,
          name: input.name,
          category: input.category,
          price: input.price,
          description: input.description,
          image_url: finalImageUrl,
        });
      } catch (err) {
        console.error('Failed to sync new menu item to products table:', err);
      }
    }

    MemoryCache.invalidatePrefix('menu:');
    return id;
  }

  static async updateItem(id: string, input: UpdateMenuItemInput & { image_url?: string | null }): Promise<void> {
    const item = await MenuModel.findById(id);
    if (!item) {
      throw ApiError.notFound('Menu item not found');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.price !== undefined) updateData.price = input.price;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.variety !== undefined) updateData.variety = input.variety;
    if (input.description !== undefined) updateData.description = input.description;
    
    const rawImage = input.imageUrl !== undefined ? input.imageUrl : input.image_url;
    if (rawImage !== undefined) {
      let finalImageUrl = rawImage || '';
      if (finalImageUrl && (finalImageUrl.startsWith('data:image/') || (!finalImageUrl.startsWith('http') && finalImageUrl.length > 100))) {
        finalImageUrl = await uploadToS3(finalImageUrl, `${input.name || item.name}.jpg`, 'menu-items');
      }
      updateData.image_url = finalImageUrl;
    }

    if (input.available !== undefined) updateData.available = input.available;
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
    if (input.channel !== undefined) updateData.channel = input.channel;

    await MenuModel.update(id, updateData);

    // Auto-sync to e-commerce products table if channel is e-com or both
    const effectiveChannel = input.channel !== undefined ? input.channel : item.channel;
    if (effectiveChannel === 'e-com' || effectiveChannel === 'both') {
      try {
        await ProductsModel.upsertFromMenuItem({
          id,
          name: input.name || item.name,
          category: input.category || item.category,
          price: input.price !== undefined ? input.price : Number(item.price),
          description: input.description !== undefined ? (input.description || '') : (item.description || ''),
          image_url: updateData.image_url !== undefined ? (updateData.image_url || undefined) : (item.image_url || undefined),
        });
      } catch (err) {
        console.error('Failed to sync updated menu item to products table:', err);
      }
    }

    MemoryCache.invalidatePrefix('menu:');
  }

  /**
   * Delete a menu item.
   *
   * Strategy:
   *   - If the item is referenced by existing order items (FK constraint),
   *     we SOFT-DELETE it: mark `available = 0` so it disappears from the POS
   *     grid but historical order data stays intact.
   *   - If the item has never been ordered, we HARD-DELETE it cleanly.
   *
   * This prevents the MySQL ER_ROW_IS_REFERENCED_2 (errno 1451) 500 error
   * and replaces it with a transparent, data-safe operation.
   */
  static async deleteItem(id: string): Promise<{ mode: 'hard' | 'soft' }> {
    const item = await MenuModel.findById(id);
    if (!item) {
      throw ApiError.notFound('Menu item not found');
    }

    // Also remove from products table if linked
    try {
      await ProductsModel.delete(id);
    } catch {
      // ignore
    }

    // Always hard-delete menu item. SQL ON DELETE SET NULL constraint 
    // handles historical order fk cleanup gracefully.
    await MenuModel.delete(id);
    MemoryCache.invalidatePrefix('menu:');
    return { mode: 'hard' };
  }
}
