import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        type: 'sale',
        amount: 100,
        note: 'test',
        items: {
          create: []
        }
      }
    });
    console.log("Success:", transaction);
  } catch (e) {
    console.error("Prisma error:", e);
  }
}
test();
