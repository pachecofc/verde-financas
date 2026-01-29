import { Router } from 'express';
import { StripeWebhookController } from '../controllers/stripeWebhookController';

const router = Router();

router.post('/', StripeWebhookController.handleWebhook);

export default router;
