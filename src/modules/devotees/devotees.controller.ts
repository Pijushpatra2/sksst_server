import { Request, Response } from 'express';
import { DevoteeService } from './devotees.service';

export class DevoteeController {
  /**
   * Send OTP for registration verification.
   */
  static async sendOtp(req: Request, res: Response): Promise<void> {
    const result = await DevoteeService.sendRegistrationOtp(req.body);
    res.status(200).json({
      status: 'success',
      message: result.message,
      data: {
        expiresInSeconds: result.expiresInSeconds,
        otpPreview: result.otpPreview,
      },
    });
  }

  /**
   * Register devotee endpoint with OTP verification.
   */
  static async register(req: Request, res: Response): Promise<void> {
    const result = await DevoteeService.register(req.body);
    
    // Set refresh token in HTTP-only secure cookie
    res.cookie('devotee_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(201).json({
      status: 'success',
      message: 'Devotee account registered successfully',
      data: {
        devotee: result.devotee,
        accessToken: result.accessToken,
      },
    });
  }

  /**
   * Login devotee endpoint.
   */
  static async login(req: Request, res: Response): Promise<void> {
    const result = await DevoteeService.login(req.body);

    res.cookie('devotee_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: {
        devotee: result.devotee,
        accessToken: result.accessToken,
      },
    });
  }

  /**
   * Get logged-in devotee profile endpoint.
   */
  static async me(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id;
    if (!devoteeId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized devotee session',
      });
      return;
    }

    const devotee = await DevoteeService.getProfile(devoteeId);
    res.status(200).json({
      status: 'success',
      data: {
        devotee,
      },
    });
  }

  /**
   * Update logged-in devotee profile endpoint (email is protected).
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id;
    if (!devoteeId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized devotee session',
      });
      return;
    }

    const updated = await DevoteeService.updateProfile(devoteeId, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Devotee profile updated successfully',
      data: {
        devotee: updated,
      },
    });
  }

  /**
   * Real-time pass verification for QR scan & member lookup.
   */
  static async verifyPass(req: Request, res: Response): Promise<void> {
    const membershipNumber = req.params.membershipNumber;
    if (!membershipNumber) {
      res.status(400).json({
        status: 'error',
        message: 'Membership number parameter is required',
      });
      return;
    }

    const result = await DevoteeService.verifyMemberPass(membershipNumber);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }

  /**
   * List all devotees for admin view.
   */
  static async listAll(_req: Request, res: Response): Promise<void> {
    const list = await DevoteeService.listAll();
    res.status(200).json({
      status: 'success',
      data: {
        devotees: list,
      },
    });
  }
}
