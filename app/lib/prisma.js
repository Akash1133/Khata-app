import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const pool = globalForPrisma.pgPool || new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = globalForPrisma.prismaAdapter || new PrismaPg(pool);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pgPool = pool;
  globalForPrisma.prismaAdapter = adapter;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
