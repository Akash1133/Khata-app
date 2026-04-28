import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { getUserId } from '../../lib/serverAuth';

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Get all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of transactions
 *   post:
 *     summary: Create a new transaction (updates stock and balances automatically)
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [sale, purchase, payment_in, payment_out]
 *               amount:
 *                 type: number
 *               note:
 *                 type: string
 *               partyId:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *     responses:
 *       201:
 *         description: Transaction created
 */
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        party: true,
        items: { include: { product: true } }
      }
    });
    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      // Fetch product details for buyPrice
      const productIds = (data.items || []).map(i => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      // Helper to safely parse numbers
      const safeNum = (val) => {
        const n = Number(val);
        return isNaN(n) ? 0 : n;
      };
      // Helper to round monetary values to 2 decimal places
      const round2 = (val) => Math.round(safeNum(val) * 100) / 100;

      // 0. Auto-create Party if newPartyName is provided
      let finalPartyId = data.partyId || null;
      if (!finalPartyId && data.newPartyName) {
        const newParty = await tx.party.create({
          data: {
            name: data.newPartyName,
            phone: data.newPartyPhone || null,
            type: 'customer',
            balance: 0,
            userId
          }
        });
        finalPartyId = newParty.id;
      }

      // 1. Create the Transaction
      const transaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: round2(data.amount),
          note: data.note || null,
          partyId: finalPartyId,
          userId,
          items: {
            create: (data.items || []).map(item => {
              const product = productMap.get(item.productId);
              return {
                productId: item.productId,
                quantity: Math.max(0.001, safeNum(item.quantity)),
                price: round2(item.price),
                buyPrice: product ? product.buyPrice : 0,
              };
            })
          }
        },
        include: { items: true }
      });

      // 2. Update Product Inventory if it's a sale or purchase
      if (data.type === 'sale' || data.type === 'purchase') {
        for (const item of transaction.items) {
          const qtyChange = data.type === 'sale' ? -item.quantity : item.quantity;
          
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: qtyChange } }
          });
        }
      }

      // 3. Update Party Balance and handle partial payments
      if (finalPartyId) {
        let balanceChange = 0;
        const totalAmt = safeNum(data.amount);

        // If it's a sale and the customer paid partially or fully right away
        if (data.type === 'sale' && data.amountPaid !== undefined && safeNum(data.amountPaid) > 0) {
          const paid = safeNum(data.amountPaid);
          
          // Create the payment receipt automatically
          await tx.transaction.create({
            data: {
              type: 'payment_in',
              amount: paid,
              note: `Payment received during Sale #${transaction.id.slice(-6)}`,
              partyId: finalPartyId,
              userId,
            }
          });
          
          // Balance increases by the unpaid amount (Total Bill - Amount Paid Now)
          balanceChange = totalAmt - paid;
        } else {
          // Standard balance logic
          // Balance > 0 means they owe us money. Balance < 0 means we owe them money.
          if (data.type === 'sale') balanceChange = totalAmt; // they owe us more
          else if (data.type === 'payment_in') balanceChange = -totalAmt; // they paid us, owe us less
          else if (data.type === 'purchase') balanceChange = -totalAmt; // we owe them more
          else if (data.type === 'payment_out') balanceChange = totalAmt; // we paid them, owe them less
        }

        if (balanceChange !== 0) {
          await tx.party.update({
            where: { id: finalPartyId },
            data: { balance: { increment: balanceChange } }
          });
        }
      }

      return transaction;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create transaction error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to create transaction', 
      details: error.message 
    }, { status: 500 });
  }
}
