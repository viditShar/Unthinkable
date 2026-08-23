import cron from 'node-cron';
import { processMedicationReminders } from '../services/reminder.service';
import { retryFailedEmails } from '../services/email.service';
import prisma from '../utils/prisma';

export const startJobs = () => {
  cron.schedule('0 * * * *', async () => {
    try { await processMedicationReminders(); }
    catch (err) { console.error('[CRON] Medication reminders failed:', err); }
  });

  cron.schedule('*/15 * * * *', async () => {
    try { await retryFailedEmails(); }
    catch (err) { console.error('[CRON] Email retry failed:', err); }
  });

  cron.schedule('0 8 * * *', async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow); start.setHours(0, 0, 0, 0);
      const end = new Date(tomorrow); end.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: { scheduledAt: { gte: start, lte: end }, status: 'CONFIRMED' },
        include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      });

      const { sendBookingConfirmation } = await import('../services/email.service');
      for (const appt of appointments) await sendBookingConfirmation(appt);
    } catch (err) { console.error('[CRON] Appointment reminders failed:', err); }
  });

  cron.schedule('*/5 * * * *', async () => {
    try {
      const deleted = await prisma.appointment.deleteMany({
        where: { status: 'PENDING', holdExpiresAt: { lt: new Date() }, holdToken: { not: null } },
      });
      if (deleted.count > 0) console.log(`[CRON] Cleaned ${deleted.count} expired holds`);
    } catch (err) { console.error('[CRON] Hold cleanup failed:', err); }
  });

  console.log('Background jobs started');
};
