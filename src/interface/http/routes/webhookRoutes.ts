import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';

export function webhookRoutes(controller: WebhookController): Router {
  const router = Router();

  router.post('/mercadopago', (req, res, next) => controller.handleMercadoPago(req, res, next));

  return router;
}
