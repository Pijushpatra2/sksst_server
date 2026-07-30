import { ApiError } from '@utils/ApiError';
import { hashPassword } from '@utils/bcrypt';
import { StaffModel } from './staff.model';

interface CreateStaffInput {
  name: string;
  email: string;
  password?: string;
  assignedRole: string;
}

interface UpdateStaffInput {
  name?: string;
  password?: string;
  assignedRole?: string;
  isActive?: number;
}

/**
 * Service managing canteen staff accounts CRUD operations (restricted to global administrators).
 */
export class StaffService {
  /**
   * List all terminal staff accounts.
   */
  static async getAllStaff() {
    return StaffModel.listAll();
  }

  /**
   * Register a new terminal staff account.
   */
  static async createStaff(input: CreateStaffInput, adminId: number): Promise<number> {
    const existing = await StaffModel.findByEmail(input.email);
    if (existing) {
      throw ApiError.conflict('A staff account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password || '');

    const staffId = await StaffModel.create({
      name:          input.name,
      email:         input.email,
      password_hash: passwordHash,
      assigned_role: input.assignedRole,
      created_by:    adminId,
    });

    return staffId;
  }

  /**
   * Update a terminal staff account.
   */
  static async updateStaff(id: number, input: UpdateStaffInput): Promise<void> {
    const staff = await StaffModel.findById(id);
    if (!staff) {
      throw ApiError.notFound('Staff account not found');
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.assignedRole !== undefined) updateData.assigned_role = input.assignedRole;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    if (input.password !== undefined) {
      updateData.password_hash = await hashPassword(input.password);
    }

    await StaffModel.update(id, updateData);
  }

  /**
   * Soft-deactivate a staff member.
   */
  static async deactivateStaff(id: number): Promise<void> {
    const staff = await StaffModel.findById(id);
    if (!staff) {
      throw ApiError.notFound('Staff account not found');
    }

    await StaffModel.deactivate(id);
  }
}
