import prisma from '../utils/prisma';

export const createMedicationReminders = async (appointment: any): Promise<void> => {
  if (!appointment.prescription) return;

  const lines = appointment.prescription.split('\n').filter(Boolean);

  for (const line of lines) {
    const [medication, freqStr] = line.split('-').map((s: string) => s.trim());
    if (!medication) continue;

    const f = (freqStr || '').toLowerCase();
    let frequency: 'ONCE' | 'DAILY' | 'TWICE_DAILY' | 'WEEKLY' = 'DAILY';
    if (f.includes('once')) frequency = 'ONCE';
    else if (f.includes('twice') || f.includes('2x')) frequency = 'TWICE_DAILY';
    else if (f.includes('weekly') || f.includes('week')) frequency = 'WEEKLY';

    const nextReminderAt = new Date();
    nextReminderAt.setHours(9, 0, 0, 0);
    if (nextReminderAt <= new Date()) nextReminderAt.setDate(nextReminderAt.getDate() + 1);

    await prisma.medicationReminder.create({
      data: { appointmentId: appointment.id, medication, frequency, nextReminderAt, isActive: true },
    });
  }
};

export const processMedicationReminders = async (): Promise<void> => {
  const now = new Date();

  const dueReminders = await prisma.medicationReminder.findMany({
    where: { isActive: true, nextReminderAt: { lte: now } },
    include: { appointment: { include: { patient: { include: { user: true } } } } },
  });

  const { sendMedicationReminder } = await import('./email.service');

  for (const reminder of dueReminders) {
    const { patient } = reminder.appointment;
    try {
      await sendMedicationReminder(
        patient.user.email,
        patient.user.name,
        reminder.medication,
        reminder.appointmentId
      );

      let nextReminderAt: Date | null = null;
      const base = new Date(now);

      switch (reminder.frequency) {
        case 'ONCE': break;
        case 'DAILY': base.setDate(base.getDate() + 1); nextReminderAt = base; break;
        case 'TWICE_DAILY': base.setHours(base.getHours() + 12); nextReminderAt = base; break;
        case 'WEEKLY': base.setDate(base.getDate() + 7); nextReminderAt = base; break;
      }

      await prisma.medicationReminder.update({
        where: { id: reminder.id },
        data: {
          lastSentAt: now,
          nextReminderAt: nextReminderAt || new Date(8640000000000000),
          isActive: nextReminderAt !== null,
        },
      });
    } catch (err) {
      console.error(`Medication reminder ${reminder.id} failed:`, err);
    }
  }
};
