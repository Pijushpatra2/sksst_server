import { pool, query } from '@config/db';
import {
  StoreRequisition,
  StoreRequisitionItem,
  CreateRequisitionDto,
  AdminApproveRequisitionDto,
  ShopkeeperFulfillDto,
  RequisitionStats
} from '../../types/requisition.types';

export class RequisitionModel {
  /**
   * Generate next sequential requisition code (e.g., REQ-2026-0001)
   */
  static async generateRequisitionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;
    const rows = await query<any[]>(
      'SELECT requisition_number FROM store_requisitions WHERE requisition_number LIKE ? ORDER BY created_at DESC LIMIT 1',
      [`${prefix}%`]
    );

    if (rows.length === 0) {
      return `${prefix}0001`;
    }

    const lastNum = rows[0].requisition_number.replace(prefix, '');
    const nextSeq = parseInt(lastNum, 10) + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Create a new store requisition with its items in a transaction
   */
  static async create(dto: CreateRequisitionDto): Promise<StoreRequisition> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const reqId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const reqNumber = await this.generateRequisitionNumber();

      const totalItems = dto.items.length;

      await conn.query(
        `INSERT INTO store_requisitions 
        (id, requisition_number, department, requested_by_id, requested_by_name, requested_by_role, priority, target_shopkeeper_id, target_shopkeeper_name, target_store_name, status, total_items_count, fulfilled_items_count, fulfillment_progress_pct, requester_notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED_TO_ADMIN', ?, 0, 0.00, ?)`,
        [
          reqId,
          reqNumber,
          dto.department || 'CANTEEN',
          dto.requested_by_id || null,
          dto.requested_by_name,
          dto.requested_by_role || 'CANTEEN_MANAGER',
          dto.priority || 'NORMAL',
          dto.target_shopkeeper_id || null,
          dto.target_shopkeeper_name || null,
          dto.target_store_name || 'Main Temple Provisions & Grocery Store',
          totalItems,
          dto.requester_notes || null,
        ]
      );

