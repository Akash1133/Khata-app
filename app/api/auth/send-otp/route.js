import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && accountSid.startsWith('AC') && authToken ? twilio(accountSid, authToken) : null;

// Temporary in-memory store for OTPs (in production, use Redis or DB with expiry)
global.otpStore = global.otpStore || new Map();

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP via Twilio
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
 *     responses:
 *       200:
 *         description: OTP Sent successfully
 */
export async function POST(request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Generate a 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store it
    global.otpStore.set(phoneNumber, { otp, expires: Date.now() + 5 * 60 * 1000 });

    // Send via Twilio if configured, else just simulate it
    if (client && twilioNumber && twilioNumber !== 'your_twilio_phone_number') {
      await client.messages.create({
        body: `Your Khata App OTP is: ${otp}`,
        from: twilioNumber,
        to: phoneNumber
      });
      console.log(`Sent OTP ${otp} to ${phoneNumber} via Twilio`);
    } else {
      console.log(`[SIMULATED] Sent OTP ${otp} to ${phoneNumber}`);
      // In simulated mode, we'll override the OTP to '123456' for easier testing
      global.otpStore.set(phoneNumber, { otp: '123456', expires: Date.now() + 5 * 60 * 1000 });
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
