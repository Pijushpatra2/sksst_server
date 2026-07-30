import { generateUUID } from '@utils/tokenGenerator';
import { ApiError } from '@utils/ApiError';
import { CustomerModel } from './customers.model';
import { CanteenCustomer, PaginatedResult } from '../../../types/canteen.types';

interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  customerType: 'VIP' | 'Regular' | 'Guest';
  notes?: string;
}

interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string | null;
  customerType?: 'VIP' | 'Regular' | 'Guest';
  notes?: string | null;
  isActive?: number;
}

/**
 * Service managing devotee customer profiles.
 */
export class CustomerService {
  static async searchCustomers(filters: {
    search?: string;
    customer_type?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<CanteenCustomer>> {
    return CustomerModel.listPaginated(filters);
  }

  static async getById(id: string): Promise<CanteenCustomer> {
    const customer = await CustomerModel.findById(id);
    if (!customer) {
      throw ApiError.notFound('Customer profile not found');
    }
    return customer;
  }

  static async createCustomer(input: CreateCustomerInput): Promise<string> {
    const existing = await CustomerModel.findByPhone(input.phone);
    if (existing) {
      throw ApiError.conflict('A customer with this phone number already exists');
    }

    const id = generateUUID();
    await CustomerModel.create({
      id,
      name:          input.name,
      phone:         input.phone,
      email:         input.email,
      customer_type: input.customerType,
      notes:         input.notes,
    });

    return id;
  }

  static async updateCustomer(id: string, input: UpdateCustomerInput): Promise<void> {
    const customer = await CustomerModel.findById(id);
    if (!customer) {
      throw ApiError.notFound('Customer profile not found');
    }

    // Email check if changed
    if (input.phone && input.phone !== customer.phone) {
      const existing = await CustomerModel.findByPhone(input.phone);
      if (existing && existing.id !== id) {
        throw ApiError.conflict('A customer with this phone number already exists');
      }
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.customerType !== undefined) updateData.customer_type = input.customerType;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    await CustomerModel.update(id, updateData);
  }

  static async deleteCustomer(id: string): Promise<void> {
    const customer = await CustomerModel.findById(id);
    if (!customer) {
      throw ApiError.notFound('Customer profile not found');
    }
    await CustomerModel.deactivate(id);
  }
}
