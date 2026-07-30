import { Response } from 'express';
import { PaginationMeta } from '../types/canteen.types';

/**
 * Standard JSON response envelope for all API endpoints.
 * Ensures consistent shape: { success, message, data?, meta?, errors? }
 */
export class ApiResponse {
  /**
   * Send a 200 OK response.
   */
  static ok<T>(
    res: Response,
    data: T,
    message = 'Success',
    meta?: PaginationMeta,
  ): Response {
    return res.status(200).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  /**
   * Send a 201 Created response.
   */
  static created<T>(
    res: Response,
    data: T,
    message = 'Created successfully',
  ): Response {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a 204 No Content response (used for DELETE).
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send a custom status response.
   */
  static send<T>(
    res: Response,
    statusCode: number,
    data: T,
    message: string,
  ): Response {
    return res.status(statusCode).json({
      success: statusCode < 400,
      message,
      data,
    });
  }
}
