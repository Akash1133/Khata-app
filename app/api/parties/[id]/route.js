import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getUserId } from '../../../lib/serverAuth';

/**
 * @swagger
 * /api/parties/{id}:
 *   get:
 *     summary: Get party by ID
 *     tags: [Parties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Party details
 *   put:
 *     summary: Update party
 *     tags: [Parties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
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
 *               balance:
 *                 type: number
 *     responses:
 *       200:
 *         description: Party updated
 *   delete:
 *     summary: Delete party
 *     tags: [Parties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Party deleted
 */
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const party = await prisma.party.findUnique({
      where: { id },
      include: { transactions: { orderBy: { date: 'desc' }, take: 10 } }
    });
    if (!party || party.userId !== userId) return NextResponse.json({ error: 'Party not found' }, { status: 404 });
    return NextResponse.json(party);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch party' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    const existing = await prisma.party.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Party not found' }, { status: 404 });

    const data = await request.json();
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.balance !== undefined) updateData.balance = Number(data.balance);

    const party = await prisma.party.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json(party);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update party' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    const existing = await prisma.party.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Party not found' }, { status: 404 });

    await prisma.party.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete party' }, { status: 500 });
  }
}
