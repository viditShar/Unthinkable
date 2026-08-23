/**
 * Run with: npx tsx prisma/check-doctor.ts <doctorId>
 * Shows all records linked to a doctor so you can see what's blocking deletion.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const doctorId = process.argv[2];
  if (!doctorId) {
    // List all doctors if no ID given
    const doctors = await prisma.doctor.findMany({
      include: { user: { select: { name: true, email: true } } },
    });
    console.log('\n=== ALL DOCTORS ===');
    doctors.forEach(d => console.log(`ID: ${d.id} | ${d.user.name} | ${d.user.email}`));
    return;
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!doctor) { console.log('Doctor not found'); return; }
  console.log(`\nDoctor: ${doctor.user.name} (${doctor.user.email})`);

  const appointments = await prisma.appointment.findMany({ where: { doctorId } });
  console.log(`\nAppointments: ${appointments.length}`);
  appointments.forEach(a => console.log(`  - ${a.id} | status: ${a.status} | holdToken: ${a.holdToken ? 'YES' : 'null'}`));

  const apptIds = appointments.map(a => a.id);

  const reminders = await prisma.medicationReminder.findMany({ where: { appointmentId: { in: apptIds } } });
  console.log(`\nMedication reminders: ${reminders.length}`);

  const emails = await prisma.emailNotification.findMany({ where: { appointmentId: { in: apptIds } } });
  console.log(`Email notifications: ${emails.length}`);

  const leaves = await prisma.leaveDay.findMany({ where: { doctorId } });
  console.log(`Leave days: ${leaves.length}`);

  const avail = await prisma.doctorAvailability.findMany({ where: { doctorId } });
  console.log(`Availability records: ${avail.length}`);

  console.log('\nAll records found. Delete order should be:');
  console.log(`1. ${reminders.length} medication reminders`);
  console.log(`2. ${emails.length} email notifications`);
  console.log(`3. ${appointments.length} appointments`);
  console.log(`4. ${leaves.length} leave days`);
  console.log(`5. ${avail.length} availability records`);
  console.log(`6. Doctor profile`);
  console.log(`7. User`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
