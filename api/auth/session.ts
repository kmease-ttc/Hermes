import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getSessionUser,
  buildSessionUserResponse,
  getSessionToken,
  setCorsHeaders,
} from "../_lib/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const user = await getSessionUser(req);

    if (!user) {
      return res.json({ authenticated: false });
    }

    const sessionUser = await buildSessionUserResponse(user);

    return res.json({
      authenticated: true,
      user: sessionUser,
      active_website_id: user.defaultWebsiteId || null,
    });
  } catch (error: any) {
    console.error("[Auth] Session check error:", error);
    return res.json({ authenticated: false });
  }
}
