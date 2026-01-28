import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import {
  getUserByEmail,
  verifyPassword,
  updateUserLogin,
  createSession,
  setSessionCookie,
  buildSessionUserResponse,
  setCorsHeaders,
  parseRequestBody,
} from "../_lib/auth.js";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
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
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors[0]?.message || "Validation failed",
      });
    }

    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    // Check if user is verified
    if (!user.verified_at) {
      return res.status(403).json({
        success: false,
        error: "Please verify your email before signing in",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    // Update login timestamp
    await updateUserLogin(user.id);

    // Create session
    const sessionToken = await createSession(user.id);
    setSessionCookie(res, sessionToken);

    const sessionUser = await buildSessionUserResponse(user);

    return res.json({
      success: true,
      user: sessionUser,
    });
  } catch (error: any) {
    console.error("[Auth] Login error:", error);
    return res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
}
