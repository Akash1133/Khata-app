import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../lib/serverAuth';

/**
 * @swagger
 * /api/parties:
 *   get:
 *     summary: Get all parties
 *     tags: [Parties]
 *     responses:
 *       200:
 *         description: List of parties
 *   post:
 *     summary: Create a new party
 *     tags: [Parties]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               type:
 *                 type: string
 *               balance:
 *                 type: number
 *     responses:
 *       201:
 *         description: Party created
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const parties = await prisma.party.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(parties);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch parties' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    
    const party = await prisma.party.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        type: data.type || 'customer',
        balance: Number(data.balance) || 0,
        userId,
      }
    });
    
    return NextResponse.json(party, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create party' }, { status: 500 });
  }
}
