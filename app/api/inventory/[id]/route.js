import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getUserId } from '../../../lib/serverAuth';

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *   put:
 *     summary: Update product
 *     tags: [Inventory]
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
 *               quantity:
 *                 type: number
 *               sellPrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete product
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *     responses:
 *       200:
 *         description: Product deleted
 */
export async function GET(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id }
    });
    if (!product || product.userId !== userId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    // Verify ownership
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const data = await request.json();
    if (data.name !== undefined) {
      const nextName = String(data.name || '').trim();
      if (!nextName) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
      const dup = await prisma.product.findFirst({
        where: {
          userId,
          name: { equals: nextName, mode: 'insensitive' },
          NOT: { id }
        },
        select: { id: true }
      });
      if (dup) return NextResponse.json({ error: 'Product with same name already exists' }, { status: 409 });
      data.name = nextName;
    }
    
    // Normalize numeric fields
    const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const toNum = (v) => Number(v) || 0;
    if (data.buyPrice !== undefined) data.buyPrice = round2(data.buyPrice);
    if (data.sellPrice !== undefined) data.sellPrice = round2(data.sellPrice);
    if (data.quantity !== undefined) data.quantity = toNum(data.quantity);
    if (data.lowStockThreshold !== undefined) data.lowStockThreshold = Math.max(0, Math.round(toNum(data.lowStockThreshold)));
    if ([data.buyPrice, data.sellPrice, data.quantity, data.lowStockThreshold].some((n) => n !== undefined && n < 0)) {
      return NextResponse.json({ error: 'Negative values are not allowed' }, { status: 400 });
    }
    
    const product = await prisma.product.update({
      where: { id },
      data
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    // Verify ownership
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    await prisma.product.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
