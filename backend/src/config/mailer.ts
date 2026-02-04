// backend/src/config/mailer.ts
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;

/**
 * Envia e-mail usando Resend (API HTTPS).
 * Use quando estiver em ambiente que bloqueia SMTP (ex.: Render plano gratuito).
 * Configure RESEND_API_KEY e opcionalmente EMAIL_FROM no .env.
 */
async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }
  const from = EMAIL_FROM || 'onboarding@resend.dev';
  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: from.trim(),
    to: [to],
    subject,
    html,
  });
  if (error) {
    console.error('Resend API error:', error);
    throw new Error(error.message || 'Failed to send email via Resend');
  }
  console.log(`Email sent to ${to} (Resend)`);
}

/**
 * Envia e-mail via SMTP (nodemailer).
 * Em planos gratuitos do Render, portas SMTP (25, 465, 587) são bloqueadas.
 * Use RESEND_API_KEY nesses casos ou faça upgrade para instância paga.
 */
function createSmtpTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_PORT === '465';

  if (!host || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error(
      'SMTP requires EMAIL_HOST, EMAIL_USER and EMAIL_PASS. For Render free tier use RESEND_API_KEY instead (SMTP ports are blocked).'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });
}

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    if (RESEND_API_KEY) {
      await sendViaResend(to, subject, html);
      return;
    }

    const transporter = createSmtpTransporter();
    const from = EMAIL_FROM || process.env.EMAIL_USER;

    if (!from) {
      throw new Error('EMAIL_FROM or EMAIL_USER must be set for sending email');
    }

    await transporter.sendMail({
      from: from.trim(),
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to} (SMTP)`);
  } catch (error) {
    console.error('Error sending email:', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    if (
      typeof (error as NodeJS.ErrnoException)?.code === 'string' &&
      ((error as NodeJS.ErrnoException).code === 'ETIMEDOUT' ||
        (error as NodeJS.ErrnoException).code === 'ECONNREFUSED')
    ) {
      throw new Error(
        'Email connection failed (timeout or refused). On Render free tier, SMTP is blocked: set RESEND_API_KEY and use Resend instead. See .env.example.'
      );
    }
    throw new Error(message);
  }
};
