import { Request, Response, NextFunction } from 'express';
import { ProcessPaymentWebhookUseCase } from '../../../application/use-cases/ProcessPaymentWebhookUseCase';

export class WebhookController {
  constructor(
    private readonly processPaymentWebhook: ProcessPaymentWebhookUseCase,
  ) {}

  async handleMercadoPago(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.processPaymentWebhook.execute(req.body);
      res.status(200).json({ received: true });
    } catch (err) {
      next(err);
    }
  }
}
