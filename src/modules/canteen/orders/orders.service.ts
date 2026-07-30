import { generateUUID, generateTokenNumber } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { OrderModel } from './orders.model';
import { CustomerModel } from '../customers/customers.model';
import { TableModel } from '../tables/tables.model';

interface CreateOrderInput {
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  tableId?: string | null;
  tableName: string;
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'PENDING';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  orderStatus: 'NEW' | 'PREPARING' | 'READY_TO_SERVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  items: Array<{
    menuItemId: string;
    itemName: string;
    itemPrice: number;
    quantity: number;
    lineTotal: number;
    cookingNotes?: string | null;
  }>;
}

/**
 * Service managing order lifecycles and business workflows.
 */
export class OrderService {
  /**
   * List orders.
   */
  static async listOrders(filters: {
    status?: string;
    table_id?: string;
    date?: string;
  }) {
    const orders = await OrderModel.listFiltered(filters);
    return Promise.all(
      orders.map(async (order) => {
        const items = await OrderModel.findItemsByOrderId(order.id);
        return {
          ...order,
          items,
        };
      })
    );
  }

  /**
   * Fetch a single order with items.
   */
  static async getOrderDetails(id: string) {
    const order = await OrderModel.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const items = await OrderModel.findItemsByOrderId(id);

    return {
      ...order,
      items,
    };
  }

  /**
   * Create a new order, calculate totals, and update linked structures.
   */
  static async createOrder(input: CreateOrderInput, staffId: number | null): Promise<string> {
    const orderId = generateUUID();
    const tokenNumber = generateTokenNumber();

    // 1. Enforce table checks if applicable
    if (input.tableId) {
      const table = await TableModel.findById(input.tableId);
      if (!table) {
        throw ApiError.notFound('Table not found');
      }
      if (table.status === 'OCCUPIED' && input.orderStatus === 'NEW') {
        throw ApiError.conflict(`Table "${table.name}" is already occupied`);
      }
    }

    // 2. Perform atomic database write
    const itemsData = input.items.map((i) => ({
      menu_item_id:  i.menuItemId,
      item_name:     i.itemName,
      item_price:    i.itemPrice,
      quantity:      i.quantity,
      line_total:    i.lineTotal,
      cooking_notes: i.cookingNotes,
    }));

    await OrderModel.createOrder(
      {
        id:              orderId,
        token_number:    tokenNumber,
        customer_id:     input.customerId,
        customer_name:   input.customerName,
        customer_phone:  input.customerPhone,
        table_id:        input.tableId,
        table_name:      input.tableName,
        served_by:       staffId,
        subtotal:        input.subtotal,
        tax_amount:      input.taxAmount,
        service_charge:  input.serviceCharge,
        discount_amount: input.discountAmount,
        total_amount:    input.totalAmount,
        payment_method:  input.paymentMethod,
        payment_status:  input.paymentStatus,
        order_status:    input.orderStatus,
        notes:           input.notes,
      },
      itemsData,
    );

    // 3. Asynchronously update customer profile analytics if devotee customer logged in
    if (input.customerId && input.paymentStatus === 'PAID') {
      CustomerModel.findById(input.customerId)
        .then(async (customer) => {
          if (customer) {
            await CustomerModel.update(customer.id, {
              total_orders: customer.total_orders + 1,
              total_visits: customer.total_visits + 1,
              total_spent:  Number(customer.total_spent) + Number(input.totalAmount),
              last_visit:   new Date(),
            });
          }
        })
        .catch((err) => console.error('Failed to update customer stats after order:', err));
    }

    return orderId;
  }

  /**
   * Update order status.
   */
  static async updateStatus(id: string, status: string): Promise<void> {
    const order = await OrderModel.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    await OrderModel.updateStatus(id, status);

    // If order completes, flush table occupancy bill to 0 and set AVAILABLE
    if (status === 'COMPLETED' && order.table_id) {
      await TableModel.update(order.table_id, {
        status:         'AVAILABLE',
        current_bill:   0.00,
        occupied_since: null,
      });
    }
  }

  /**
   * Record order payment.
   */
  static async recordPayment(
    id: string,
    input: {
      paymentMethod: string;
      paymentStatus: string;
    },
  ): Promise<void> {
    const order = await OrderModel.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    await OrderModel.recordPayment(id, {
      payment_method: input.paymentMethod,
      payment_status: input.paymentStatus,
    });

    // Asynchronously update customer stats on payment completion
    if (order.customer_id && input.paymentStatus === 'PAID') {
      CustomerModel.findById(order.customer_id)
        .then(async (customer) => {
          if (customer) {
            await CustomerModel.update(customer.id, {
              total_orders: customer.total_orders + 1,
              total_visits: customer.total_visits + 1,
              total_spent:  Number(customer.total_spent) + Number(order.total_amount),
              last_visit:   new Date(),
            });
          }
        })
        .catch((err) => console.error('Failed to update customer stats after payment:', err));
    }
  }

  /**
   * Cancel an order.
   */
  static async cancelOrder(id: string): Promise<void> {
    const order = await OrderModel.findById(id);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    await OrderModel.cancelOrder(id);
  }

  /**
   * Fetch kitchen display queue.
   */
  static async getKitchenQueue() {
    return OrderModel.getKitchenQueue();
  }
}
