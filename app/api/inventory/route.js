import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../lib/serverAuth';

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory products
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create a new product
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               unit:
 *                 type: string
 *               quantity:
 *                 type: number
 *               buyPrice:
 *                 type: number
 *               sellPrice:
 *                 type: number
 *               lowStockThreshold:
 *                 type: number
 *     responses:
 *       201:
 *         description: Product created
 */
export async function GET() {
  try {
    const userId = await getUserId();
    console.log(`Inventory API received userId: ${userId}`);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user exists in this database
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return NextResponse.json({ 
        error: 'User session invalid', 
        details: 'Your user ID was not found in the cloud database. Please log out and log in again to sync your account.',
        receivedId: userId
      }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch products', details: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId();
    console.log(`Inventory POST received userId: ${userId}`);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user exists in this database
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      return NextResponse.json({ 
        error: 'User session invalid', 
        details: 'Your user ID was not found in the cloud database. Please log out and log in again to sync your account.',
        receivedId: userId
      }, { status: 401 });
    }

    const data = await request.json();
    const name = (data.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const quantity = Number(data.quantity);
    const buyPrice = Number(data.buyPrice);
    const sellPrice = Number(data.sellPrice);
    const lowStockThreshold = Number(data.lowStockThreshold);
    if ([quantity, buyPrice, sellPrice, lowStockThreshold].some((n) => Number.isFinite(n) && n < 0)) {
      return NextResponse.json({ error: 'Negative values are not allowed' }, { status: 400 });
    }

    const existing = await prisma.product.findFirst({
      where: { userId, name: { equals: name, mode: 'insensitive' } },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ error: 'Product with same name already exists' }, { status: 409 });
    }
    
    // Convert to proper types, round prices to 2 decimal places
    const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const productData = {
      name,
      category: data.category || 'General',
      unit: data.unit || 'pcs',
      quantity: Number.isFinite(quantity) ? quantity : 0,
      buyPrice: round2(buyPrice),
      sellPrice: round2(sellPrice),
      lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 0,
      userId,
    };

    const product = await prisma.product.create({
      data: productData
    });
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to create product', details: error.message }, { status: 500 });
  }
}
