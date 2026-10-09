/**
 * Email template functions.
 * URLs are PASSED IN — never constructed here.
 * Names are HTML-escaped to prevent XSS.
 */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const baseStyles = `
  body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 40px; text-align: center; }
  .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .header span { color: #4f8ef7; }
  .body { padding: 40px; }
  .body p { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
  .cta-button { display: inline-block; background: #4f8ef7; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 16px 0; }
  .expiry { color: #718096; font-size: 14px; margin-top: 24px; }
  .footer { background: #f7fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; }
  .footer p { color: #a0aec0; font-size: 13px; margin: 0; }
`;

/**
 * Verification email template.
 * @param {string} name - Recipient's first name
 * @param {string} verificationUrl - Pre-built verification URL (token already embedded)
 * @returns {{ subject: string, html: string, text: string }}
 */
export function verificationEmail(name, verificationUrl) {
  const safeName = escapeHtml(name);

  const subject = 'Verify your DealPilot AI account';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Deal<span>Pilot</span> AI</h1>
    </div>
    <div class="body">
      <p>Hi ${safeName},</p>
      <p>Welcome to DealPilot AI! Please verify your email address to activate your account and start connecting with the right investors.</p>
      <p>
        <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #4f8ef7;">${verificationUrl}</p>
      <p class="expiry">This link expires in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>DealPilot AI &mdash; Investor intelligence for founders &mdash; This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${name},

Welcome to DealPilot AI!

Please verify your email address to activate your account:

${verificationUrl}

This link expires in 24 hours.

If you did not create an account, you can safely ignore this email.

-- DealPilot AI Team`;

  return { subject, html, text };
}

/**
 * Password reset email template.
 * @param {string} name - Recipient's first name
 * @param {string} resetUrl - Pre-built reset URL (token already embedded)
 * @returns {{ subject: string, html: string, text: string }}
 */
export function passwordResetEmail(name, resetUrl) {
  const safeName = escapeHtml(name);

  const subject = 'Reset your DealPilot AI password';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>${baseStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Deal<span>Pilot</span> AI</h1>
    </div>
    <div class="body">
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your DealPilot AI password. Click the button below to choose a new password.</p>
      <p>
        <a href="${resetUrl}" class="cta-button">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; font-size: 14px; color: #4f8ef7;">${resetUrl}</p>
      <p class="expiry">This link expires in <strong>1 hour</strong>.</p>
      <p style="color: #718096; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>DealPilot AI &mdash; Investor intelligence for founders &mdash; This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${name},

We received a request to reset your DealPilot AI password.

Click the link below to reset your password:

${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

-- DealPilot AI Team`;

  return { subject, html, text };
}