      for (const item of dto.items) {
        const itemId = `ITEM_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const reqQty = Number(item.requested_qty) || 1;
        await conn.query(
          `INSERT INTO store_requisition_items 
          (id, requisition_id, item_name, item_code, category, unit, requested_qty, approved_qty, issued_qty, remaining_qty, item_status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'PENDING')`,
          [
            itemId,
            reqId,
            item.item_name,
            item.item_code || null,
            item.category || 'General Grocery',
            item.unit || 'kg',
            reqQty,
            reqQty, // Default approved = requested until admin modifies
            reqQty, // Initial remaining = requested
          ]
        );
      }

      await conn.commit();
      conn.release();

      return (await this.findById(reqId))!;
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  }

  /**
   * Find requisition by ID with all items
   */
  static async findById(id: string): Promise<StoreRequisition | null> {
    const reqRows = await query<StoreRequisition[]>(
      'SELECT * FROM store_requisitions WHERE id = ? LIMIT 1',
      [id]
    );

    if (reqRows.length === 0) return null;
    const req = reqRows[0];

    const items = await query<StoreRequisitionItem[]>(
      'SELECT * FROM store_requisition_items WHERE requisition_id = ? ORDER BY created_at ASC',
      [id]
    );

    req.items = items;
    return req;
  }

  /**
   * List requisitions with flexible filters
   */
  static async list(filters: {
    status?: string;
    department?: string;
    target_shopkeeper_id?: string;
    requested_by_id?: string;
    search?: string;
  }): Promise<StoreRequisition[]> {
    let sql = 'SELECT * FROM store_requisitions WHERE 1=1';
    const params: any[] = [];

    if (filters.status && filters.status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.department && filters.department !== 'ALL') {
      sql += ' AND department = ?';
      params.push(filters.department);
    }

    if (filters.target_shopkeeper_id) {
      sql += ' AND target_shopkeeper_id = ?';
      params.push(filters.target_shopkeeper_id);
    }

    if (filters.requested_by_id) {
      sql += ' AND requested_by_id = ?';
      params.push(filters.requested_by_id);
    }

    if (filters.search) {
      sql += ' AND (requisition_number LIKE ? OR requested_by_name LIKE ? OR target_shopkeeper_name LIKE ? OR target_store_name LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY created_at DESC';

    const requisitions = await query<StoreRequisition[]>(sql, params);

    // Fetch items for each requisition in batch
    if (requisitions.length > 0) {
      const ids = requisitions.map((r) => r.id);
      const placeholders = ids.map(() => '?').join(',');
      const allItems = await query<StoreRequisitionItem[]>(
        `SELECT * FROM store_requisition_items WHERE requisition_id IN (${placeholders}) ORDER BY created_at ASC`,
        ids
      );

      const itemMap = new Map<string, StoreRequisitionItem[]>();
      for (const it of allItems) {
        if (!itemMap.has(it.requisition_id)) {
          itemMap.set(it.requisition_id, []);
        }
        itemMap.get(it.requisition_id)!.push(it);
      }

      for (const req of requisitions) {
        req.items = itemMap.get(req.id) || [];
      }
    }

    return requisitions;
  }

  /**
   * Admin approves requisition, adjusts quantities, and assigns/confirms target shopkeeper
   */
  static async adminApprove(id: string, dto: AdminApproveRequisitionDto): Promise<StoreRequisition> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // If item updates are provided, update each approved_qty
      if (dto.items && dto.items.length > 0) {
        for (const it of dto.items) {
          const appQty = Number(it.approved_qty) >= 0 ? Number(it.approved_qty) : 0;
          await conn.query(
            `UPDATE store_requisition_items 
             SET approved_qty = ?, 
                 remaining_qty = (? - issued_qty),
                 item_status = ?,
                 updated_at = NOW()
             WHERE id = ? AND requisition_id = ?`,
            [appQty, appQty, it.item_status || 'APPROVED', it.id, id]
          );
        }
      } else {
        // Default: approve all items with requested_qty
        await conn.query(
          `UPDATE store_requisition_items 
           SET approved_qty = requested_qty,
               remaining_qty = (requested_qty - issued_qty),
               item_status = 'APPROVED',
               updated_at = NOW()
           WHERE requisition_id = ?`,
          [id]
        );
      }

      // Update header
      let updateHeaderSql = `
        UPDATE store_requisitions 
        SET status = 'APPROVED_BY_ADMIN', 
            admin_id = ?, 
            admin_name = ?, 
            admin_notes = ?,
            approved_at = NOW(),
            updated_at = NOW()
      `;
      const updateParams: any[] = [
        dto.admin_id || null,
        dto.admin_name || 'Super Admin',
        dto.admin_notes || null,
      ];

      if (dto.target_shopkeeper_id) {
        updateHeaderSql += `, target_shopkeeper_id = ?, target_shopkeeper_name = ?, target_store_name = ?`;
        updateParams.push(
          dto.target_shopkeeper_id,
          dto.target_shopkeeper_name || 'Assigned Shopkeeper',
          dto.target_store_name || 'Main Temple Provisions & Grocery Store'
        );
      }

      updateHeaderSql += ` WHERE id = ?`;
      updateParams.push(id);

      await conn.query(updateHeaderSql, updateParams);

      await conn.commit();
      conn.release();

      return (await this.findById(id))!;
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  }

  /**
   * Admin rejects requisition
   */
  static async adminReject(id: string, reason: string, adminName: string = 'Super Admin'): Promise<StoreRequisition> {
    await query(
      `UPDATE store_requisitions 
       SET status = 'REJECTED_BY_ADMIN', 
           admin_name = ?, 
           admin_notes = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [adminName, reason, id]
    );

