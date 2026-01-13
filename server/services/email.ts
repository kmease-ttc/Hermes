import sgMail from '@sendgrid/mail';

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@arclo.pro';

function getSendGridClient() {
  const apiKey = process.env.SendGrid;
  
  if (!apiKey) {
    throw new Error('SendGrid API key not configured. Please add it as a secret named "SendGrid".');
  }
  
  if (!apiKey.startsWith('SG.')) {
    throw new Error('Invalid SendGrid API key format. Key should start with "SG."');
  }
  
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: FROM_EMAIL
  };
}

function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.APP_BASE_URL || 'https://arclo.io';
  }
  // Use REPLIT_DEV_DOMAIN for development (the webview URL)
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return process.env.DEV_BASE_URL || 'https://arclo.io';
}

export async function sendVerificationEmail(email: string, token: string, displayName?: string): Promise<boolean> {
  try {
    console.log(`[Email] Attempting to send verification email to ${email}`);
    const { client, fromEmail } = getSendGridClient();
    console.log(`[Email] SendGrid client ready, from: ${fromEmail}`);
    const baseUrl = getBaseUrl();
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    console.log(`[Email] Verify URL: ${verifyUrl}`);
    
    const msg = {
      to: email,
      from: fromEmail,
      subject: 'Verify your Arclo account',
      text: `Hi ${displayName || 'there'},\n\nPlease verify your email by clicking this link:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an Arclo account, you can ignore this email.\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
          </div>
          <div style="padding: 40px 30px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0;">Verify your email</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hi ${displayName || 'there'},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Verify Email
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This link expires in 24 hours. If you didn't create an Arclo account, you can ignore this email.
            </p>
          </div>
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const response = await client.send(msg);
    console.log(`[Email] Verification email sent to ${email}, status: ${response[0]?.statusCode}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send verification email:', error.message);
    if (error.response) {
      console.error('[Email] SendGrid error body:', JSON.stringify(error.response.body));
    }
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string, displayName?: string): Promise<boolean> {
  try {
    const { client, fromEmail } = getSendGridClient();
    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    const msg = {
      to: email,
      from: fromEmail,
      subject: 'Reset your Arclo password',
      text: `Hi ${displayName || 'there'},\n\nYou requested to reset your password. Click this link to set a new one:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
          </div>
          <div style="padding: 40px 30px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0;">Reset your password</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hi ${displayName || 'there'},
            </p>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              You requested to reset your password. Click the button below to set a new one:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              This link expires in 1 hour. If you didn't request this, you can ignore this email.
            </p>
          </div>
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await client.send(msg);
    console.log(`[Email] Password reset email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send password reset email:', error.message);
    return false;
  }
}

interface MonthlySummaryData {
  displayName?: string;
  siteName: string;
  siteUrl: string;
  period: string;
  actionsCompleted: number;
  newPages: number;
  blogPosts: number;
  technicalFixes: number;
  trafficChange?: string;
  trafficChangeType?: 'positive' | 'negative' | 'neutral';
  visibilityChange?: string;
  visibilityChangeType?: 'positive' | 'negative' | 'neutral';
  topActions: { type: string; description: string }[];
}

export async function sendMonthlySummaryEmail(email: string, data: MonthlySummaryData): Promise<boolean> {
  try {
    const { client, fromEmail } = getSendGridClient();
    const baseUrl = getBaseUrl();
    const dashboardUrl = `${baseUrl}/dashboard`;
    
    const trafficColor = data.trafficChangeType === 'positive' ? '#10b981' : 
                         data.trafficChangeType === 'negative' ? '#ef4444' : '#6b7280';
    const visibilityColor = data.visibilityChangeType === 'positive' ? '#10b981' : 
                            data.visibilityChangeType === 'negative' ? '#ef4444' : '#6b7280';

    const actionsHtml = data.topActions.map(action => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 2px 8px; background: ${
            action.type === 'Content' ? '#f3e8ff' : 
            action.type === 'Technical' ? '#fef3c7' : '#fce7f3'
          }; color: ${
            action.type === 'Content' ? '#7c3aed' : 
            action.type === 'Technical' ? '#d97706' : '#db2777'
          }; border-radius: 9999px; font-size: 12px; font-weight: 500; margin-right: 8px;">
            ${action.type}
          </span>
          <span style="color: #374151; font-size: 14px;">${action.description}</span>
        </td>
      </tr>
    `).join('');

    const msg = {
      to: email,
      from: fromEmail,
      subject: `Your Arclo Monthly Summary - ${data.period}`,
      text: `Hi ${data.displayName || 'there'},\n\nHere's your monthly SEO summary for ${data.siteName}.\n\nActions completed: ${data.actionsCompleted}\nNew pages: ${data.newPages}\nBlog posts: ${data.blogPosts}\nTechnical fixes: ${data.technicalFixes}\n\nTraffic: ${data.trafficChange || 'N/A'}\nVisibility: ${data.visibilityChange || 'N/A'}\n\nView your full dashboard: ${dashboardUrl}\n\nBest,\nThe Arclo Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Monthly SEO Summary</p>
          </div>
          
          <div style="padding: 40px 30px; background: #f9fafb;">
            <h2 style="color: #111827; margin-top: 0; font-size: 20px;">
              Hi ${data.displayName || 'there'},
            </h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Here's what Arclo accomplished for <strong>${data.siteName}</strong> in ${data.period}.
            </p>
            
            <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
              <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 16px;">Actions Completed</h3>
              <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
                  <div style="font-size: 28px; font-weight: bold; color: #8B5CF6;">${data.actionsCompleted}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Total Actions</div>
                </div>
                <div style="flex: 1; min-width: 100px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
                  <div style="font-size: 28px; font-weight: bold; color: #EC4899;">${data.newPages}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">New Pages</div>
                </div>
                <div style="flex: 1; min-width: 100px; text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px;">
                  <div style="font-size: 28px; font-weight: bold; color: #F59E0B;">${data.blogPosts}</div>
                  <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Blog Posts</div>
                </div>
              </div>
            </div>
            
            ${(data.trafficChange || data.visibilityChange) ? `
            <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
              <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 16px;">Performance</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${data.trafficChange ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Website Traffic</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${trafficColor}; font-size: 16px;">${data.trafficChange}</td>
                </tr>
                ` : ''}
                ${data.visibilityChange ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Google Visibility</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${visibilityColor}; font-size: 16px;">${data.visibilityChange}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            ` : ''}
            
            ${data.topActions.length > 0 ? `
            <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
              <h3 style="color: #111827; margin: 0 0 16px 0; font-size: 16px;">Recent Activity</h3>
              <table style="width: 100%; border-collapse: collapse;">
                ${actionsHtml}
              </table>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                View Full Dashboard
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              SEO is a long-term investment. Keep building and the results will compound.
            </p>
          </div>
          
          <div style="padding: 20px 30px; background: #111827; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await client.send(msg);
    console.log(`[Email] Monthly summary email sent to ${email}`);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send monthly summary email:', error.message);
    return false;
  }
}
