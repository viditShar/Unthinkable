import { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { generatePreVisitSummary } from '../services/llm.service';
import { sendBookingConfirmation, sendCancellationEmail, sendRescheduleEmail } from '../services/email.service';
import { createCalendarEvent, deleteCalendarEvent, replaceCalendarEvent } from '../services/calendar.service';

const str = (v: string | string[]): string => Array.isArray(v) ? v[0] : v;

// Hold a slot for 10 minutes
export const holdSlot = async (req: AuthRequest, res: Response): Promise<void> => {
  const { doctorId, scheduledAt } = req.body;

  const patientProfile = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  if (!patientProfile) {
    res.status(404).json({ success: false, message: 'Patient profile not found' });
    return;
  }

  const slotTime = new Date(scheduledAt);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if slot already taken
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId,
          scheduledAt: slotTime,
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: [
            { holdExpiresAt: null },
            { holdExpiresAt: { gt: new Date() } },
          ],
        },
      });

      if (conflict) throw new Error('SLOT_TAKEN');

      // Check doctor leave
      const leaveDate = new Date(slotTime);
      leaveDate.setUTCHours(0, 0, 0, 0);
      const leave = await tx.leaveDay.findUnique({
        where: { doctorId_date: { doctorId, date: leaveDate } },
      });
      if (leave) throw new Error('DOCTOR_ON_LEAVE');

      const holdToken = randomBytes(32).toString('hex');
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const held = await tx.appointment.create({
        data: {
          patientId: patientProfile.id,
          doctorId,
          scheduledAt: slotTime,
          status: 'PENDING',
          heldAt: new Date(),
          holdExpiresAt,
          holdToken,
        },
      });

      return { holdToken, holdExpiresAt, appointmentId: held.id };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === 'SLOT_TAKEN') {
      res.status(409).json({ success: false, message: 'This slot is already taken. Please choose another.' });
    } else if (err.message === 'DOCTOR_ON_LEAVE') {
      res.status(409).json({ success: false, message: 'Doctor is on leave this day.' });
    } else {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to hold slot' });
    }
  }
};

// Confirm booking with symptom form
export const confirmBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  const { appointmentId, holdToken, symptoms } = req.body;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (!appointment || appointment.holdToken !== holdToken) {
    res.status(400).json({ success: false, message: 'Invalid or expired hold token' });
    return;
  }

  if (appointment.holdExpiresAt && appointment.holdExpiresAt < new Date()) {
    await prisma.appointment.delete({ where: { id: appointmentId } });
    res.status(410).json({ success: false, message: 'Slot hold expired. Please book again.' });
    return;
  }

  // Generate LLM pre-visit summary
  let preVisitSummary: string | null = null;
  let urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null = null;
  let chiefComplaint: string | null = null;
  let suggestedQuestions: string | null = null;

  if (symptoms) {
    try {
      const llmResult = await generatePreVisitSummary(symptoms);
      if (llmResult) {
        preVisitSummary = llmResult.summary;
        urgencyLevel = llmResult.urgencyLevel;
        chiefComplaint = llmResult.chiefComplaint;
        suggestedQuestions = JSON.stringify(llmResult.suggestedQuestions);
      }
    } catch (err) {
      console.error('LLM pre-visit summary failed (non-fatal):', err);
    }
  }

  const confirmed = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CONFIRMED',
      symptoms,
      preVisitSummary,
      urgencyLevel: urgencyLevel as any,
      chiefComplaint,
      suggestedQuestions,
      holdToken: null,
      heldAt: null,
      holdExpiresAt: null,
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  sendBookingConfirmation(confirmed).catch(console.error);
  createCalendarEvent(confirmed).catch(console.error);

  res.json({ success: true, data: confirmed });
};

// Cancel appointment
export const cancelAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const appointmentId = str(req.params.appointmentId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  const patientProfile = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  const doctorProfile = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });

  const isOwner =
    (patientProfile && appointment.patientId === patientProfile.id) ||
    (doctorProfile && appointment.doctorId === doctorProfile.id) ||
    req.user!.role === 'ADMIN';

  if (!isOwner) {
    res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' });
    return;
  }

  const cancelled = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'CANCELLED' },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  sendCancellationEmail(cancelled).catch(console.error);
  if (cancelled.patientCalendarEventId || cancelled.doctorCalendarEventId) {
    deleteCalendarEvent(cancelled).catch(console.error);
  }

  res.json({ success: true, data: cancelled });
};

// Reschedule appointment
export const rescheduleAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const appointmentId = str(req.params.appointmentId);
  const { newScheduledAt } = req.body;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  // Only patient or doctor involved can reschedule
  const patientProfile = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  const doctorProfile  = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });

  const isOwner =
    (patientProfile && appointment.patientId === patientProfile.id) ||
    (doctorProfile && appointment.doctorId === doctorProfile.id) ||
    req.user!.role === 'ADMIN';

  if (!isOwner) {
    res.status(403).json({ success: false, message: 'Not authorized to reschedule this appointment' });
    return;
  }

  const newTime = new Date(newScheduledAt);
  const oldTime = new Date(appointment.scheduledAt);

  // Check new slot availability
  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId: appointment.doctorId,
      scheduledAt: newTime,
      status: { in: ['PENDING', 'CONFIRMED'] },
      id: { not: appointmentId },
    },
  });

  if (conflict) {
    res.status(409).json({ success: false, message: 'New slot is already taken.' });
    return;
  }

  // Check doctor leave on new date
  const newLeaveDate = new Date(newTime);
  newLeaveDate.setUTCHours(0, 0, 0, 0);
  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId: appointment.doctorId, date: newLeaveDate } },
  });
  if (leave) {
    res.status(409).json({ success: false, message: 'Doctor is on leave on the new date.' });
    return;
  }

  const oldCalendarEventId = appointment.patientCalendarEventId;

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      scheduledAt: newTime,
      status: 'CONFIRMED',
      patientCalendarEventId: null,
      doctorCalendarEventId: null,
    },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  // Send reschedule emails to both parties
  sendRescheduleEmail(updated, oldTime).catch(console.error);

  // Delete old calendar event and create a new one
  replaceCalendarEvent({ ...updated, patientCalendarEventId: oldCalendarEventId }).catch(console.error);

  res.json({ success: true, data: updated });
};

// Get single appointment
export const getAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  const appointmentId = str(req.params.appointmentId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: { select: { name: true, email: true, phone: true } } } },
      doctor: {
        select: {
          id: true,
          specialisation: true,
          slotDurationMins: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!appointment) {
    res.status(404).json({ success: false, message: 'Appointment not found' });
    return;
  }

  // Ownership check — patient, doctor, or admin can view
  const patientProfile = await prisma.patient.findUnique({ where: { userId: req.user!.userId } });
  const doctorProfile = await prisma.doctor.findUnique({ where: { userId: req.user!.userId } });

  const canView =
    req.user!.role === 'ADMIN' ||
    (patientProfile && appointment.patientId === patientProfile.id) ||
    (doctorProfile && appointment.doctorId === doctorProfile.id);

  if (!canView) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  res.json({ success: true, data: appointment });
};
