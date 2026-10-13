import { pool } from '@config/db';
import { CmsPage, CmsGalleryItem, CmsPageBundle } from './cms.types';

export class CmsService {
  /**
   * Retrieves page metadata and a map of all active sections keyed by section_key.
   */
  static async getPageBundle(slug: string): Promise<CmsPageBundle> {
    let [pageRows]: any = await pool.query(
      'SELECT * FROM cms_pages WHERE page_slug = ? LIMIT 1',
      [slug]
    );

    let page: CmsPage;
    if (!pageRows || pageRows.length === 0) {
      const pageId = `page-${slug}`;
      const title = slug.charAt(0).toUpperCase() + slug.slice(1) + ' Page';
      await pool.query(
        'INSERT IGNORE INTO cms_pages (id, page_slug, page_title, is_published, updated_by) VALUES (?, ?, ?, 1, "SYSTEM")',
        [pageId, slug, title]
      );
      const [newRows]: any = await pool.query(
        'SELECT * FROM cms_pages WHERE page_slug = ? LIMIT 1',
        [slug]
      );
      page = newRows && newRows.length > 0 ? newRows[0] : {
        id: pageId,
        page_slug: slug,
        page_title: title,
        meta_title: null,
        meta_description: null,
        is_published: 1,
        updated_by: 'SYSTEM',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else {
      page = pageRows[0];
    }

    const [sectionRows]: any = await pool.query(
      'SELECT * FROM cms_page_sections WHERE page_slug = ? AND is_active = 1',
      [slug]
    );

    const sections: Record<string, any> = {};
    for (const row of sectionRows) {
      let parsed = row.content_json;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch (_) {}
      }
      sections[row.section_key] = parsed;
    }

    return { page, sections };
  }

  /**
   * Returns list of all managed CMS pages.
   */
  static async getAllPages(): Promise<CmsPage[]> {
    const [rows]: any = await pool.query(
      'SELECT * FROM cms_pages ORDER BY created_at ASC'
    );
    return rows;
  }

  /**
   * Atomically upserts content for a specific section on a page.
   */
  static async upsertSection(
    slug: string,
    sectionKey: string,
    sectionTitle: string | null,
    contentJson: any,
    updatedBy?: string
  ): Promise<any> {
    const pageId = `page-${slug}`;
    const pageTitle = slug.charAt(0).toUpperCase() + slug.slice(1) + ' Page';
    await pool.query(
      'INSERT IGNORE INTO cms_pages (id, page_slug, page_title, is_published, updated_by) VALUES (?, ?, ?, 1, ?)',
      [pageId, slug, pageTitle, updatedBy || 'SUPER_ADMIN']
    );

    const sectionId = `sec-${slug}-${sectionKey}`;
    const stringified = typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson);

    await pool.query(
      `
      INSERT INTO cms_page_sections (id, page_slug, section_key, section_title, content_json, is_active, updated_by)
      VALUES (?, ?, ?, ?, ?, 1, ?)
      ON DUPLICATE KEY UPDATE 
        section_title = COALESCE(VALUES(section_title), section_title),
        content_json = VALUES(content_json),
        is_active = 1,
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP;
      `,
      [sectionId, slug, sectionKey, sectionTitle, stringified, updatedBy || 'SUPER_ADMIN']
    );

    const [rows]: any = await pool.query(
      'SELECT * FROM cms_page_sections WHERE page_slug = ? AND section_key = ? LIMIT 1',
      [slug, sectionKey]
    );

    if (rows.length > 0) {
      let parsed = rows[0].content_json;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch (_) {}
      }
      return { ...rows[0], content_json: parsed };
    }
    return null;
  }

  /**
   * Updates page meta information (SEO title, description).
   */
  static async updatePageMeta(
    slug: string,
    metaTitle?: string | null,
    metaDescription?: string | null,
    updatedBy?: string
  ): Promise<void> {
    await pool.query(
      `
      UPDATE cms_pages 
      SET 
        meta_title = COALESCE(?, meta_title),
        meta_description = COALESCE(?, meta_description),
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE page_slug = ?
      `,
      [metaTitle || null, metaDescription || null, updatedBy || 'SUPER_ADMIN', slug]
    );
  }

  /**
   * Retrieves gallery media items with optional category filtering.
   */
  static async getGalleryItems(category?: string, publishedOnly = true): Promise<CmsGalleryItem[]> {
    let sql = 'SELECT * FROM cms_gallery_items WHERE 1=1';
    const params: any[] = [];

    if (publishedOnly) {
      sql += ' AND is_published = 1';
    }

    if (category && category !== 'All') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY display_order ASC, created_at DESC';

    const [rows]: any = await pool.query(sql, params);
    return rows;
  }

  /**
   * Creates a new gallery photo item.
   */
  static async createGalleryItem(data: {
    title: string;
    category: string;
    imageUrl: string;
    capturedDate?: string;
    displayOrder?: number;
  }): Promise<CmsGalleryItem> {
    const id = `gal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const order = data.displayOrder ?? 0;

    await pool.query(
      `
      INSERT INTO cms_gallery_items (id, title, category, image_url, captured_date, display_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      `,
      [id, data.title, data.category, data.imageUrl, data.capturedDate || null, order]
    );

    const [rows]: any = await pool.query('SELECT * FROM cms_gallery_items WHERE id = ?', [id]);
    return rows[0];
  }

  /**
   * Updates an existing gallery item.
   */
  static async updateGalleryItem(id: string, updates: Partial<CmsGalleryItem>): Promise<CmsGalleryItem | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      params.push(updates.category);
    }
    if (updates.image_url !== undefined) {
      fields.push('image_url = ?');
      params.push(updates.image_url);
    }
    if (updates.captured_date !== undefined) {
      fields.push('captured_date = ?');
      params.push(updates.captured_date);
    }
    if (updates.display_order !== undefined) {
      fields.push('display_order = ?');
      params.push(updates.display_order);
    }
    if (updates.is_published !== undefined) {
      fields.push('is_published = ?');
      params.push(updates.is_published);
    }

    if (fields.length === 0) {
      const [rows]: any = await pool.query('SELECT * FROM cms_gallery_items WHERE id = ?', [id]);
      return rows[0] || null;
    }

    params.push(id);
    await pool.query(`UPDATE cms_gallery_items SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);

    const [rows]: any = await pool.query('SELECT * FROM cms_gallery_items WHERE id = ?', [id]);
    return rows[0] || null;
  }

  /**
   * Deletes a gallery photo item.
   */
  static async deleteGalleryItem(id: string): Promise<boolean> {
    const [result]: any = await pool.query('DELETE FROM cms_gallery_items WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}
