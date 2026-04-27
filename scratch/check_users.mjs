import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const users = await prisma.user.findMany();
    console.log('Current Users in DB:', JSON.stringify(users, null, 2));
    
    const targetId = 'mohcdk3n08xobzajx';
    const exists = users.find(u => u.id === targetId);
    console.log(`\nIs target user ${targetId} in DB?`, !!exists);
    
  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
