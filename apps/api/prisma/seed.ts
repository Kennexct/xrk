import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

/**
 * Seeds the first Super Admin so the platform is usable immediately.
 * Override credentials via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@syt.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
      division: 'Pengurus Inti',
      passwordHash,
    },
  });
  console.log(`Seeded Super Admin: ${admin.email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`  default password: ${password} — CHANGE THIS after first login.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
