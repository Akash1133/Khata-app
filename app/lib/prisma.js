import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const pool = globalForPrisma.pgPool || new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000, // Increase to 15s for Neon cold starts
});
const adapter = globalForPrisma.prismaAdapter || new PrismaPg(pool);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pgPool = pool;
  globalForPrisma.prismaAdapter = adapter;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ 
    adapter,
    // Add transaction timeout
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
