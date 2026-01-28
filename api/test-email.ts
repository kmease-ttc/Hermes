import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const sgMail = (await import("@sendgrid/mail")).default;
    sgMail.setApiKey(process.env.SendGrid!);

    await sgMail.send({
      to: "kevin.mease@gmail.com",
      from: process.env.SENDGRID_FROM_EMAIL || "noreply@arclo.pro",
      subject: "Arclo - Verify your account (test)",
      text: "This is a test verification email from Arclo.",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Arclo</h1>
        </div>
        <div style="padding: 40px 30px; background: #f9fafb;">
          <h2 style="color: #111827; margin-top: 0;">Test Email</h2>
          <p style="color: #4b5563;">This is a test email to confirm SendGrid delivery is working for Arclo auth.</p>
        </div>
      </div>`,
    });

    return res.json({ success: true, sentTo: "kevin.mease@gmail.com" });
  } catch (e: any) {
    return res.json({ success: false, error: e.message, details: e.response?.body });
  }
}
