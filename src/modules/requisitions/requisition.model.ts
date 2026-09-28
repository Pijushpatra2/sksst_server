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
  static async generateRequisitionNumber(conn?: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;
    const executor = conn || pool;

    // Read existing requisition numbers with FOR UPDATE lock to prevent race conditions
    const [rows]: any = await executor.query(
      `SELECT requisition_number FROM store_requisitions WHERE requisition_number LIKE ? ORDER BY LENGTH(requisition_number) DESC, requisition_number DESC LIMIT 500 FOR UPDATE`,
      [`${prefix}%`]
    );

    let maxSeq = 0;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row && row.requisition_number) {
          const rawSuffix = String(row.requisition_number).replace(prefix, '').trim();
          const parsed = parseInt(rawSuffix, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Create a new store requisition with its items in a transaction (with auto-retry for concurrent requests)
   */
  static async create(dto: CreateRequisitionDto): Promise<StoreRequisition> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const reqId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${Math.floor(Math.random() * 10000)}`;
        const reqNumber = await this.generateRequisitionNumber(conn);

        const totalItems = dto.items.length;
        let grandTotal = 0;

        // Calculate grand total from items
        for (const item of dto.items) {
          const reqQty = Number(item.requested_qty) || 1;
          const uPrice = Number(item.unit_price) >= 0 ? Number(item.unit_price) : 0;
          const lineTotal = Number(item.total_price) >= 0 ? Number(item.total_price) : Math.round(reqQty * uPrice * 100) / 100;
          grandTotal += lineTotal;
        }

        const shopkeeperType = dto.target_shopkeeper_type || (dto.target_shopkeeper_id ? 'REGISTERED' : 'MANUAL');
        const receiptUrl = dto.receipt_url || null;
        const receiptFilename = dto.receipt_filename || null;
        const receiptUploadedBy = dto.receipt_uploaded_by || dto.requested_by_name || null;
        const receiptNotes = dto.receipt_notes || null;

        await conn.query(
          `INSERT INTO store_requisitions 
          (id, requisition_number, department, requested_by_id, requested_by_name, requested_by_role, priority, 
           target_shopkeeper_type, target_shopkeeper_id, target_shopkeeper_name, target_shopkeeper_email, target_shopkeeper_phone, target_store_name, 
           status, total_items_count, fulfilled_items_count, fulfillment_progress_pct, total_amount, requester_notes,
           receipt_url, receipt_filename, receipt_uploaded_at, receipt_uploaded_by, receipt_notes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED_TO_ADMIN', ?, 0, 0.00, ?, ?, ?, ?, ${receiptUrl ? 'NOW()' : 'NULL'}, ?, ?)`,
          [
            reqId,
            reqNumber,
            dto.department || 'CANTEEN',
            dto.requested_by_id || null,
            dto.requested_by_name,
            dto.requested_by_role || 'CANTEEN_MANAGER',
            dto.priority || 'NORMAL',
            shopkeeperType,
            dto.target_shopkeeper_id || null,
            dto.target_shopkeeper_name || null,
            dto.target_shopkeeper_email || null,
            dto.target_shopkeeper_phone || null,
            dto.target_store_name || 'Main Temple Provisions & Grocery Store',
            totalItems,
            grandTotal,
            dto.requester_notes || null,
            receiptUrl,
            receiptFilename,
            receiptUploadedBy,
            receiptNotes,
          ]
        );

        for (let i = 0; i < dto.items.length; i++) {
          const item = dto.items[i];
          const itemId = `ITEM_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 8)}`;
          const reqQty = Number(item.requested_qty) || 1;
          const uPrice = Number(item.unit_price) >= 0 ? Number(item.unit_price) : 0;
          const lineTotal = Number(item.total_price) >= 0 ? Number(item.total_price) : Math.round(reqQty * uPrice * 100) / 100;

          await conn.query(
            `INSERT INTO store_requisition_items 
            (id, requisition_id, item_name, item_code, category, unit, requested_qty, approved_qty, issued_qty, remaining_qty, unit_price, total_price, item_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, 'PENDING')`,
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
              uPrice,
              lineTotal,
            ]
          );
        }

        await conn.commit();
        conn.release();

        const created = await this.findById(reqId);
        if (!created) throw new Error('Failed to retrieve created requisition');
        return created;
      } catch (err: any) {
        await conn.rollback();
        conn.release();

        const isDuplicateKey =
          err?.code === 'ER_DUP_ENTRY' ||
          err?.errno === 1062 ||
          String(err?.message || '').includes('Duplicate entry');

        if (isDuplicateKey && attempts < maxAttempts) {
          // Wait brief delay before retrying with next sequence
          await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Failed to create store requisition due to high concurrency. Please try again.');
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
   * Admin approves requisition, adjusts quantities & prices, and assigns/confirms target shopkeeper
   */
  static async adminApprove(id: string, dto: AdminApproveRequisitionDto): Promise<StoreRequisition> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // If item updates are provided, update each approved_qty and unit_price
      if (dto.items && dto.items.length > 0) {
        for (const it of dto.items) {
          const appQty = Number(it.approved_qty) >= 0 ? Number(it.approved_qty) : 0;
          
          // Get current item to retain unit_price if not supplied
          const [curRow]: any = await conn.query('SELECT unit_price FROM store_requisition_items WHERE id = ? AND requisition_id = ?', [it.id, id]);
          const currentUnitPrice = curRow && curRow[0] ? Number(curRow[0].unit_price) : 0;
          const uPrice = it.unit_price !== undefined ? (Number(it.unit_price) >= 0 ? Number(it.unit_price) : 0) : currentUnitPrice;
          const lineTotal = Math.round(appQty * uPrice * 100) / 100;

          await conn.query(
            `UPDATE store_requisition_items 
             SET approved_qty = ?, 
                 remaining_qty = (? - issued_qty),
                 unit_price = ?,
                 total_price = ?,
                 item_status = ?,
                 updated_at = NOW()
             WHERE id = ? AND requisition_id = ?`,
            [appQty, appQty, uPrice, lineTotal, it.item_status || 'APPROVED', it.id, id]
          );
        }
      } else {
        // Default: approve all items with requested_qty and keep pricing
        await conn.query(
          `UPDATE store_requisition_items 
           SET approved_qty = requested_qty,
               remaining_qty = (requested_qty - issued_qty),
               total_price = ROUND(requested_qty * unit_price, 2),
               item_status = 'APPROVED',
               updated_at = NOW()
           WHERE requisition_id = ?`,
          [id]
        );
      }

      // Recalculate total_amount from items
      const [sumRows]: any = await conn.query(
        'SELECT COALESCE(SUM(total_price), 0) as total_sum FROM store_requisition_items WHERE requisition_id = ?',
        [id]
      );
      const recalculatedTotal = sumRows && sumRows[0] ? Number(sumRows[0].total_sum) : 0;

      // Update header
      let updateHeaderSql = `
        UPDATE store_requisitions 
        SET status = 'APPROVED_BY_ADMIN', 
            admin_id = ?, 
            admin_name = ?, 
            admin_notes = ?,
            total_amount = ?,
            approved_at = NOW(),
            updated_at = NOW()
      `;
      const updateParams: any[] = [
        dto.admin_id || null,
        dto.admin_name || 'Super Admin',
        dto.admin_notes || null,
        recalculatedTotal,
      ];

      if (dto.target_shopkeeper_type) {
        updateHeaderSql += `, target_shopkeeper_type = ?`;
        updateParams.push(dto.target_shopkeeper_type);
      }

      if (dto.target_shopkeeper_id !== undefined) {
        updateHeaderSql += `, target_shopkeeper_id = ?`;
        updateParams.push(dto.target_shopkeeper_id || null);
      }

      if (dto.target_shopkeeper_name !== undefined) {
        updateHeaderSql += `, target_shopkeeper_name = ?`;
        updateParams.push(dto.target_shopkeeper_name || null);
      }

      if (dto.target_shopkeeper_email !== undefined) {
        updateHeaderSql += `, target_shopkeeper_email = ?`;
        updateParams.push(dto.target_shopkeeper_email || null);
      }

      if (dto.target_shopkeeper_phone !== undefined) {
        updateHeaderSql += `, target_shopkeeper_phone = ?`;
        updateParams.push(dto.target_shopkeeper_phone || null);
      }

      if (dto.target_store_name !== undefined) {
        updateHeaderSql += `, target_store_name = ?`;
        updateParams.push(dto.target_store_name || 'Main Temple Provisions & Grocery Store');
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
   * Admin updates storekeeper details, quantities, prices and recalculates grand total
   */
  static async adminUpdate(id: string, dto: any): Promise<StoreRequisition> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // If items are provided, update quantities and prices
      if (dto.items && Array.isArray(dto.items)) {
        for (const it of dto.items) {
          const [curRow]: any = await conn.query('SELECT requested_qty, approved_qty, issued_qty, unit_price FROM store_requisition_items WHERE id = ? AND requisition_id = ?', [it.id, id]);
          if (curRow && curRow.length > 0) {
            const cur = curRow[0];
            const reqQty = it.requested_qty !== undefined ? Math.max(0, Number(it.requested_qty)) : Number(cur.requested_qty);
            const appQty = it.approved_qty !== undefined ? Math.max(0, Number(it.approved_qty)) : Number(cur.approved_qty);
            const issQty = Number(cur.issued_qty || 0);
            const remQty = Math.max(0, appQty - issQty);
            const uPrice = it.unit_price !== undefined ? Math.max(0, Number(it.unit_price)) : Number(cur.unit_price || 0);
            const lineTotal = Math.round(appQty * uPrice * 100) / 100;

            await conn.query(
              `UPDATE store_requisition_items
               SET requested_qty = ?,
                   approved_qty = ?,
                   remaining_qty = ?,
                   unit_price = ?,
                   total_price = ?,
                   updated_at = NOW()
               WHERE id = ? AND requisition_id = ?`,
              [reqQty, appQty, remQty, uPrice, lineTotal, it.id, id]
            );
          }
        }
      }

      // Recalculate total_amount from items
      const [sumRows]: any = await conn.query(
        'SELECT COALESCE(SUM(total_price), 0) as total_sum FROM store_requisition_items WHERE requisition_id = ?',
        [id]
      );
      const recalculatedTotal = sumRows && sumRows[0] ? Number(sumRows[0].total_sum) : 0;

      // Build header update query
      const updates: string[] = ['total_amount = ?', 'updated_at = NOW()'];
      const params: any[] = [recalculatedTotal];

      if (dto.target_shopkeeper_type !== undefined) {
        updates.push('target_shopkeeper_type = ?');
        params.push(dto.target_shopkeeper_type);
      }
      if (dto.target_shopkeeper_id !== undefined) {
        updates.push('target_shopkeeper_id = ?');
        params.push(dto.target_shopkeeper_id || null);
      }
      if (dto.target_shopkeeper_name !== undefined) {
        updates.push('target_shopkeeper_name = ?');
        params.push(dto.target_shopkeeper_name || null);
      }
      if (dto.target_shopkeeper_email !== undefined) {
        updates.push('target_shopkeeper_email = ?');
        params.push(dto.target_shopkeeper_email || null);
      }
      if (dto.target_shopkeeper_phone !== undefined) {
        updates.push('target_shopkeeper_phone = ?');
        params.push(dto.target_shopkeeper_phone || null);
      }
      if (dto.target_store_name !== undefined) {
        updates.push('target_store_name = ?');
        params.push(dto.target_store_name || null);
      }
      if (dto.admin_notes !== undefined) {
        updates.push('admin_notes = ?');
        params.push(dto.admin_notes || null);
      }
      if (dto.priority !== undefined) {
        updates.push('priority = ?');
        params.push(dto.priority);
      }
      if (dto.receipt_url !== undefined) {
        updates.push('receipt_url = ?');
        params.push(dto.receipt_url || null);
        if (dto.receipt_url) {
          updates.push('receipt_uploaded_at = NOW()');
        } else {
          updates.push('receipt_uploaded_at = NULL');
        }
      }
      if (dto.receipt_filename !== undefined) {
        updates.push('receipt_filename = ?');
        params.push(dto.receipt_filename || null);
      }
      if (dto.receipt_uploaded_by !== undefined) {
        updates.push('receipt_uploaded_by = ?');
        params.push(dto.receipt_uploaded_by || null);
      }
      if (dto.receipt_notes !== undefined) {
        updates.push('receipt_notes = ?');
        params.push(dto.receipt_notes || null);
      }

      params.push(id);
      await conn.query(`UPDATE store_requisitions SET ${updates.join(', ')} WHERE id = ?`, params);

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
   * Update or upload receipt for requisition
   */
  static async updateReceipt(
    id: string,
    data: {
      receipt_url: string | null;
      receipt_filename?: string | null;
      receipt_uploaded_by?: string | null;
      receipt_notes?: string | null;
    }
  ): Promise<StoreRequisition> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Requisition with id ${id} not found`);
    }

    if (data.receipt_url === null || data.receipt_url === '') {
      await query(
        `UPDATE store_requisitions 
         SET receipt_url = NULL, 
             receipt_filename = NULL, 
             receipt_uploaded_at = NULL, 
             receipt_uploaded_by = NULL, 
             receipt_notes = NULL,
             updated_at = NOW() 
         WHERE id = ?`,
        [id]
      );
    } else {
      await query(
        `UPDATE store_requisitions 
         SET receipt_url = ?, 
             receipt_filename = ?, 
             receipt_uploaded_at = NOW(), 
             receipt_uploaded_by = ?, 
             receipt_notes = ?,
             updated_at = NOW() 
         WHERE id = ?`,
        [
          data.receipt_url,
          data.receipt_filename || null,
          data.receipt_uploaded_by || null,
          data.receipt_notes || null,
          id,
        ]
      );
    }

    const updated = await this.findById(id);
    if (!updated) throw new Error('Failed to retrieve updated requisition');
    return updated;
  }

  /**
   * Delete / remove receipt from requisition
   */
  static async deleteReceipt(id: string): Promise<StoreRequisition> {
    return this.updateReceipt(id, { receipt_url: null });
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
