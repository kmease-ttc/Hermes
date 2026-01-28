import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  getVerificationToken,
  consumeVerificationToken,
  hashPassword,
  updateUserPassword,
  getUserById,
  verifyUser,
  setCorsHeaders,
  parseRequestBody,
} from "../_lib/auth.js";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token required"),
  password: z.string().min(10, "Password must be at least 10 characters"),
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
    const body = await parseRequestBody(req);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      });
    }

    const { token, password } = parsed.data;

    const resetToken = await getVerificationToken(token, "reset_password");

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset link",
      });
    }

    // Check if token is expired
    if (new Date() > new Date(resetToken.expires_at)) {
      return res.status(400).json({
        success: false,
        error: "Reset link has expired. Please request a new one.",
      });
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await updateUserPassword(resetToken.user_id, passwordHash);

    // Consume the token
    await consumeVerificationToken(resetToken.id);

    // Also verify user if not verified (user proved they own the email)
    const user = await getUserById(resetToken.user_id);
    if (user && !user.verified_at) {
      await verifyUser(user.id);
    }

    return res.json({
      success: true,
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error: any) {
    console.error("[Auth] Reset password error:", error);
    return res.status(500).json({
      success: false,
      error: "Password reset failed",
    });
  }
}
