import sgMail from "@sendgrid/mail";

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro";

let sgClientInitialized = false;

function ensureSendGridClient() {
  if (sgClientInitialized) return;

  const apiKey = process.env.SendGrid;

  if (!apiKey) {
    throw new Error(
      'SendGrid API key not configured. Please add it as "SendGrid" environment variable.'
    );
  }

  if (!apiKey.startsWith("SG.")) {
    throw new Error('Invalid SendGrid API key format. Key should start with "SG."');
  }

  sgMail.setApiKey(apiKey);
  sgClientInitialized = true;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://arclo.pro";
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  displayName?: string
): Promise<boolean> {
  try {
    ensureSendGridClient();
    const baseUrl = getBaseUrl();
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: "Verify your Arclo account",
      text: `Hi ${displayName || "there"},\n\nPlease verify your email by clicking this link:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an Arclo account, you can ignore this email.\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
          </div>
          <div style="padding: 40px 30px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0;">Verify your email</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hi ${displayName || "there"},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify Email
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This link expires in 24 hours. If you didn't create an Arclo account, you can ignore this email.
            </p>
          </div>
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`[Email] Verification email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send verification email:", error.message);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  displayName?: string
): Promise<boolean> {
  try {
    ensureSendGridClient();
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const msg = {
      to: email,
      from: FROM_EMAIL,
      subject: "Reset your Arclo password",
      text: `Hi ${displayName || "there"},\n\nYou requested to reset your password. Click this link to set a new one:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
          </div>
          <div style="padding: 40px 30px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0;">Reset your password</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hi ${displayName || "there"},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              You requested to reset your password. Click the button below to set a new one:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This link expires in 1 hour. If you didn't request this, you can ignore this email.
            </p>
          </div>
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`[Email] Password reset email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send password reset email:", error.message);
    return false;
  }
}
