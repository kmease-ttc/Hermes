import { google } from "googleapis";
import { storage } from "../storage";
import type { SiteGoogleCredentials } from "@shared/schema";

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/adwords',
];

export class GoogleOAuthManager {
  private oauth2Client;
  private isConfigured: boolean;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/callback';

    if (!clientId || !clientSecret) {
      console.warn('[OAuth] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set. OAuth features will be disabled.');
      this.isConfigured = false;
      this.oauth2Client = new google.auth.OAuth2('', '', '');
      return;
    }

    this.isConfigured = true;
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new Error('OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL (legacy) methods — use the single-row oauth_tokens table
  // ═══════════════════════════════════════════════════════════════════════════

  getAuthUrl(): string {
    this.ensureConfigured();
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string): Promise<void> {
    this.ensureConfigured();
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.expiry_date) {
      throw new Error('Failed to obtain access token');
    }

    await storage.saveToken({
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      expiresAt: new Date(tokens.expiry_date),
      scope: SCOPES.join(' '),
    });

    this.oauth2Client.setCredentials(tokens);
  }

  async getAuthenticatedClient(): Promise<InstanceType<typeof google.auth.OAuth2>> {
    this.ensureConfigured();
    const token = await storage.getToken('google');

    if (!token) {
      throw new Error('No OAuth token found. Please authenticate first.');
    }

    if (new Date() >= token.expiresAt) {
      console.log('[OAuth] Token expired, refreshing...');
      await this.refreshToken();
      return this.getAuthenticatedClient();
    }

    this.oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken || undefined,
    });

    return this.oauth2Client;
  }

  private async refreshToken(): Promise<void> {
    const token = await storage.getToken('google');

    if (!token || !token.refreshToken) {
      throw new Error('No refresh token available. Re-authentication required.');
    }

    this.oauth2Client.setCredentials({
      refresh_token: token.refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('Failed to refresh access token');
    }

    await storage.updateToken('google', {
      accessToken: credentials.access_token,
      expiresAt: new Date(credentials.expiry_date),
    });

    console.log('[OAuth] Token refreshed successfully');
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await storage.getToken('google');
      return !!token;
    } catch {
      return false;
    }
  }

  async getTokens(): Promise<{ access_token: string; refresh_token: string | null } | null> {
    try {
      const token = await storage.getToken('google');
      if (!token) return null;

      if (new Date() >= token.expiresAt && token.refreshToken) {
        await this.refreshToken();
        const refreshedToken = await storage.getToken('google');
        if (refreshedToken) {
          return {
            access_token: refreshedToken.accessToken,
            refresh_token: refreshedToken.refreshToken,
          };
        }
      }

      return {
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
      };
    } catch {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PER-SITE methods — use site_google_credentials table
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate OAuth URL with site ID encoded in state parameter.
   */
  getAuthUrlForSite(siteId: number): string {
    this.ensureConfigured();
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: JSON.stringify({ siteId }),
    });
  }

  /**
   * Exchange authorization code and save tokens to site_google_credentials.
   */
  async exchangeCodeForSiteTokens(code: string, siteId: number): Promise<SiteGoogleCredentials> {
    this.ensureConfigured();
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.expiry_date) {
      throw new Error('Failed to obtain access token');
    }

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. User may need to revoke access and re-authorize.');
    }

    // Fetch the Google email associated with this token
    const tempClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    tempClient.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: tempClient });
    let googleEmail: string | undefined;
    try {
      const userInfo = await oauth2.userinfo.get();
      googleEmail = userInfo.data.email || undefined;
    } catch {
      // Non-fatal: email is informational
    }

    return storage.upsertSiteGoogleCredentials({
      siteId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: new Date(tokens.expiry_date),
      scopes: SCOPES,
      googleEmail: googleEmail || null,
    });
  }

  /**
   * Get an authenticated OAuth2Client for a specific site.
   * Automatically refreshes expired tokens.
   */
  async getAuthenticatedClientForSite(siteId: number): Promise<InstanceType<typeof google.auth.OAuth2>> {
    this.ensureConfigured();
    const creds = await storage.getSiteGoogleCredentials(siteId);

    if (!creds) {
      throw new Error(`No Google credentials found for site ${siteId}. Connect Google first.`);
    }

    if (new Date() >= creds.tokenExpiry) {
      console.log(`[OAuth] Site ${siteId} token expired, refreshing...`);
      await this.refreshSiteToken(siteId, creds);
      return this.getAuthenticatedClientForSite(siteId);
    }

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    client.setCredentials({
      access_token: creds.accessToken,
      refresh_token: creds.refreshToken,
    });

    return client;
  }

  /**
   * Get raw tokens for a specific site (used by Ads connector).
   */
  async getTokensForSite(siteId: number): Promise<{ access_token: string; refresh_token: string } | null> {
    try {
      const creds = await storage.getSiteGoogleCredentials(siteId);
      if (!creds) return null;

      if (new Date() >= creds.tokenExpiry) {
        await this.refreshSiteToken(siteId, creds);
        const refreshed = await storage.getSiteGoogleCredentials(siteId);
        if (refreshed) {
          return {
            access_token: refreshed.accessToken,
            refresh_token: refreshed.refreshToken,
          };
        }
      }

      return {
        access_token: creds.accessToken,
        refresh_token: creds.refreshToken,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if a site has Google credentials connected.
   */
  async isSiteAuthenticated(siteId: number): Promise<boolean> {
    try {
      const creds = await storage.getSiteGoogleCredentials(siteId);
      return !!creds;
    } catch {
      return false;
    }
  }

  private async refreshSiteToken(siteId: number, creds: SiteGoogleCredentials): Promise<void> {
    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    client.setCredentials({
      refresh_token: creds.refreshToken,
    });

    const { credentials } = await client.refreshAccessToken();

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error(`Failed to refresh access token for site ${siteId}`);
    }

    await storage.updateSiteGoogleCredentials(siteId, {
      accessToken: credentials.access_token,
      tokenExpiry: new Date(credentials.expiry_date),
    });

    console.log(`[OAuth] Site ${siteId} token refreshed successfully`);
  }
}

export const googleAuth = new GoogleOAuthManager();
