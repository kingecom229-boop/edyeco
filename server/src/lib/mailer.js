import nodemailer from 'nodemailer';
import config from '../config.js';

let transporter;
let lastError = null;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  if (!config.mail.host) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
  return transporter;
}

/**
 * Sends an email when SMTP is configured. Without SMTP (demo / local),
 * messages are logged in a compact preview form so nothing is silently lost.
 */
export async function sendMail({ to, subject, text, html, replyTo }) {
  const tx = getTransporter();
  if (!tx) {
    console.log(`[mail:simulation] → ${to} | ${subject}`);
    return { simulated: true, to, subject };
  }
  try {
    const info = await tx.sendMail({ from: config.mail.from, to, subject, text, html, replyTo });
    lastError = null;
    return { messageId: info.messageId };
  } catch (err) {
    lastError = err;
    console.error('[mail] échec envoi:', err.message);
    return { error: true, message: err.message };
  }
}

export const mailStatus = () => ({
  configured: !!config.mail.host,
  lastError: lastError ? lastError.message : null,
});

export function orderConfirmationEmail(order, items) {
  const lines = items
    .map((i) => `• ${i.quantity} × ${i.name} — ${(i.line_total_cents / 100).toFixed(2)} €`)
    .join('\n');
  return {
    subject: `Votre commande EdyEco ${order.reference} est confirmée`,
    text: `Bonjour ${order.customer_name},\n\nMerci pour votre commande !\n\n${lines}\n\nLivraison : ${order.delivery_method} — ${(order.delivery_fee_cents / 100).toFixed(2)} €\nTotal : ${(order.total_cents / 100).toFixed(2)} €\n\nSuivi : ` +
      `${config.siteUrl}/compte/commandes\n\nÀ très vite,\nL'équipe EdyEco`,
  };
}

export function abandonedCartEmail(cart, items) {
  const lines = items.map((i) => `• ${i.name} — ${(i.price_cents / 100).toFixed(2)} €`).join('\n');
  return {
    subject: 'Votre panier EdyEco vous attend 🌿',
    text: `Bonjour,\n\nVous avez laissé des articles dans votre panier :\n\n${lines}\n\nReprenez votre commande : ${config.siteUrl}/panier\n\nBesoin d'aide ? Répondez simplement à cet email.\n\nL'équipe EdyEco`,
  };
}
