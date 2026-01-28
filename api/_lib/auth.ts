import crypto from "crypto";
import { getDb, schema } from "./db";
import { eq, and, isNull } from "drizzle-orm";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const { users, verificationTokens, sites } = schema;

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

// User session storage in verification_tokens table (purpose = 'session')
export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  await db.insert(verificationTokens).values({
    userId,
    token,
    purpose: "session",
    expiresAt,
  });

  return token;
}

export async function getSessionUser(req: VercelRequest): Promise<schema.User | null> {
  const token = getSessionToken(req);
  if (!token) return null;

  const db = getDb();
  const [session] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, "session"),
        isNull(verificationTokens.consumedAt)
      )
    )
    .limit(1);

  if (!session || new Date() > session.expiresAt) {
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user || null;
}

export async function deleteSession(token: string): Promise<void> {
  const db = getDb();
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, "session")
      )
    );
}

// Build session user response object
export async function buildSessionUserResponse(user: schema.User) {
  const db = getDb();

  // Get user's websites
  const allSites = await db.select({ siteId: sites.siteId }).from(sites);
  const websites = allSites.map((s) => s.siteId);

  return {
    user_id: user.id,
    email: user.email,
    display_name: user.displayName,
    websites,
    default_website_id: user.defaultWebsiteId,
    plan: user.plan,
    addons: {
      content_growth: user.addons?.content_growth ?? false,
      competitive_intel: user.addons?.competitive_intel ?? false,
      authority_signals: user.addons?.authority_signals ?? false,
    },
  };
}

// Storage helpers
export async function getUserByEmail(email: string): Promise<schema.User | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user || null;
}

export async function getUserById(id: number): Promise<schema.User | null> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user || null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  displayName?: string;
  role?: string;
  plan?: string;
  addons?: Record<string, boolean>;
}): Promise<schema.User> {
  const db = getDb();
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      displayName: data.displayName || data.email.split("@")[0],
      role: data.role || "user",
      plan: data.plan || "free",
      addons: data.addons || {},
    })
    .returning();
  return user;
}

export async function updateUserLogin(userId: number): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function verifyUser(userId: number): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string
): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// Verification token helpers
export async function createVerificationToken(data: {
  userId: number;
  token: string;
  purpose: string;
  expiresAt: Date;
}): Promise<void> {
  const db = getDb();
  await db.insert(verificationTokens).values(data);
}

export async function getVerificationToken(
  token: string,
  purpose: string
): Promise<schema.VerificationToken | null> {
  const db = getDb();
  const [result] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.token, token),
        eq(verificationTokens.purpose, purpose),
        isNull(verificationTokens.consumedAt)
      )
    )
    .limit(1);
  return result || null;
}

export async function consumeVerificationToken(tokenId: number): Promise<void> {
  const db = getDb();
  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, tokenId));
}

export async function deleteUserVerificationTokens(
  userId: number,
  purpose: string
): Promise<void> {
  const db = getDb();
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.userId, userId),
        eq(verificationTokens.purpose, purpose)
      )
    );
}

// CORS headers for API responses
export function setCorsHeaders(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
