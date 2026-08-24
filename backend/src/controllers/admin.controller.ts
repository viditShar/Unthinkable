import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import {
  sendAppointmentCancellationDueToLeave,
  sendAppointmentCancellationDueToRemoval,
  sendDoctorWelcomeEmail,
  sendDoctorRemovalEmail,
} from '../services/email.service';

const str = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Create a doctor account
export const createDoctor = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, phone, specialisation, qualifications, bio, slotDurationMins, workingHours } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ success: false, message: 'Email already in use' });
    return;
  }

  if (!password || password.length < 6) {
    res.status(400).json({ success: false, message: 'Password is required and must be at least 6 characters' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          specialisation,
          qualifications,
          bio,
          slotDurationMins: slotDurationMins || 30,
          workingHours: workingHours || {},
        },
      },
    },
    include: { doctorProfile: true },
  });

  const { password: _pw, ...safeUser } = user;

  // Send welcome email to new doctor
  sendDoctorWelcomeEmail(email, name, password).catch(console.error);

  res.status(201).json({ success: true, data: safeUser });
};

// Get all doctors
export const getDoctors = async (_req: Request, res: Response): Promise<void> => {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      leaveDays: true,
    },
  });
  res.json({ success: true, data: doctors });
};

// Update doctor profile
export const updateDoctor = async (req: Request, res: Response): Promise<void> => {
  const doctorId = str(req.params.doctorId);
  const { specialisation, qualifications, bio, slotDurationMins, workingHours } = req.body;

  const doctor = await prisma.doctor.update({
    where: { id: doctorId },
    data: { specialisation, qualifications, bio, slotDurationMins, workingHours },
    include: { user: { select: { name: true, email: true } } },
  });

  res.json({ success: true, data: doctor });
};

// Add leave day for a doctor
export const addLeaveDay = async (req: Request, res: Response): Promise<void> => {
  const doctorId = str(req.params.doctorId);
  const { date, reason } = req.body;

  const leaveDate = new Date(date);
  leaveDate.setUTCHours(0, 0, 0, 0);

  const existingLeave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date: leaveDate } },
  });
  if (existingLeave) {
    res.status(409).json({ success: false, message: 'Leave already exists for this date' });
    return;
  }

  const leave = await prisma.leaveDay.create({
    data: { doctorId, date: leaveDate, reason },
  });

  const startOfDay = new Date(leaveDate);
  const endOfDay = new Date(leaveDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const affectedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  for (const appt of affectedAppointments) {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: 'CANCELLED' },
    });
    sendAppointmentCancellationDueToLeave(appt).catch(console.error);
  }

  res.status(201).json({
    success: true,
    data: leave,
    message: `Leave added. ${affectedAppointments.length} appointment(s) cancelled and patients notified.`,
  });
};

// Remove leave day
export const removeLeaveDay = async (req: Request, res: Response): Promise<void> => {
  const doctorId = str(req.params.doctorId);
  const leaveId = str(req.params.leaveId);

  await prisma.leaveDay.delete({ where: { id: leaveId, doctorId } });
  res.json({ success: true, message: 'Leave day removed' });
};

// Delete a doctor
export const deleteDoctor = async (req: Request, res: Response): Promise<void> => {
  const doctorId = str(req.params.doctorId);

  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!doctor) {
      res.status(404).json({ success: false, message: 'Doctor not found' });
      return;
    }

    // Collect all appointment IDs for this doctor first
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        patientCalendarEventId: true,
        doctorCalendarEventId: true,
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });

    const appointmentIds = appointments.map((a: any) => a.id);

    // Notify patients with upcoming bookings and delete calendar events before wiping data
    const upcoming = appointments.filter(
      (a: any) => ['PENDING', 'CONFIRMED'].includes(a.status) && new Date(a.scheduledAt) >= new Date()
    );
    for (const appt of upcoming) {
      sendAppointmentCancellationDueToRemoval(appt).catch(console.error);
    }

    // Delete all calendar events for all appointments of this doctor (await — must happen before DB deletion)
    const { deleteCalendarEvent } = await import('../services/calendar.service');
    for (const appt of appointments) {
      if (appt.patientCalendarEventId || appt.doctorCalendarEventId) {
        await deleteCalendarEvent(appt).catch(console.error);
      }
    }

    // Delete everything in strict dependency order (deepest children first)
    if (appointmentIds.length > 0) {
      await prisma.medicationReminder.deleteMany({
        where: { appointmentId: { in: appointmentIds } },
      });
      await prisma.emailNotification.deleteMany({
        where: { appointmentId: { in: appointmentIds } },
      });
    }

    await prisma.appointment.deleteMany({ where: { doctorId } });
    await prisma.leaveDay.deleteMany({ where: { doctorId } });
    await prisma.doctorAvailability.deleteMany({ where: { doctorId } });

    // Email the doctor before deleting their record
    sendDoctorRemovalEmail(doctor.user.email, doctor.user.name, upcoming.length).catch(console.error);

    await prisma.doctor.delete({ where: { id: doctorId } });
    await prisma.user.delete({ where: { id: doctor.userId } });

    res.json({
      success: true,
      message: `Doctor removed. ${upcoming.length} upcoming appointment(s) cancelled and patients notified.`,
    });
  } catch (err: any) {
    console.error('Delete doctor error:', err);
    res.status(500).json({
      success: false,
      message: err?.message || 'Failed to remove doctor',
    });
  }
};

// Get all patients
export const getPatients = async (_req: Request, res: Response): Promise<void> => {
  const patients = await prisma.patient.findMany({
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  res.json({ success: true, data: patients });
};

// Get dashboard stats
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const [totalDoctors, totalPatients, totalAppointments, todayAppointments] = await Promise.all([
    prisma.doctor.count(),
    prisma.patient.count(),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: {
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  res.json({ success: true, data: { totalDoctors, totalPatients, totalAppointments, todayAppointments } });
};
