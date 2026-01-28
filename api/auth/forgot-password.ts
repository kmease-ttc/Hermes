import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import crypto from "crypto";
import {
  getUserByEmail,
  deleteUserVerificationTokens,
  createVerificationToken,
  setCorsHeaders,
} from "../_lib/auth.js";
import { sendPasswordResetEmail } from "../_lib/email.js";

const forgotPasswordSchema = z.object({
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
    const parsed = forgotPasswordSchema.safeParse(req.body);
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
      message: "If an account exists with this email, you will receive a password reset link.",
    };

    const user = await getUserByEmail(email);

    if (!user) {
      return res.json(genericResponse);
    }

    // Delete old reset tokens
    await deleteUserVerificationTokens(user.id, "reset_password");

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    await createVerificationToken({
      userId: user.id,
      token,
      purpose: "reset_password",
      expiresAt,
    });

    // Send reset email
    sendPasswordResetEmail(email, token, user.display_name || undefined).catch((err) =>
      console.error("[Auth] Error sending password reset email:", err)
    );

    return res.json(genericResponse);
  } catch (error: any) {
    console.error("[Auth] Forgot password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to send password reset email",
    });
  }
}
