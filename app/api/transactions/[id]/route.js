import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getUserId } from '../../../lib/serverAuth';

export async function DELETE(request, { params }) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    
    await prisma.transaction.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete transaction error:', error.message);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
