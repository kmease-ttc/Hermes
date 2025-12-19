import { google } from "googleapis";
import { storage } from "../storage";

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

  getAuthUrl(): string {
    if (!this.isConfigured) {
      throw new Error('OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  async exchangeCodeForTokens(code: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }
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

  async getAuthenticatedClient() {
    if (!this.isConfigured) {
      throw new Error('OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
    }
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
}

export const googleAuth = new GoogleOAuthManager();
