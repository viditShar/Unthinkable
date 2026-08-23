import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fix any doctor user whose name starts with "Dr. " — strip the prefix since UI adds it
  const doctors = await prisma.doctor.findMany({
    include: { user: true },
  });

  for (const doctor of doctors) {
    if (doctor.user.name.startsWith('Dr. ')) {
      const fixedName = doctor.user.name.replace(/^Dr\.\s+/, '');
      await prisma.user.update({
        where: { id: doctor.userId },
        data: { name: fixedName },
      });
      console.log(`Fixed: "${doctor.user.name}" → "${fixedName}"`);
    }
  }

  console.log('Done.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
