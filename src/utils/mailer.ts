import nodemailer from 'nodemailer';
import { env } from '@config/env';

/**
 * Configure Nodemailer Transporter
 */
// Auto-detect SSL if port is 465 or SMTP_SECURE is explicitly true
const isSecure = env.SMTP_PORT === 465 || env.SMTP_SECURE;

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: isSecure, // true for port 465 (Direct SSL), false for 587 (STARTTLS)
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: false,
  },
});

export interface SendOtpEmailOptions {
  to: string;
  devoteeName?: string;
  otp: string;
  expiresInMinutes?: number;
}

/**
 * Generates temple-branded HTML email template for OTP verification
 */
export function generateOtpEmailTemplate(devoteeName: string, otp: string, expiresInMinutes: number = 10): string {
  const name = devoteeName?.trim() || 'Devotee';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Temple Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E1B18;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FAF7F2; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(139, 94, 52, 0.08); border: 1px solid rgba(197, 157, 95, 0.25);">
          
          <!-- Gold & Bronze Temple Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8B5E34 0%, #C59D5F 100%); padding: 35px 30px; text-align: center;">
              <div style="font-size: 32px; line-height: 1; margin-bottom: 8px;">🕉️</div>
              <h1 style="color: #FFFFFF; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; margin: 0; text-transform: uppercase;">
                Shree Kutch Satsang Swaminarayan Temple
              </h1>
              <p style="color: #FAF7F2; font-size: 12px; margin: 5px 0 0 0; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.9;">
                Kampala, Uganda • Devotee Portal
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="color: #8B5E34; font-size: 18px; margin: 0 0 15px 0; font-weight: 600;">
                Jai Swaminarayan, ${name}!
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #4A4036; margin: 0 0 25px 0;">
                Thank you for registering with the <strong>SKSS Temple Kampala</strong> community platform. Please use the 6-digit verification code below to verify your email and activate your digital devotee pass.
              </p>

              <!-- OTP Display Box -->
              <div style="background-color: #FAF7F2; border: 2px dashed #C59D5F; border-radius: 14px; padding: 22px; text-align: center; margin: 25px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #8B5E34; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">
                  Your Verification OTP
                </span>
                <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #8B5E34; letter-spacing: 10px; padding: 4px 10px;">
                  ${otp}
                </span>
                <p style="font-size: 12px; color: #786C5E; margin: 10px 0 0 0;">
                  ⏳ Valid for <strong>${expiresInMinutes} minutes</strong>
                </p>
              </div>

              <!-- Security Information -->
              <div style="background-color: #FFFDF9; border-left: 4px solid #C59D5F; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
                <p style="font-size: 12px; line-height: 1.5; color: #66594C; margin: 0;">
                  <strong>🔒 Security Note:</strong> Do not share this one-time passcode with anyone. Mandir administrators will never ask for your verification code.
                </p>
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #786C5E; margin: 0;">
                If you did not initiate this request, you can safely ignore this email. No account will be activated without this verification code.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 25px 30px; text-align: center; border-top: 1px solid rgba(197, 157, 95, 0.15);">
              <p style="font-size: 12px; color: #8B5E34; font-weight: 600; margin: 0 0 4px 0;">
                Shree Kutch Satsang Swaminarayan Temple
              </p>
              <p style="font-size: 11px; color: #786C5E; margin: 0 0 8px 0;">
                Plot 12, Swaminarayan Marg, Kampala, Uganda
              </p>
              <p style="font-size: 10px; color: #A4988B; margin: 0;">
                © ${new Date().getFullYear()} SKSS Temple Kampala. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatches an OTP verification email to the user's email address.
 */
export async function sendDevoteeOtpEmail(options: SendOtpEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  simulated?: boolean;
}> {
  const { to, devoteeName, otp, expiresInMinutes = 10 } = options;
  const html = generateOtpEmailTemplate(devoteeName || '', otp, expiresInMinutes);

  // If SMTP credentials are not configured, log clearly in console and simulate success
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log(`✉️  [MAILER SIMULATION] SMTP not configured. OTP for ${to}: ${otp}`);
    return {
      success: true,
      simulated: true,
    };
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM || `"SKSS Temple Kampala" <${env.SMTP_USER}>`,
      to,
      subject: `🕉️ ${otp} is your SKSS Temple Kampala verification code`,
      text: `Jai Swaminarayan! Your 6-digit verification code for SKSS Temple Kampala is: ${otp}. It expires in ${expiresInMinutes} minutes.`,
      html,
    });

    console.log(`✉️  [MAILER] OTP email sent successfully to ${to} (Message ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`❌  [MAILER ERROR] Failed to send email to ${to}:`, error.message);
    return {
      success: false,
      simulated: false,
    };
  }
}
