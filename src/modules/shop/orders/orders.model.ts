import { query } from '@config/db';
import { generateUUID } from '@utils/tokenGenerator';
import { ShopOrder, ShopOrderItem, ShopOrderTimelineStep } from '../../../types/shop.types';
import { ShopCustomersModel } from '../customers/customers.model';

export interface OrderDbRow {
  id: string;
  customer_id: string | null;
  devotee_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string; // JSON
  subtotal: number;
  discount: number;
  tax: number;
  shipping_fee: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  tracking_number: string | null;
  timeline: string | null; // JSON
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemDbRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  total: number;
}

export class ShopOrdersModel {
  static formatRow(row: OrderDbRow, items: ShopOrderItem[] = []): ShopOrder {
    let parsedAddress: any = { name: row.customer_name, line1: '', city: '', state: '', postalCode: '', phone: row.customer_phone };
    if (row.shipping_address) {
      try {
        parsedAddress = typeof row.shipping_address === 'string' ? JSON.parse(row.shipping_address) : row.shipping_address;
      } catch {}
    }

    let parsedTimeline: ShopOrderTimelineStep[] = [];
    if (row.timeline) {
      try {
        parsedTimeline = typeof row.timeline === 'string' ? JSON.parse(row.timeline) : row.timeline;
      } catch {}
    }

    return {
      id: row.id,
      customerId: row.customer_id,
      devoteeId: row.devotee_id,
      customerName: row.customer_name,
      customerEmail: row.customer_email,
      customerPhone: row.customer_phone,
      shippingAddress: parsedAddress,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount || 0),
      tax: Number(row.tax || 0),
      shippingFee: Number(row.shipping_fee || 0),
      total: Number(row.total),
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      status: row.status,
      trackingNumber: row.tracking_number,
      timeline: parsedTimeline,
      couponCode: row.coupon_code,
      items,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async listAll(filters?: { status?: string; search?: string }): Promise<ShopOrder[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      conditions.push('status = ?');
      values.push(filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      conditions.push('(id LIKE ? OR customer_name LIKE ? OR customer_email LIKE ? OR customer_phone LIKE ?)');
      const term = `%${filters.search.trim()}%`;
      values.push(term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM shop_orders ${whereClause} ORDER BY created_at DESC`;
    const rows = await query<OrderDbRow[]>(sql, values);

    // Fetch items for each order
    const orders: ShopOrder[] = [];
    for (const row of rows) {
      const itemRows = await query<OrderItemDbRow[]>('SELECT * FROM shop_order_items WHERE order_id = ?', [row.id]);
      const items: ShopOrderItem[] = itemRows.map((it) => ({
        id: it.id,
        orderId: it.order_id,
        productId: it.product_id,
        productName: it.product_name,
        productImage: it.product_image,
        price: Number(it.price),
        quantity: Number(it.quantity),
        total: Number(it.total),
      }));
      orders.push(this.formatRow(row, items));
    }
    return orders;
  }

  static async findById(id: string): Promise<ShopOrder | null> {
    const rows = await query<OrderDbRow[]>('SELECT * FROM shop_orders WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return null;

    const itemRows = await query<OrderItemDbRow[]>('SELECT * FROM shop_order_items WHERE order_id = ?', [id]);
    const items: ShopOrderItem[] = itemRows.map((it) => ({
      id: it.id,
      orderId: it.order_id,
      productId: it.product_id,
      productName: it.product_name,
      productImage: it.product_image,
      price: Number(it.price),
      quantity: Number(it.quantity),
      total: Number(it.total),
    }));

    return this.formatRow(rows[0], items);
  }

  static async create(orderData: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    devoteeId?: string;
    shippingAddress: {
      name: string;
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      phone: string;
    };
    subtotal: number;
    discount?: number;
    tax?: number;
    shippingFee?: number;
    total: number;
    paymentMethod: string;
    paymentStatus?: string;
    couponCode?: string;
    items: Array<{
      productId: string;
      productName: string;
      productImage?: string;
      price: number;
      quantity: number;
      total: number;
    }>;
  }): Promise<ShopOrder> {
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const initialTimeline: ShopOrderTimelineStep[] = [
      {
        status: 'PENDING',
        timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: 'Order Placed',
        description: `Order received with ${orderData.paymentMethod} payment. Processing initiated.`,
      },
    ];

    // 1. Create or update customer in shop_customers
    const customer = await ShopCustomersModel.upsertFromOrder({
      name: orderData.customerName,
      email: orderData.customerEmail,
      phone: orderData.customerPhone,
      devoteeId: orderData.devoteeId,
      orderTotal: orderData.total,
      address: `${orderData.shippingAddress.line1}, ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} - ${orderData.shippingAddress.postalCode}`,
    });

    // 2. Insert into shop_orders
    await query(
      `INSERT INTO shop_orders 
       (id, customer_id, devotee_id, customer_name, customer_email, customer_phone, 
        shipping_address, subtotal, discount, tax, shipping_fee, total, 
        payment_method, payment_status, status, timeline, coupon_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        orderId,
        customer.id,
        orderData.devoteeId || null,
        orderData.customerName,
        orderData.customerEmail,
        orderData.customerPhone,
        JSON.stringify(orderData.shippingAddress),
        orderData.subtotal,
        orderData.discount || 0,
        orderData.tax || 0,
        orderData.shippingFee || 0,
        orderData.total,
        orderData.paymentMethod,
        orderData.paymentStatus || 'PAID',
        JSON.stringify(initialTimeline),
        orderData.couponCode || null,
      ],
    );

    // 3. Insert line items and decrement stock
    for (const item of orderData.items) {
      const itemId = generateUUID();
      await query(
        `INSERT INTO shop_order_items (id, order_id, product_id, product_name, product_image, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, item.productId, item.productName, item.productImage || null, item.price, item.quantity, item.total],
      );

      // Decrement stock in shop_products
      try {
        await query('UPDATE shop_products SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.quantity, item.productId]);
      } catch (err) {
        console.error('Stock decrement error:', err);
      }
    }

    return (await this.findById(orderId))!;
  }

  static async updateStatus(
    id: string,
    status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED',
    trackingNumber?: string,
  ): Promise<ShopOrder | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const timestampStr = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let stepTitle = '';
    let stepDesc = '';

    if (status === 'SHIPPED') {
      stepTitle = 'Dispatched from Hub';
      stepDesc = `Package forwarded via courier. Tracking ID: ${trackingNumber || 'Assigned'}.`;
    } else if (status === 'DELIVERED') {
      stepTitle = 'Delivered';
      stepDesc = 'Courier confirmed package delivery and receipt by devotee.';
    } else if (status === 'PROCESSING') {
      stepTitle = 'Processing & Packing';
      stepDesc = 'Order packed at temple workshop and prepared for dispatch.';
    } else if (status === 'CANCELLED') {
      stepTitle = 'Order Cancelled';
      stepDesc = 'Order was cancelled and refund/credit processed.';
    } else {
      stepTitle = 'Order Verified';
      stepDesc = 'Order payment confirmed and added to fulfillment queue.';
    }

    const newTimeline = [...existing.timeline];
    if (existing.status !== status) {
      newTimeline.push({
        status,
        timestamp: timestampStr,
        title: stepTitle,
        description: stepDesc,
      });
    }

    await query(
      `UPDATE shop_orders 
       SET status = ?, tracking_number = COALESCE(?, tracking_number), timeline = ?
       WHERE id = ?`,
      [status, trackingNumber || null, JSON.stringify(newTimeline), id],
    );

    return this.findById(id);
  }
}
