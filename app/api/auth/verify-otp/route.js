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

    console.log(`Verifying OTP for ${phoneNumber}. Entered: ${otp}`);
    
    const record = await prisma.otpRecord.findUnique({
      where: { phone: phoneNumber }
    });
    
    if (!record) {
      console.log(`No OTP record found for ${phoneNumber}`);
      return NextResponse.json({ error: 'Invalid or expired OTP (not found)' }, { status: 400 });
    }

    console.log(`Found record: ${record.otp}, expires: ${record.expiresAt}`);

    if (record.otp !== otp) {
      console.log(`OTP mismatch. Expected ${record.otp}, got ${otp}`);
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (record.expiresAt < new Date()) {
      console.log(`OTP expired. Expiry: ${record.expiresAt}, Current: ${new Date()}`);
      return NextResponse.json({ error: 'Expired OTP' }, { status: 400 });
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

    console.log(`DEBUG: Final user object to return for ${phoneNumber}:`, JSON.stringify(user, null, 2));
    
    if (!user || !user.id) {
      console.error(`CRITICAL ERROR: user.id is missing for ${phoneNumber}!`);
      return NextResponse.json({ error: 'Database synchronization error. Please try logging in again.' }, { status: 500 });
    }

    console.log(`Login successful for ${phoneNumber}. Returning User ID: ${user.id}`);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
