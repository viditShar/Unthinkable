import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMyAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  const patientProfile = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patientProfile) {
    res.status(404).json({ success: false, message: 'Patient profile not found' });
    return;
  }

  const { status } = req.query;
  const where: any = {
    patientId: patientProfile.id,
    // Exclude internal hold-phase records — only show real confirmed/completed/cancelled
    OR: [
      { holdToken: null },
      { status: { in: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'] } },
    ],
  };
  if (status) where.status = String(status).toUpperCase();

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      doctor: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { scheduledAt: 'desc' },
  });

  res.json({ success: true, data: appointments });
};

export const updatePatientProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { dateOfBirth, bloodGroup, allergies, phone } = req.body;

  const patient = await prisma.patient.update({
    where: { userId: req.user!.userId },
    data: {
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      bloodGroup,
      allergies,
    },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });

  if (phone) {
    await prisma.user.update({ where: { id: req.user!.userId }, data: { phone } });
  }

  res.json({ success: true, data: patient });
};
