import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getUserId } from '../../../lib/serverAuth';

/**
 * @swagger
 * /api/inventory/bulk:
 *   post:
 *     summary: Create multiple products at once
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 quantity:
 *                   type: number
 *     responses:
 *       201:
 *         description: Products created
 */
export async function POST(request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const productsArray = await request.json();

    if (!Array.isArray(productsArray)) {
      return NextResponse.json({ error: 'Expected an array of products' }, { status: 400 });
    }

    const data = productsArray.map(p => ({
      name: p.name,
      category: p.category || 'General',
      unit: p.unit || 'pcs',
      quantity: Number(p.quantity) || 0,
      buyPrice: Number(p.buyPrice) || 0,
      sellPrice: Number(p.sellPrice) || 0,
      lowStockThreshold: Number(p.lowStockThreshold) || 5,
      userId,
    }));

    const result = await prisma.product.createMany({
      data,
      skipDuplicates: true
    });
    
    return NextResponse.json({ success: true, count: result.count }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create products' }, { status: 500 });
  }
}
