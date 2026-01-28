import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
  };

  // Test zod import
  try {
    const { z } = await import("zod");
    results.zod = "ok";
  } catch (e: any) {
    results.zod = `error: ${e.message}`;
  }

  // Test pg import
  try {
    const { Pool } = await import("pg");
    results.pg = "ok";
  } catch (e: any) {
    results.pg = `error: ${e.message}`;
  }

  // Test SendGrid import
  try {
    const sgMail = await import("@sendgrid/mail");
    results.sendgrid = "ok";
  } catch (e: any) {
    results.sendgrid = `error: ${e.message}`;
  }

  // Test database connection
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      ssl: { rejectUnauthorized: false },
    });
    const result = await pool.query("SELECT 1 as test");
    await pool.end();
    results.dbConnection = "ok";
  } catch (e: any) {
    results.dbConnection = `error: ${e.message}`;
  }

  return res.json(results);
}
