import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // Test importing auth lib
  try {
    const auth = await import("./_lib/auth.js");
    results.authImport = "ok";
    results.authExports = Object.keys(auth);
  } catch (e: any) {
    results.authImport = `error: ${e.message}`;
    results.authStack = e.stack?.substring(0, 500);
  }

  // Test importing email lib
  try {
    const email = await import("./_lib/email.js");
    results.emailImport = "ok";
  } catch (e: any) {
    results.emailImport = `error: ${e.message}`;
  }

  // Test importing db lib
  try {
    const db = await import("./_lib/db.js");
    results.dbImport = "ok";
  } catch (e: any) {
    results.dbImport = `error: ${e.message}`;
  }

  return res.json(results);
}
