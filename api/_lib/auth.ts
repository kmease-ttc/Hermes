import crypto from "crypto";
import { getPool, User, VerificationToken } from "./db.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Password hashing using PBKDF2 (OWASP recommended)
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(verifyHash, "hex")
  );
}

// Session token management (stored in httpOnly cookie)
const SESSION_COOKIE_NAME = "arclo_session";
const SESSION_EXPIRY_DAYS = 30;

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60; // seconds
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

export function getSessionToken(req: VercelRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// Database operations using raw SQL
const pool = () => getPool();

export async function createSession(userId: number): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await pool().query(
    `INSERT INTO verification_tokens (user_id, token, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [userId, token, "session", expiresAt]
  );

  return token;
}

export async function getSessionUser(req: VercelRequest): Promise<User | null> {
  const token = getSessionToken(req);
  if (!token) return null;

  const sessionResult = await pool().query(
    `SELECT * FROM verification_tokens WHERE token = $1 AND purpose = 'session' AND consumed_at IS NULL`,
    [token]
  );

  const session = sessionResult.rows[0];
  if (!session || new Date() > new Date(session.expires_at)) {
    return null;
  }

  const userResult = await pool().query(`SELECT * FROM users WHERE id = $1`, [
    session.user_id,
  ]);

  return userResult.rows[0] || null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool().query(
    `UPDATE verification_tokens SET consumed_at = NOW() WHERE token = $1 AND purpose = 'session'`,
    [token]
  );
}

// Build session user response object
export async function buildSessionUserResponse(user: User) {
  const sitesResult = await pool().query(`SELECT site_id FROM sites`);
  const websites = sitesResult.rows.map((s: any) => s.site_id);

  return {
    user_id: user.id,
    email: user.email,
    display_name: user.display_name,
    websites,
    default_website_id: user.default_website_id,
    plan: user.plan,
    addons: user.addons || {
      content_growth: false,
      competitive_intel: false,
      authority_signals: false,
    },
  };
}

// Storage helpers
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await pool().query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return result.rows[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await pool().query(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  displayName?: string;
  role?: string;
  plan?: string;
  addons?: Record<string, boolean>;
}): Promise<User> {
  const result = await pool().query(
    `INSERT INTO users (email, password_hash, display_name, role, plan, addons)
     VALUES (LOWER($1), $2, $3, $4, $5, $6::jsonb) RETURNING *`,
    [
      data.email,
      data.passwordHash,
      data.displayName || data.email.split("@")[0],
      data.role || "user",
      data.plan || "free",
      JSON.stringify(data.addons || {}),
    ]
  );
  return result.rows[0];
}

export async function updateUserLogin(userId: number): Promise<void> {
  await pool().query(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export async function verifyUser(userId: number): Promise<void> {
  await pool().query(
    `UPDATE users SET verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId]
  );
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  await pool().query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId]
  );
}

// Verification token helpers
export async function createVerificationToken(data: {
  userId: number;
  token: string;
  purpose: string;
  expiresAt: Date;
}): Promise<void> {
  await pool().query(
    `INSERT INTO verification_tokens (user_id, token, purpose, expires_at) VALUES ($1, $2, $3, $4)`,
    [data.userId, data.token, data.purpose, data.expiresAt]
  );
}

export async function getVerificationToken(
  token: string,
  purpose: string
): Promise<VerificationToken | null> {
  const result = await pool().query(
    `SELECT * FROM verification_tokens WHERE token = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [token, purpose]
  );
  return result.rows[0] || null;
}

export async function consumeVerificationToken(tokenId: number): Promise<void> {
  await pool().query(
    `UPDATE verification_tokens SET consumed_at = NOW() WHERE id = $1`,
    [tokenId]
  );
}

export async function deleteUserVerificationTokens(
  userId: number,
  purpose: string
): Promise<void> {
  await pool().query(
    `DELETE FROM verification_tokens WHERE user_id = $1 AND purpose = $2`,
    [userId, purpose]
  );
}

// CORS headers for API responses
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Re-export types
export type { User, VerificationToken };
