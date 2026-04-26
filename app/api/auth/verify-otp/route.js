import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login/signup
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
export async function POST(request) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP are required' }, { status: 400 });
    }

    const record = await prisma.otpRecord.findUnique({
      where: { phone: phoneNumber }
    });
    
    if (!record || record.otp !== otp || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    // OTP matched, clear it
    await prisma.otpRecord.delete({ where: { phone: phoneNumber } });

    // Find or create user in DB
    let user = await prisma.user.findUnique({
      where: { phone: phoneNumber }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: phoneNumber,
          name: 'New User'
        }
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
