import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { scryptSync, timingSafeEqual } from 'crypto';

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hashHex] = stored.split(':');
  const hash = Buffer.from(hashHex, 'hex');
  const candidate = scryptSync(password, salt, 64);
  if (hash.length !== candidate.length) return false;
  return timingSafeEqual(hash, candidate);
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const uname = normalizeUsername(username);
    const pwd = String(password || '');

    if (!uname || !pwd) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { username: { equals: uname, mode: 'insensitive' } }
    });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    if (!verifyPassword(pwd, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const isNewUser = !user.name || user.name === 'New User' || !user.businessName;
    return NextResponse.json({ success: true, user, isNewUser });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to login.' }, { status: 500 });
  }
}
