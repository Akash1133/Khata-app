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
      select: { id: true, name: true, quantity: true }
    });
    
    // Create a map for quick lookup by lowercased name
    const existingMap = new Map();
    existing.forEach(p => existingMap.set(p.name.toLowerCase(), p));

    const createData = [];
    const updateOperations = [];

    for (const p of normalized) {
      const existingProduct = existingMap.get(p.name.toLowerCase());
      
      const payload = {
        name: p.name,
        category: p.category || 'General',
        unit: p.unit || 'pcs',
        buyPrice: Number.isFinite(p.buyPrice) ? p.buyPrice : 0,
        sellPrice: Number.isFinite(p.sellPrice) ? p.sellPrice : 0,
        lowStockThreshold: Number.isFinite(p.lowStockThreshold) ? p.lowStockThreshold : 0,
      };

      if (existingProduct) {
        // If it exists, we update the fields and ADD the quantity
        updateOperations.push(
          prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              ...payload,
              quantity: {
                increment: Number.isFinite(p.quantity) ? p.quantity : 0
              }
            }
          })
        );
      } else {
        // If it's new, we create it
        createData.push({
          ...payload,
          quantity: Number.isFinite(p.quantity) ? p.quantity : 0,
          userId,
        });
      }
    }

    const transactions = [];
    if (createData.length > 0) {
      transactions.push(prisma.product.createMany({ data: createData }));
    }
    if (updateOperations.length > 0) {
      transactions.push(...updateOperations);
    }

    await prisma.$transaction(transactions);
    
    return NextResponse.json({ success: true, count: normalized.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to bulk create/update products' }, { status: 500 });
  }
}
