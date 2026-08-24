import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const str = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Search doctors by specialisation (public)
export const searchDoctors = async (req: Request, res: Response): Promise<void> => {
  const { specialisation, name } = req.query;

  const doctors = await prisma.doctor.findMany({
    where: {
      ...(specialisation ? { specialisation: { contains: String(specialisation), mode: 'insensitive' } } : {}),
      ...(name ? { user: { name: { contains: String(name), mode: 'insensitive' } } } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      leaveDays: { where: { date: { gte: new Date() } } },
    },
  });

  res.json({ success: true, data: doctors });
};

// Get doctor by ID (public)
export const getDoctorById = async (req: Request, res: Response): Promise<void> => {
  const doctorId = str(req.params.doctorId);

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      leaveDays: { where: { date: { gte: new Date() } } },
      availability: true,
    },
  });

  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }

  res.json({ success: true, data: doctor });
};

// Get available slots for a doctor on a date
export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  const doctorId = str(req.params.doctorId);
  const { date } = req.query;

  if (!date) {
    res.status(400).json({ success: false, message: 'Date is required' });
    return;
  }

  const targetDate = new Date(String(date));
  targetDate.setUTCHours(0, 0, 0, 0);

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor) {
    res.status(404).json({ success: false, message: 'Doctor not found' });
    return;
  }

  // Check if doctor is on leave
  const leaveDay = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date: targetDate } },
  });
  if (leaveDay) {
    res.json({ success: true, data: [], message: 'Doctor is on leave this day' });
    return;
  }

  // Get working hours for that day of week
  const dayOfWeek = targetDate.getDay();
  const workingHours = doctor.workingHours as any;
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = dayNames[dayOfWeek];
  const daySchedule = workingHours[dayKey];

  if (!daySchedule || !daySchedule.start || !daySchedule.end) {
    res.json({ success: true, data: [], message: 'Doctor does not work on this day' });
    return;
  }

  // Generate slots
  const slots: { time: string; available: boolean }[] = [];
  const [startHour, startMin] = daySchedule.start.split(':').map(Number);
  const [endHour, endMin] = daySchedule.end.split(':').map(Number);
  const slotDuration = doctor.slotDurationMins;

  let current = startHour * 60 + startMin;
  const end = endHour * 60 + endMin;

  // Get booked slots
  const startOfDay = new Date(targetDate);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const booked = await prisma.appointment.findMany({
    where: {
      doctorId,
      scheduledAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    select: { scheduledAt: true },
  });

  const bookedTimes = new Set(
    booked.map((b: { scheduledAt: Date }) => {
      const d = new Date(b.scheduledAt);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    })
  );

  while (current + slotDuration <= end) {
    const hours = Math.floor(current / 60);
    const mins = current % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    slots.push({ time: timeStr, available: !bookedTimes.has(timeStr) });
    current += slotDuration;
  }

  res.json({ success: true, data: slots });
};

// Doctor views their own appointments
export const getDoctorAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  const doctorProfile = await prisma.doctor.findUnique({
    where: { userId: req.user!.userId },
  });

  if (!doctorProfile) {
    res.status(404).json({ success: false, message: 'Doctor profile not found' });
    return;
  }

  const { status, date } = req.query;
  const where: any = {
    doctorId: doctorProfile.id,
    // Exclude internal hold-phase records
    OR: [
      { holdToken: null },
      { status: { in: ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'] } },
    ],
  };

  if (status) where.status = String(status).toUpperCase();
  if (date) {
    const d = new Date(String(date));
    const start = new Date(d); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(d); end.setUTCHours(23, 59, 59, 999);
    where.scheduledAt = { gte: start, lte: end };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // Attach the doctor's own profile to each appointment so frontend has doctorId and slotDurationMins
  const result = appointments.map((appt: any) => ({
    ...appt,
    doctor: {
      id: doctorProfile.id,
      slotDurationMins: doctorProfile.slotDurationMins,
    },
  }));

  res.json({ success: true, data: result });
};

// Doctor submits post-visit notes
export const submitPostVisitNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  const appointmentId = str(req.params.appointmentId);
  const { doctorNotes, prescription } = req.body;

  const doctorProfile = await prisma.doctor.findUnique({
    where: { userId: req.user!.userId },
  });

  if (!doctorProfile) {
    res.status(404).json({ success: false, message: 'Doctor profile not found' });
    return;
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.doctorId !== doctorProfile.id) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  const { generatePostVisitSummary } = await import('../services/llm.service');
  const { createMedicationReminders } = await import('../services/reminder.service');
  const { sendPostVisitEmail } = await import('../services/email.service');
  const { updateCalendarEventWithPostVisit, createMedicationCalendarEvents } = await import('../services/calendar.service');

  let postVisitSummary: string | null = null;
  try {
    const result = await generatePostVisitSummary(doctorNotes, prescription);
    postVisitSummary = result;
  } catch (err) {
    console.error('LLM post-visit summary failed (non-fatal):', err);
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      doctorNotes,
      prescription,
      postVisitSummary,
      status: 'COMPLETED',
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (prescription) {
    createMedicationReminders(updated).catch(console.error);
    createMedicationCalendarEvents(updated).catch(console.error);
  }

  sendPostVisitEmail(updated).catch(console.error);

  // Update appointment calendar event with post-visit summary
  updateCalendarEventWithPostVisit(updated).catch(console.error);

  res.json({ success: true, data: updated });
};

// Doctor updates their own profile
export const updateDoctorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { specialisation, qualifications, bio, workingHours, slotDurationMins } = req.body;

  const updated = await prisma.doctor.update({
    where: { userId: req.user!.userId },
    data: { specialisation, qualifications, bio, workingHours, slotDurationMins },
    include: { user: { select: { name: true, email: true } } },
  });

  res.json({ success: true, data: updated });
};
