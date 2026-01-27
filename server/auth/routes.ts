import type { Express, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "../storage";
import { hashPassword, verifyPassword, getSessionUser, requireAuth } from "./session";
import { sendVerificationEmail, sendPasswordResetEmail, sendSignupNotification } from "../services/email";
import { db } from "../db";
import { sql } from "drizzle-orm";

const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(10, "Password must be at least 10 characters"),
  displayName: z.string().optional(),
  scanId: z.string().optional(),
  websiteUrl: z.string().optional(),
});

const selectWebsiteSchema = z.object({
  website_id: z.string().min(1, "Website ID required"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token required"),
});

const resendVerificationSchema = z.object({
  email: z.string().email("Valid email required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Valid email required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token required"),
  password: z.string().min(10, "Password must be at least 10 characters"),
});

export function registerAuthRoutes(app: Express): void {
  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid email or password" 
        });
      }

      const validPassword = await verifyPassword(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid email or password" 
        });
      }

      // Check if user is verified
      if (!user.verifiedAt) {
        return res.status(403).json({ 
          success: false, 
          error: "Please verify your email before signing in",
          code: "EMAIL_NOT_VERIFIED"
        });
      }

      // Update login timestamp
      await storage.updateUserLogin(user.id);

      // Set session
      req.session.userId = user.id;
      req.session.activeWebsiteId = user.defaultWebsiteId || undefined;

      const sessionUser = await getSessionUser(user.id);

      return res.json({
        success: true,
        user: sessionUser,
      });
    } catch (error: any) {
      console.error("[Auth] Login error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Login failed" 
      });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("[Auth] Logout error:", err);
        return res.status(500).json({ success: false, error: "Logout failed" });
      }
      res.clearCookie('arclo.sid');
      return res.json({ success: true });
    });
  });

  // GET /api/auth/session
  app.get("/api/auth/session", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.json({ authenticated: false });
      }

      const sessionUser = await getSessionUser(req.session.userId);
      if (!sessionUser) {
        req.session.destroy(() => {});
        return res.json({ authenticated: false });
      }

      return res.json({
        authenticated: true,
        user: sessionUser,
        active_website_id: req.session.activeWebsiteId || null,
      });
    } catch (error: any) {
      console.error("[Auth] Session check error:", error);
      return res.json({ authenticated: false });
    }
  });

  // POST /api/auth/register - Create unverified user and send verification email
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { email, password, displayName, scanId, websiteUrl } = parsed.data;

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Tell user they already have an account
        return res.json({ 
          success: true, 
          existingAccount: true,
          message: "An account with this email already exists. Please sign in instead." 
        });
      }

      // Create user (unverified)
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email,
        passwordHash,
        displayName: displayName || email.split('@')[0],
        role: 'user',
        plan: 'free',
        addons: {},
      });

      // Associate scanId with user email if provided
      if (scanId) {
        try {
          await db.execute(sql`
            UPDATE scan_requests 
            SET email = ${email}, updated_at = NOW()
            WHERE scan_id = ${scanId}
          `);
          console.log(`[Auth] Associated scan ${scanId} with user ${email}`);
        } catch (scanErr) {
          console.error("[Auth] Failed to associate scan with user:", scanErr);
        }
      }

      // Generate verification token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

      await storage.createVerificationToken({
        userId: user.id,
        token,
        purpose: 'verify_email',
        expiresAt,
      });

      // Send verification email and signup notification asynchronously
      setImmediate(async () => {
        try {
          const emailSent = await sendVerificationEmail(email, token, displayName || email.split('@')[0]);
          if (!emailSent) {
            console.error("[Auth] Failed to send verification email to:", email);
          }
        } catch (err) {
          console.error("[Auth] Error sending verification email:", err);
        }
        
        // Send signup notification to Kevin
        try {
          await sendSignupNotification({
            email,
            websiteUrl,
            scanId,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error("[Auth] Error sending signup notification:", err);
        }
      });

      // Return immediately - emails are being sent in background
      return res.status(201).json({
        success: true,
        message: "Check your email to verify your account.",
        scanId, // Return scanId so frontend can redirect
      });
    } catch (error: any) {
      console.error("[Auth] Registration error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Registration failed" 
      });
    }
  });

  // POST /api/auth/verify-email
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const parsed = verifyEmailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid token" 
        });
      }

      const { token } = parsed.data;
      
      const verificationToken = await storage.getVerificationToken(token, 'verify_email');
      
      if (!verificationToken) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid or expired verification link" 
        });
      }

      // Check if token is expired
      if (new Date() > verificationToken.expiresAt) {
        return res.status(400).json({ 
          success: false, 
          error: "Verification link has expired. Please request a new one." 
        });
      }

      // Verify user
      await storage.verifyUser(verificationToken.userId);
      
      // Consume the token
      await storage.consumeVerificationToken(verificationToken.id);

      return res.json({
        success: true,
        message: "Email verified successfully. You can now sign in.",
      });
    } catch (error: any) {
      console.error("[Auth] Verify email error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Verification failed" 
      });
    }
  });

  // POST /api/auth/resend-verification
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const parsed = resendVerificationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Valid email required" 
        });
      }

      const { email } = parsed.data;
      
      // Always return success to prevent account enumeration
      const genericResponse = { 
        success: true, 
        message: "If an unverified account exists with this email, a new verification email has been sent." 
      };

      const user = await storage.getUserByEmail(email);
      
      if (!user || user.verifiedAt) {
        // User doesn't exist or is already verified
        return res.json(genericResponse);
      }

      // Delete old verification tokens
      await storage.deleteUserVerificationTokens(user.id, 'verify_email');

      // Generate new verification token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await storage.createVerificationToken({
        userId: user.id,
        token,
        purpose: 'verify_email',
        expiresAt,
      });

      // Send verification email
      console.log("[Auth] Sending verification email to:", email);
      const emailSent = await sendVerificationEmail(email, token, user.displayName || undefined);
      console.log("[Auth] Verification email result:", emailSent ? "sent" : "failed");

      return res.json(genericResponse);
    } catch (error: any) {
      console.error("[Auth] Resend verification error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to resend verification email" 
      });
    }
  });

  // POST /api/auth/forgot-password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Valid email required" 
        });
      }

      const { email } = parsed.data;
      
      // Always return success to prevent account enumeration
      const genericResponse = { 
        success: true, 
        message: "If an account exists with this email, you will receive a password reset link." 
      };

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.json(genericResponse);
      }

      // Delete old reset tokens
      await storage.deleteUserVerificationTokens(user.id, 'reset_password');

      // Generate reset token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      await storage.createVerificationToken({
        userId: user.id,
        token,
        purpose: 'reset_password',
        expiresAt,
      });

      // Send reset email
      const emailSent = await sendPasswordResetEmail(email, token, user.displayName || undefined);
      console.log("[Auth] Password reset email result:", emailSent ? "sent" : "failed");

      return res.json(genericResponse);
    } catch (error: any) {
      console.error("[Auth] Forgot password error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to send password reset email" 
      });
    }
  });

  // POST /api/auth/reset-password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { token, password } = parsed.data;
      
      const resetToken = await storage.getVerificationToken(token, 'reset_password');
      
      if (!resetToken) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid or expired reset link" 
        });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ 
          success: false, 
          error: "Reset link has expired. Please request a new one." 
        });
      }

      // Update password
      const passwordHash = await hashPassword(password);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      
      // Consume the token
      await storage.consumeVerificationToken(resetToken.id);

      // Also verify user if not verified (user proved they own the email)
      const user = await storage.getUserById(resetToken.userId);
      if (user && !user.verifiedAt) {
        await storage.verifyUser(user.id);
      }

      return res.json({
        success: true,
        message: "Password reset successfully. You can now sign in with your new password.",
      });
    } catch (error: any) {
      console.error("[Auth] Reset password error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Password reset failed" 
      });
    }
  });

  // POST /api/websites/select - Select active website
  app.post("/api/websites/select", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = selectWebsiteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: parsed.error.errors[0]?.message || "Validation failed" 
        });
      }

      const { website_id } = parsed.data;
      const userId = req.session.userId!;

      // Verify user has access to this website
      const userWebsites = await storage.getUserWebsites(userId);
      if (!userWebsites.includes(website_id)) {
        return res.status(403).json({ 
          success: false, 
          error: "Access denied to this website" 
        });
      }

      // Update session and user default
      req.session.activeWebsiteId = website_id;
      await storage.updateUserDefaultWebsite(userId, website_id);

      return res.json({
        success: true,
        active_website_id: website_id,
      });
    } catch (error: any) {
      console.error("[Auth] Select website error:", error);
      return res.status(500).json({ 
        success: false, 
        error: "Failed to select website" 
      });
    }
  });
}
