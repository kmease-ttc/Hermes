import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  getVerificationToken,
  consumeVerificationToken,
  verifyUser,
  setCorsHeaders,
} from "../_lib/auth";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token required"),
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
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid token",
      });
    }

    const { token } = parsed.data;

    const verificationToken = await getVerificationToken(token, "verify_email");

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification link",
      });
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      return res.status(400).json({
        success: false,
        error: "Verification link has expired. Please request a new one.",
      });
    }

    // Verify user
    await verifyUser(verificationToken.userId);

    // Consume the token
    await consumeVerificationToken(verificationToken.id);

    return res.json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error: any) {
    console.error("[Auth] Verify email error:", error);
    return res.status(500).json({
      success: false,
      error: "Verification failed",
    });
  }
}
