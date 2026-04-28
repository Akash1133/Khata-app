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

    const normalized = productsArray
      .map((p) => ({
        name: (p.name || '').trim(),
        category: p.category || 'General',
        unit: p.unit || 'pcs',
        quantity: Number(p.quantity),
        buyPrice: Number(p.buyPrice),
        sellPrice: Number(p.sellPrice),
        lowStockThreshold: Number(p.lowStockThreshold),
      }))
      .filter((p) => p.name);

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'No valid products to create' }, { status: 400 });
    }

    const hasNegative = normalized.some((p) =>
      [p.quantity, p.buyPrice, p.sellPrice, p.lowStockThreshold].some((n) => Number.isFinite(n) && n < 0)
    );
    if (hasNegative) {
      return NextResponse.json({ error: 'Negative values are not allowed' }, { status: 400 });
    }

    const incomingNameSet = new Set();
    for (const p of normalized) {
      const key = p.name.toLowerCase();
      if (incomingNameSet.has(key)) {
        return NextResponse.json({ error: `Duplicate product in bulk list: ${p.name}` }, { status: 409 });
      }
      incomingNameSet.add(key);
    }

    const existing = await prisma.product.findMany({
      where: { userId },
      select: { name: true }
    });
    const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));
    const conflict = normalized.find((p) => existingNames.has(p.name.toLowerCase()));
    if (conflict) {
      return NextResponse.json({ error: `Product already exists: ${conflict.name}` }, { status: 409 });
    }

    const data = normalized.map(p => ({
      name: p.name,
      category: p.category || 'General',
      unit: p.unit || 'pcs',
      quantity: Number.isFinite(p.quantity) ? p.quantity : 0,
      buyPrice: Number.isFinite(p.buyPrice) ? p.buyPrice : 0,
      sellPrice: Number.isFinite(p.sellPrice) ? p.sellPrice : 0,
      lowStockThreshold: Number.isFinite(p.lowStockThreshold) ? p.lowStockThreshold : 0,
      userId,
    }));

    const result = await prisma.product.createMany({
      data
    });
    
    return NextResponse.json({ success: true, count: result.count }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create products' }, { status: 500 });
  }
}
