import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request) {
  try {
    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Missing Google credential.' }, { status: 400 });
    }

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Google sign-in failed. Please try again.' }, { status: 401 });
    }
    const payload = await verifyRes.json();

    if (!payload?.sub || !payload?.email) {
      return NextResponse.json({ error: 'Invalid Google account data.' }, { status: 401 });
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleSub: payload.sub }, { email: payload.email }] }
    });

    if (!user) {
      const baseUsername = String(payload.email).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 24) || 'user';
      let username = baseUsername;
      let i = 1;
      while (await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } }, select: { id: true } })) {
        username = `${baseUsername}${i++}`;
      }

      user = await prisma.user.create({
        data: {
          googleSub: payload.sub,
          email: payload.email,
          name: payload.name || 'New User',
          username
        }
      });
    } else if (!user.googleSub) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleSub: payload.sub }
      });
    }

    const isNewUser = !user.name || user.name === 'New User' || !user.businessName;
    return NextResponse.json({ success: true, user, isNewUser });
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: 'Google sign-in failed.' }, { status: 500 });
  }
}
