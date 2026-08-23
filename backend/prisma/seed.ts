import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@healthcare.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@healthcare.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Admin created:', admin.email);

  const doctorPassword = await bcrypt.hash('Doctor@123', 12);
  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.smith@healthcare.com' },
    update: {},
    create: {
      name: 'John Smith',
      email: 'dr.smith@healthcare.com',
      password: doctorPassword,
      role: 'DOCTOR',
      doctorProfile: {
        create: {
          specialisation: 'General Medicine',
          qualifications: 'MBBS, MD',
          bio: 'Experienced general physician with 10+ years of practice.',
          slotDurationMins: 30,
          workingHours: {
            mon: { start: '09:00', end: '17:00' },
            tue: { start: '09:00', end: '17:00' },
            wed: { start: '09:00', end: '17:00' },
            thu: { start: '09:00', end: '17:00' },
            fri: { start: '09:00', end: '13:00' },
          },
        },
      },
    },
  });

  console.log('Sample doctor created:', doctorUser.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
