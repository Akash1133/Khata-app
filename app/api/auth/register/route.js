import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { randomBytes, scryptSync } from 'crypto';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function normalizeGstin(gstin) {
  return String(gstin || '').trim().toUpperCase();
}

export async function POST(request) {
  try {
    const { username, password, name, gstin } = await request.json();
    const uname = normalizeUsername(username);
    const pwd = String(password || '');
    const nextGstin = normalizeGstin(gstin);

    if (!uname || uname.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters.' }, { status: 400 });
    }
    if (!/^[a-z0-9._-]+$/.test(uname)) {
      return NextResponse.json({ error: 'Username can use letters, numbers, dot, underscore, and hyphen only.' }, { status: 400 });
    }
    if (pwd.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { username: { equals: uname, mode: 'insensitive' } },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken. Please choose another.' }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        username: uname,
        passwordHash: hashPassword(pwd),
        name: (name || '').trim() || 'New User',
        gstin: nextGstin || null
      }
    });

    return NextResponse.json({ success: true, user, isNewUser: !user.businessName });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Failed to register user.' }, { status: 500 });
  }
}
