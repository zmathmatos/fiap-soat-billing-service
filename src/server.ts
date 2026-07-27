import { createApp } from './app';
import { connectDatabase } from './infrastructure/database/connection';
import { env } from './shared/config/env';
import { RabbitMQQuotationEventConsumer } from './infrastructure/messaging/RabbitMQQuotationEventConsumer';
import { MongoOutboxPublisher } from './infrastructure/messaging/MongoOutboxPublisher';
import { CreateQuotationUseCase } from './application/use-cases/CreateQuotationUseCase';
import { MongoQuotationRepository } from './infrastructure/database/MongoQuotationRepository';
import { MongoPaymentRepository } from './infrastructure/database/MongoPaymentRepository';
import { NodemailerEmailService } from './infrastructure/email/NodemailerEmailService';
import { RabbitMQEventPublisher } from './infrastructure/messaging/RabbitMQEventPublisher';

const MAX_RETRIES = 10;
const RETRY_DELAY = 3000;

// Fails soft: unlike connectDatabase, exhausting retries here does not exit the
// process — the REST API works without RabbitMQ. But there's no retry after
// giving up, so a broker outage longer than MAX_RETRIES * RETRY_DELAY leaves
// quotation events unconsumed until the service is restarted (mirrors os-service's
// startPaymentEventConsumer).
async function startQuotationEventConsumer(retries = MAX_RETRIES): Promise<void> {
  const useCase = new CreateQuotationUseCase(new MongoQuotationRepository(), new NodemailerEmailService());
  const consumer = new RabbitMQQuotationEventConsumer(useCase);

  for (let i = 1; i <= retries; i++) {
    try {
      await consumer.start();
      return;
    } catch (error) {
      console.error(`RabbitMQ quotation consumer connection attempt ${i}/${retries} failed`, error);
      if (i === retries) {
        console.error(
          'Failed to start RabbitMQ quotation consumer after maximum retries — quotation events will not be processed until the service restarts',
        );
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Billing service running on port ${env.port}`);
  });

  // Runs in the background — the REST API stays up even if RabbitMQ is unreachable.
  void startQuotationEventConsumer();
  new MongoOutboxPublisher(
    new MongoPaymentRepository(),
    new MongoQuotationRepository(),
    new RabbitMQEventPublisher(),
  ).start();
}

bootstrap().catch(console.error);
