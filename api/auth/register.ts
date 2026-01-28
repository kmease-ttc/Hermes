import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import crypto from "crypto";
import {
  getUserByEmail,
  createUser,
  hashPassword,
  createVerificationToken,
  setCorsHeaders,
} from "../_lib/auth";
import { sendVerificationEmail } from "../_lib/email";

const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(10, "Password must be at least 10 characters"),
  displayName: z.string().optional(),
  scanId: z.string().optional(),
  websiteUrl: z.string().optional(),
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
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      });
    }

    const { email, password, displayName, scanId } = parsed.data;

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.json({
        success: true,
        existingAccount: true,
        message: "An account with this email already exists. Please sign in instead.",
      });
    }

    // Create user (unverified)
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      displayName: displayName || email.split("@")[0],
      role: "user",
      plan: "free",
      addons: {},
    });

    // Generate verification token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    await createVerificationToken({
      userId: user.id,
      token,
      purpose: "verify_email",
      expiresAt,
    });

    // Send verification email (don't wait for it)
    sendVerificationEmail(email, token, displayName || email.split("@")[0]).catch(
      (err) => console.error("[Auth] Error sending verification email:", err)
    );

    return res.status(201).json({
      success: true,
      message: "Check your email to verify your account.",
      scanId,
    });
  } catch (error: any) {
    console.error("[Auth] Registration error:", error);
    return res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
}
