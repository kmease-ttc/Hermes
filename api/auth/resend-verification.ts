import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import crypto from "crypto";
import {
  getUserByEmail,
  deleteUserVerificationTokens,
  createVerificationToken,
  setCorsHeaders,
} from "../_lib/auth";
import { sendVerificationEmail } from "../_lib/email";

const resendVerificationSchema = z.object({
  email: z.string().email("Valid email required"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Valid email required",
      });
    }

    const { email } = parsed.data;

    // Always return success to prevent account enumeration
    const genericResponse = {
      success: true,
      message: "If an unverified account exists with this email, a new verification email has been sent.",
    };

    const user = await getUserByEmail(email);

    if (!user || user.verifiedAt) {
      // User doesn't exist or is already verified
      return res.json(genericResponse);
    }

    // Delete old verification tokens
    await deleteUserVerificationTokens(user.id, "verify_email");

    // Generate new verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await createVerificationToken({
      userId: user.id,
      token,
      purpose: "verify_email",
      expiresAt,
    });

    // Send verification email
    sendVerificationEmail(email, token, user.displayName || undefined).catch((err) =>
      console.error("[Auth] Error sending verification email:", err)
    );

    return res.json(genericResponse);
  } catch (error: any) {
    console.error("[Auth] Resend verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to resend verification email",
    });
  }
}
