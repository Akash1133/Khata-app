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
    
    // Convert to proper types
    const productData = {
      name: data.name,
      category: data.category || 'General',
      unit: data.unit || 'pcs',
      quantity: Number(data.quantity) || 0,
      buyPrice: Number(data.buyPrice) || 0,
      sellPrice: Number(data.sellPrice) || 0,
      lowStockThreshold: Number(data.lowStockThreshold) || 5,
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
