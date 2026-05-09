/**
 * Magic-link email template.
 *
 * Per [[0015 - email-own-smtp-via-nodemailer]]: each template is a small
 * function returning `{ subject, text, html }`. Plain-text first, HTML
 * second. No external assets, no inline images — keeps the email small
 * and maximises the chance of inbox delivery.
 *
 * The link points at the SPA, which posts the token to /api/auth/magic-link/verify.
 * The query-param shape `?token=<raw>` is what the frontend route reads.
 */

export interface MagicLinkEmail {
  subject: string;
  text: string;
  html: string;
}

export function magicLinkEmail(opts: {
  appUrl: string;
  rawToken: string;
  expiresInMinutes: number;
}): MagicLinkEmail {
  const link = `${opts.appUrl.replace(/\/$/, '')}/auth/magic-link?token=${encodeURIComponent(opts.rawToken)}`;
  const subject = 'Your K-OS sign-in link';

  const text = [
    'Sign in to K-OS by clicking the link below:',
    '',
    link,
    '',
    `This link expires in ${opts.expiresInMinutes} minutes and can only be used once.`,
    'If you didn\'t request this, you can safely ignore this email.',
    '',
    '— K-OS',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="font-family: -apple-system, system-ui, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p>Sign in to <strong>K-OS</strong> by clicking the button below:</p>
    <p style="margin: 24px 0;">
      <a href="${link}" style="display: inline-block; padding: 12px 20px; background: #5a7a4a; color: #fff; text-decoration: none; border-radius: 6px;">Sign in to K-OS</a>
    </p>
    <p style="color: #555; font-size: 14px;">Or copy this link into your browser:</p>
    <p style="color: #555; font-size: 13px; word-break: break-all;"><a href="${link}" style="color: #5a7a4a;">${link}</a></p>
    <p style="color: #555; font-size: 13px;">This link expires in ${opts.expiresInMinutes} minutes and can only be used once.</p>
    <p style="color: #888; font-size: 12px; margin-top: 32px;">If you didn’t request this, you can safely ignore this email.</p>
  </body>
</html>`;

  return { subject, text, html };
}
