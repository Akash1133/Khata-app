import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getUserId } from '../../../../lib/serverAuth';

// POST /api/transactions/[id]/return
// Body: { returnAll: true } OR { items: [{ transactionItemId, quantity }] }
export async function POST(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const data = await request.json();

    // Get the transaction with items
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    });

    if (!transaction || transaction.userId !== userId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Determine which items to return
    let itemsToReturn = [];

    if (data.returnAll) {
      itemsToReturn = transaction.items.map(item => ({
        transactionItemId: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));
    } else if (data.items && Array.isArray(data.items)) {
      for (const returnItem of data.items) {
        const txnItem = transaction.items.find(i => i.id === returnItem.transactionItemId);
        if (!txnItem) continue;
        const returnQty = Math.min(returnItem.quantity || txnItem.quantity, txnItem.quantity);
        itemsToReturn.push({
          transactionItemId: txnItem.id,
          productId: txnItem.productId,
          quantity: returnQty,
          price: txnItem.price,
        });
      }
    }

    if (itemsToReturn.length === 0) {
      return NextResponse.json({ error: 'No items to return' }, { status: 400 });
    }

    // Calculate refund amount
    const refundAmount = itemsToReturn.reduce((sum, i) => sum + (i.quantity * i.price), 0);

    // Execute the return in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Add stock back to products
      for (const item of itemsToReturn) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } }
        });
      }

      // 2. Create a return transaction for record-keeping
      const returnTxn = await tx.transaction.create({
        data: {
          type: 'return',
          amount: refundAmount,
          note: `Return from sale #${id.slice(-6)}`,
          partyId: transaction.partyId,
          userId,
          items: {
            create: itemsToReturn.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              buyPrice: 0,
            }))
          }
        },
        include: { items: { include: { product: true } } }
      });

      // 3. If there was a party, adjust their balance (reduce what they owe)
      if (transaction.partyId) {
        await tx.party.update({
          where: { id: transaction.partyId },
          data: { balance: { decrement: refundAmount } }
        });
      }

      return returnTxn;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Return error:', error.message);
    return NextResponse.json({ error: 'Failed to process return', details: error.message }, { status: 500 });
  }
}
