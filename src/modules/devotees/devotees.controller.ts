import { Request, Response } from 'express';
import { DevoteeService } from './devotees.service';

export class DevoteeController {
  /**
   * Register devotee endpoint.
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
    // req.devotee contains validated token payload
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
}
