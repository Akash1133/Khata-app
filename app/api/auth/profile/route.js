import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { randomBytes, scryptSync } from 'crypto';

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function normalizeGstin(gstin) {
  return String(gstin || '').trim().toUpperCase();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function isUnknownGstinArgumentError(error) {
  const msg = String(error?.message || '');
  return msg.includes('Unknown argument `gstin`');
}

export async function POST(request) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, businessName, username, password, gstin } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const nextUsername = username !== undefined ? normalizeUsername(username) : undefined;
    const nextGstin = gstin !== undefined ? normalizeGstin(gstin) : undefined;
    if (nextUsername !== undefined) {
      if (!nextUsername) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
      }
      if (!/^[a-z0-9._-]+$/.test(nextUsername)) {
        return NextResponse.json({ error: 'Username can use letters, numbers, dot, underscore, and hyphen only.' }, { status: 400 });
      }
      const dup = await prisma.user.findFirst({
        where: {
          username: { equals: nextUsername, mode: 'insensitive' },
          NOT: { id: userId }
        },
        select: { id: true }
      });
      if (dup) {
        return NextResponse.json({ error: 'Username already taken. Choose another one.' }, { status: 409 });
      }
    }

    if (password !== undefined && String(password).trim()) {
      if (String(password).length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }
    }

    console.log(`Updating profile for user ${userId}:`, { name, email, businessName, username: nextUsername ? '***' : undefined });

    const data = {
      name: name.trim(),
      email: email ? email.trim() : null,
      businessName: businessName ? businessName.trim() : null,
    };
    if (nextUsername !== undefined) data.username = nextUsername;
    if (nextGstin !== undefined) data.gstin = nextGstin || null;
    if (password !== undefined && String(password).trim()) data.passwordHash = hashPassword(String(password));

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
      });
      return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
      if (!isUnknownGstinArgumentError(error) || !('gstin' in data)) throw error;

      // Backward-compat fallback for environments where DB/client is not updated for gstin yet.
      const { gstin: _ignoredGstin, ...safeData } = data;
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: safeData,
      });
      return NextResponse.json({
        success: true,
        user: updatedUser,
        warning: 'Profile saved without GSTIN because server schema is outdated. Run Prisma migration/db push.'
      });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
