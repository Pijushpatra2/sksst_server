import { Request, Response } from 'express';
import { TempleBookingsService } from './templeBookings.service';

export class TempleBookingsController {
  // ==========================================
  // 1. HALLS CONTROLLERS
  // ==========================================
  static async listHalls(req: Request, res: Response): Promise<void> {
    const onlyActive = req.query.all !== 'true';
    const halls = await TempleBookingsService.listHalls(onlyActive);
    res.status(200).json({
      status: 'success',
      data: { halls },
    });
  }

  static async getHall(req: Request, res: Response): Promise<void> {
    const hall = await TempleBookingsService.getHall(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { hall },
    });
  }

  static async createHall(req: Request, res: Response): Promise<void> {
    const hall = await TempleBookingsService.createHall(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Temple hall created successfully',
      data: { hall },
    });
  }

  static async updateHall(req: Request, res: Response): Promise<void> {
    const hall = await TempleBookingsService.updateHall(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Temple hall updated successfully',
      data: { hall },
    });
  }

  static async deleteHall(req: Request, res: Response): Promise<void> {
    await TempleBookingsService.deleteHall(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Temple hall removed successfully',
    });
  }

  // ==========================================
  // 2. HALL BOOKINGS CONTROLLERS
  // ==========================================
  static async createHallBooking(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id || req.body.devotee_id;
    const booking = await TempleBookingsService.createHallBooking(req.body, devoteeId);
    res.status(201).json({
      status: 'success',
      message: 'Hall booking request received and reserved successfully',
      data: { booking },
    });
  }

  static async listAllHallBookings(_req: Request, res: Response): Promise<void> {
    const bookings = await TempleBookingsService.listAllHallBookings();
    res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  }

  static async listMyHallBookings(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id || (req.query.devotee_id as string);
    const email = req.devotee?.email || (req.query.email as string);
    const phone = req.devotee?.phone || (req.query.phone as string);

    if (!devoteeId && !email && !phone) {
      res.status(400).json({
        status: 'error',
        message: 'Devotee identifier is required',
      });
      return;
    }
    const bookings = await TempleBookingsService.listMyHallBookings({ devoteeId, email, phone });
    res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  }

  static async updateHallBookingStatus(req: Request, res: Response): Promise<void> {
    const { status, payment_status } = req.body;
    const booking = await TempleBookingsService.updateHallBookingStatus(
      req.params.id,
      status,
      payment_status,
    );
    res.status(200).json({
      status: 'success',
      message: 'Hall booking status updated successfully',
      data: { booking },
    });
  }

  // ==========================================
  // 3. DARSHAN SLOTS CONTROLLERS
  // ==========================================
  static async listDarshanSlots(req: Request, res: Response): Promise<void> {
    const onlyActive = req.query.all !== 'true';
    const slots = await TempleBookingsService.listDarshanSlots(onlyActive);
    res.status(200).json({
      status: 'success',
      data: { slots },
    });
  }

  static async getDarshanSlot(req: Request, res: Response): Promise<void> {
    const slot = await TempleBookingsService.getDarshanSlot(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { slot },
    });
  }

  static async createDarshanSlot(req: Request, res: Response): Promise<void> {
    const slot = await TempleBookingsService.createDarshanSlot(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Darshan slot created successfully',
      data: { slot },
    });
  }

  static async updateDarshanSlot(req: Request, res: Response): Promise<void> {
    const slot = await TempleBookingsService.updateDarshanSlot(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Darshan slot updated successfully',
      data: { slot },
    });
  }

  static async deleteDarshanSlot(req: Request, res: Response): Promise<void> {
    await TempleBookingsService.deleteDarshanSlot(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Darshan slot deleted successfully',
    });
  }

  // ==========================================
  // 4. DARSHAN BOOKINGS CONTROLLERS
  // ==========================================
  static async createDarshanBooking(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id || req.body.devotee_id;
    const booking = await TempleBookingsService.createDarshanBooking(req.body, devoteeId);
    res.status(201).json({
      status: 'success',
      message: 'Darshan pass generated successfully',
      data: { booking },
    });
  }

  static async listAllDarshanBookings(_req: Request, res: Response): Promise<void> {
    const bookings = await TempleBookingsService.listAllDarshanBookings();
    res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  }

  static async listMyDarshanBookings(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id || (req.query.devotee_id as string);
    const email = req.devotee?.email || (req.query.email as string);
    const phone = req.devotee?.phone || (req.query.phone as string);

    if (!devoteeId && !email && !phone) {
      res.status(400).json({
        status: 'error',
        message: 'Devotee identifier is required',
      });
      return;
    }
    const bookings = await TempleBookingsService.listMyDarshanBookings({ devoteeId, email, phone });
    res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  }

  static async updateDarshanBookingStatus(req: Request, res: Response): Promise<void> {
    const { status } = req.body;
    const booking = await TempleBookingsService.updateDarshanBookingStatus(req.params.id, status);
    res.status(200).json({
      status: 'success',
      message: 'Darshan pass status updated successfully',
      data: { booking },
    });
  }

  // ==========================================
  // 5. PUJAS CONTROLLERS
  // ==========================================
  static async listPujas(req: Request, res: Response): Promise<void> {
    const onlyActive = req.query.all !== 'true';
    const pujas = await TempleBookingsService.listPujas(onlyActive);
    res.status(200).json({
      status: 'success',
      data: { pujas },
    });
  }

  static async getPuja(req: Request, res: Response): Promise<void> {
    const puja = await TempleBookingsService.getPuja(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { puja },
    });
  }

  static async createPuja(req: Request, res: Response): Promise<void> {
    const puja = await TempleBookingsService.createPuja(req.body);
    res.status(201).json({
      status: 'success',
      message: 'Puja seva created successfully',
      data: { puja },
    });
  }

  static async updatePuja(req: Request, res: Response): Promise<void> {
    const puja = await TempleBookingsService.updatePuja(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Puja seva updated successfully',
      data: { puja },
    });
  }

  static async deletePuja(req: Request, res: Response): Promise<void> {
    await TempleBookingsService.deletePuja(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Puja seva removed successfully',
    });
  }

  // ==========================================
  // 6. PUJA BOOKINGS CONTROLLERS
  // ==========================================
  static async createPujaBooking(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id || req.body.devotee_id;
    const booking = await TempleBookingsService.createPujaBooking(req.body, devoteeId);
    res.status(201).json({
      status: 'success',
      message: 'Puja seva booked and confirmed successfully',
      data: { booking },
    });
  }

  static async listAllPujaBookings(_req: Request, res: Response): Promise<void> {
    const bookings = await TempleBookingsService.listAllPujaBookings();
    res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  }

  static async listMyPujaBookings(req: Request, res: Response): Promise<void> {
    const devoteeId = req.devotee?.id || (req.query.devotee_id as string);
    const email = req.devotee?.email || (req.query.email as string);
    const phone = req.devotee?.phone || (req.query.phone as string);

    if (!devoteeId && !email && !phone) {
      res.status(400).json({
        status: 'error',
        message: 'Devotee identifier is required',
      });
      return;
    }
    const bookings = await TempleBookingsService.listMyPujaBookings({ devoteeId, email, phone });
    res.status(200).json({
      status: 'success',
      data: { bookings },
    });
  }

  static async updatePujaBookingStatus(req: Request, res: Response): Promise<void> {
    const { status, payment_status } = req.body;
    const booking = await TempleBookingsService.updatePujaBookingStatus(
      req.params.id,
      status,
      payment_status,
    );
    res.status(200).json({
      status: 'success',
      message: 'Puja booking status updated successfully',
      data: { booking },
    });
  }
}
