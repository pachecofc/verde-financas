import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../prisma';
import { StripeWebhookService } from '../services/stripeWebhookService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export class StripeWebhookController {
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    if (!webhookSecret) {
      console.error('[Stripe] STRIPE_WEBHOOK_SECRET não configurado');
      res.status(500).json({ error: 'Webhook não configurado' });
      return;
    }
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      res.status(400).json({ error: 'Missing stripe-signature' });
      return;
    }
    let event: Stripe.Event;
    try {
      const payload = req.body as Buffer;
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Stripe] Verificação de assinatura falhou:', message);
      res.status(400).json({ error: `Webhook signature verification failed: ${message}` });
      return;
    }
    try {
      try {
        await prisma.processedStripeEvent.create({
          data: { eventId: event.id },
        });
      } catch (dup: unknown) {
        if (dup && typeof dup === 'object' && 'code' in dup && dup.code === 'P2002') {
          res.status(200).json({ received: true });
          return;
        }
        throw dup;
      }
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await StripeWebhookService.handleCheckoutCompleted({
            customer: session.customer as string | null,
            customer_email: session.customer_email ?? session.customer_details?.email ?? null,
            mode: session.mode ?? undefined,
          });
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await StripeWebhookService.handleSubscriptionDeleted({
            customer: subscription.customer as string,
          });
          break;
        }
        default:
          break;
      }
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('[Stripe] Erro ao processar webhook:', err);
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }
}