    return (await this.findById(id))!;
  }

  /**
   * Shopkeeper fulfills items, inputs issued_qty, system auto-calculates remaining_qty
   */
  static async shopkeeperFulfill(id: string, dto: ShopkeeperFulfillDto): Promise<StoreRequisition> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      let fulfilledCount = 0;
      let totalApprovedQtySum = 0;
      let totalIssuedQtySum = 0;

      // Update each item line
      for (const it of dto.items) {
        const issuedQty = Number(it.issued_qty) >= 0 ? Number(it.issued_qty) : 0;

        // Fetch current item's approved quantity
        const [currItemRows]: any = await conn.query(
          'SELECT approved_qty, issued_qty FROM store_requisition_items WHERE id = ? AND requisition_id = ?',
          [it.id, id]
        );

        if (currItemRows.length > 0) {
          const appQty = Number(currItemRows[0].approved_qty);
          const remQty = Math.max(0, appQty - issuedQty);
          let itemStatus = 'PARTIAL';
          if (issuedQty >= appQty && appQty > 0) {
            itemStatus = 'FULFILLED';
            fulfilledCount++;
          } else if (issuedQty === 0) {
            itemStatus = 'OUT_OF_STOCK';
          }

          totalApprovedQtySum += appQty;
          totalIssuedQtySum += issuedQty;

          await conn.query(
            `UPDATE store_requisition_items 
             SET issued_qty = ?, 
                 remaining_qty = ?, 
                 item_status = ?, 
                 shopkeeper_remarks = ?, 
                 updated_at = NOW() 
             WHERE id = ? AND requisition_id = ?`,
            [issuedQty, remQty, itemStatus, it.shopkeeper_remarks || null, it.id, id]
          );
        }
      }

      // Check all items to determine overall requisition status
      const [allItemRows]: any = await conn.query(
        'SELECT approved_qty, issued_qty, remaining_qty FROM store_requisition_items WHERE requisition_id = ?',
        [id]
      );

      const totalItems = allItemRows.length;
      let allFulfilled = true;
      let fullItemsCount = 0;

      for (const row of allItemRows) {
        const app = Number(row.approved_qty);
        const rem = Number(row.remaining_qty);

        if (rem > 0 || app === 0) {
          allFulfilled = false;
        } else {
          fullItemsCount++;
        }
      }

      let overallStatus = 'PARTIALLY_FULFILLED';
      if (allFulfilled && totalItems > 0) {
        overallStatus = 'COMPLETED';
      }

      const progressPct =
        totalApprovedQtySum > 0
          ? Math.min(100, Math.round((totalIssuedQtySum / totalApprovedQtySum) * 100))
          : 0;

      await conn.query(
        `UPDATE store_requisitions 
         SET status = ?, 
             fulfilled_items_count = ?, 
             fulfillment_progress_pct = ?, 
             shopkeeper_notes = ?, 
             dispatched_at = NOW(), 
             updated_at = NOW() 
         WHERE id = ?`,
        [overallStatus, fullItemsCount, progressPct, dto.shopkeeper_notes || null, id]
      );

      await conn.commit();
      conn.release();

      return (await this.findById(id))!;
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  }

  /**
   * Get requisition metrics and counts
   */
  static async getStats(targetShopkeeperId?: string): Promise<RequisitionStats> {
    let sql = 'SELECT status, COUNT(*) as count FROM store_requisitions';
    const params: any[] = [];

    if (targetShopkeeperId) {
      sql += ' WHERE target_shopkeeper_id = ?';
      params.push(targetShopkeeperId);
    }

    sql += ' GROUP BY status';

    const rows = await query<any[]>(sql, params);

    const stats: RequisitionStats = {
      totalRequisitions: 0,
      pendingAdminApproval: 0,
      approvedPendingShopkeeper: 0,
      partiallyFulfilled: 0,
      completed: 0,
    };

    for (const r of rows) {
      const count = Number(r.count);
      stats.totalRequisitions += count;
      if (r.status === 'SUBMITTED_TO_ADMIN') stats.pendingAdminApproval = count;
      else if (r.status === 'APPROVED_BY_ADMIN') stats.approvedPendingShopkeeper = count;
      else if (r.status === 'PARTIALLY_FULFILLED') stats.partiallyFulfilled = count;
      else if (r.status === 'COMPLETED') stats.completed = count;
    }

    return stats;
  }
}
