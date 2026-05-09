/**
 * SMTP transporter via nodemailer.
 *
 * Per [[0015 - email-own-smtp-via-nodemailer]]: the user provides their own
 * SMTP server; credentials live in env vars. The single transporter is
 * lazy-initialized on first send and cached per warm serverless instance.
 *
 * Env contract (also documented in `.env.example`):
 *   SMTP_HOST  — hostname of the SMTP server
 *   SMTP_PORT  — usually 587 (STARTTLS) or 465 (TLS)
 *   SMTP_USER  — auth username
 *   SMTP_PASS  — auth password / API key
 *   SMTP_FROM  — From: address; e.g. `"K-OS" <noreply@example.com>`
 */

import nodemailer, { type Transporter } from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function readSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portStr || !user || !pass || !from) {
    throw new Error(
      'SMTP env vars not set: require SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM',
    );
  }
  const port = Number.parseInt(portStr, 10);
  if (!Number.isFinite(port)) {
    throw new Error(`SMTP_PORT is not a valid number: ${portStr}`);
  }

  return { host, port, user, pass, from };
}

let cached: { transporter: Transporter; from: string } | null = null;

export function getTransporter(): { transporter: Transporter; from: string } {
  if (cached) return cached;
  const cfg = readSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    // 465 implies implicit TLS; 587 + STARTTLS is the modern default.
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  cached = { transporter, from: cfg.from };
  return cached;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail({ to, subject, text, html }: SendMailInput): Promise<void> {
  const { transporter, from } = getTransporter();
  await transporter.sendMail({ from, to, subject, text, html });
}
