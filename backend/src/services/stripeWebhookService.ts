import { prisma } from '../prisma';
import { UserService } from './userService';

export class StripeWebhookService {
  /**
   * checkout.session.completed: usuário concluiu pagamento/assinatura.
   * Identifica por customer_email, atualiza plan=PREMIUM e grava stripeCustomerId.
   */
  static async handleCheckoutCompleted(session: {
    customer?: string | null;
    customer_email?: string | null;
    mode?: string;
  }): Promise<void> {
    const email = session.customer_email?.trim();
    const customerId = session.customer ? String(session.customer) : null;
    if (!email) {
      console.warn('[Stripe] checkout.session.completed sem customer_email');
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn('[Stripe] Usuário não encontrado para email:', email);
      return;
    }
    await UserService.updateUserProfile(user.id, {
      plan: 'PREMIUM',
      stripeCustomerId: customerId,
    });
  }

  /**
   * customer.subscription.deleted: assinatura cancelada.
   * Busca usuário por stripeCustomerId e define plan=BASIC.
   */
  static async handleSubscriptionDeleted(subscription: { customer: string }): Promise<void> {
    const stripeCustomerId = String(subscription.customer);
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId },
    });
    if (!user) {
      console.warn('[Stripe] Usuário não encontrado para stripeCustomerId:', stripeCustomerId);
      return;
    }
    await UserService.updateUserProfile(user.id, {
      plan: 'BASIC',
      stripeCustomerId: null,
    });
  }
}
