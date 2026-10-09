import nodemailer from 'nodemailer';
import config from '../../config/index.js';
import logger from '../../common/utils/logger.js';
import { ExternalServiceError } from '../../common/errors/index.js';

// In-memory store for test/mock provider
const _sentEmails = [];

export function getSentEmails() {
  return [..._sentEmails];
}

export function clearSentEmails() {
  _sentEmails.length = 0;
}

async function sendViaConsole({ to, subject, text }) {
  logger.info(`[EMAIL:console] To: ${to} | Subject: ${subject}`);
  logger.debug(`[EMAIL:console] Body: ${text}`);
}

async function sendViaTest(emailData) {
  _sentEmails.push({ ...emailData, sentAt: new Date() });
}

async function sendViaSmtp(emailData) {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
  });
  await transporter.sendMail({
    from: config.emailFrom,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });
}

/**
 * Send an email using the configured provider.
 * @param {{ to: string, subject: string, html: string, text: string }} emailData
 */
export async function sendEmail(emailData) {
  try {
    const provider = config.emailProvider;
    // Both 'test' and 'mock' use the in-memory store for hermetic tests
    if (provider === 'test' || provider === 'mock') {
      await sendViaTest(emailData);
    } else if (provider === 'smtp') {
      await sendViaSmtp(emailData);
    } else {
      await sendViaConsole(emailData);
    }
  } catch (err) {
    logger.error('Email send failed', { error: err.message, to: emailData.to });
    throw new ExternalServiceError('Failed to send email', 'email');
  }
}
