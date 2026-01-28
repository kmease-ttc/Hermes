import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSessionToken,
  deleteSession,
  clearSessionCookie,
  setCorsHeaders,
} from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const token = getSessionToken(req);
    if (token) {
      await deleteSession(token);
    }
    clearSessionCookie(res);

    return res.json({ success: true });
  } catch (error: any) {
    console.error("[Auth] Logout error:", error);
    clearSessionCookie(res);
    return res.json({ success: true });
  }
}
