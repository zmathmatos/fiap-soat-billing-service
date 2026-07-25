import express from 'express';
import { quotationRoutes } from './interface/http/routes/quotationRoutes';
import { webhookRoutes } from './interface/http/routes/webhookRoutes';
import { errorHandler } from './interface/http/middlewares/errorHandler';
import { QuotationController } from './interface/http/controllers/QuotationController';
import { WebhookController } from './interface/http/controllers/WebhookController';
import { ApproveQuotationUseCase } from './application/use-cases/ApproveQuotationUseCase';
import { RejectQuotationUseCase } from './application/use-cases/RejectQuotationUseCase';
import { ProcessPaymentWebhookUseCase } from './application/use-cases/ProcessPaymentWebhookUseCase';
import { MongoQuotationRepository } from './infrastructure/database/MongoQuotationRepository';
import { MongoPaymentRepository } from './infrastructure/database/MongoPaymentRepository';
import { NodemailerEmailService } from './infrastructure/email/NodemailerEmailService';
import { MercadoPagoService } from './infrastructure/payment/MercadoPagoService';
import { RabbitMQEventPublisher } from './infrastructure/messaging/RabbitMQEventPublisher';
import { OsServiceClient } from './infrastructure/http/OsServiceClient';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  const quotationRepository = new MongoQuotationRepository();
  const paymentRepository = new MongoPaymentRepository();
  const emailService = new NodemailerEmailService();
  const paymentService = new MercadoPagoService();
  const eventPublisher = new RabbitMQEventPublisher();
  const osServiceClient = new OsServiceClient();

  const approveQuotationUseCase = new ApproveQuotationUseCase(
    quotationRepository,
    paymentRepository,
    emailService,
    paymentService,
  );
  const rejectQuotationUseCase = new RejectQuotationUseCase(
    quotationRepository,
    osServiceClient,
    eventPublisher,
  );
  const processPaymentWebhookUseCase = new ProcessPaymentWebhookUseCase(
    paymentRepository,
    paymentService,
    eventPublisher,
  );

  const quotationController = new QuotationController(approveQuotationUseCase, rejectQuotationUseCase);
  const webhookController = new WebhookController(processPaymentWebhookUseCase);

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/quotations', quotationRoutes(quotationController));
  app.use('/webhooks', webhookRoutes(webhookController));

  app.use(errorHandler);

  return app;
}
