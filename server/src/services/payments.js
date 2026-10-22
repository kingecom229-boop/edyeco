import crypto from 'node:crypto';
import config from '../config.js';

/**
 * Payment abstraction.
 *
 * Today: `simulation` provider — the checkout page collects test card data,
 * validates it, and confirms the order without any real charge.
 *
 * Tomorrow: set PAYMENT_MODE=stripe and implement `stripeProvider` below.
 * The rest of the application only knows `createPaymentIntent` and
 * `confirmPayment`, so switching providers does not touch business logic.
 */

function luhnValid(number) {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function detectBrand(number) {
  const n = number.replace(/\D/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'American Express';
  return 'Carte';
}

const simulationProvider = {
  name: 'simulation',
  createIntent(order) {
    return {
      provider: 'simulation',
      intentId: `sim_${crypto.randomBytes(10).toString('hex')}`,
      amountCents: order.total_cents,
      currency: 'EUR',
      publishableKey: null,
      instructions:
        'Paiement de démonstration : utilisez une carte de test. Aucun débit réel ne sera effectué.',
    };
  },
  confirm({ order, card }) {
    const digits = String(card.number || '').replace(/\s|-/g, '');
    if (!luhnValid(digits)) return { ok: false, error: 'Numéro de carte invalide.' };

    const [mm, yy] = String(card.expiry || '').split('/').map((s) => Number.parseInt(s.trim(), 10));
    const now = new Date();
    const year = yy < 100 ? 2000 + yy : yy;
    if (!mm || !year || mm < 1 || mm > 12) return { ok: false, error: 'Date d’expiration invalide.' };
    const expiry = new Date(year, mm, 1);
    if (expiry <= now) return { ok: false, error: 'Votre carte est expirée.' };
    if (!/^\d{3,4}$/.test(String(card.cvc || ''))) return { ok: false, error: 'Code de sécurité invalide.' };

    // Deterministic test declines, useful for QA and demos.
    if (digits.endsWith('0000') || digits === '4000000000000002') {
      return { ok: false, error: 'Paiement refusé par la banque (carte de test).', declined: true };
    }
    if (Number.isNaN(order.total_cents) || order.total_cents <= 0) {
      return { ok: false, error: 'Montant de commande invalide.' };
    }

    return {
      ok: true,
      provider: 'simulation',
      reference: `SIM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      brand: detectBrand(digits),
      last4: digits.slice(-4),
    };
  },
};

/* --------------------------------------------------------------------------
 * Stripe (ready to enable)
 * --------------------------------------------------------------------------
 * import Stripe from 'stripe';
 * const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;
 *
 * const stripeProvider = {
 *   name: 'stripe',
 *   async createIntent(order) {
 *     const intent = await stripe.paymentIntents.create({
 *       amount: order.total_cents,
 *       currency: 'eur',
 *       metadata: { reference: order.reference },
 *     });
 *     return { provider: 'stripe', intentId: intent.id, clientSecret: intent.client_secret,
 *              amountCents: order.total_cents, currency: 'eur', publishableKey: process.env.STRIPE_PUBLISHABLE_KEY };
 *   },
 *   async confirm({ intentId, paymentMethodId }) {
 *     const intent = await stripe.paymentIntents.confirm(intentId, { payment_method: paymentMethodId });
 *     return intent.status === 'succeeded'
 *       ? { ok: true, provider: 'stripe', reference: intent.id }
 *       : { ok: false, error: 'Paiement non abouti.' };
 *   },
 * };
 * -------------------------------------------------------------------------- */

const provider = config.stripe.mode === 'stripe' ? simulationProvider : simulationProvider;

export const payments = provider;
export default payments;
