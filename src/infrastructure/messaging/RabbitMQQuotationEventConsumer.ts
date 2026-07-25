import amqplib, { Channel, ConsumeMessage } from 'amqplib';
import { CreateQuotationUseCase } from '../../application/use-cases/CreateQuotationUseCase';
import { CreateQuotationDto } from '../../application/dtos/CreateQuotationDto';
import { env } from '../../shared/config/env';

const ROUTING_KEY = 'quotation.requested';

const PERMANENT_FAILURE = /Missing required field|Invalid payload/i;

export class RabbitMQQuotationEventConsumer {
  private channel: Channel | null = null;

  constructor(private readonly createQuotationUseCase: CreateQuotationUseCase) {}

  async start(): Promise<void> {
    const connection = await amqplib.connect(env.rabbitmq.url);
    const channel = await connection.createChannel();
    this.channel = channel;

    await channel.assertExchange(env.rabbitmq.quotationExchange, 'topic', { durable: true });
    await channel.assertQueue(env.rabbitmq.quotationQueue, { durable: true });
    await channel.bindQueue(env.rabbitmq.quotationQueue, env.rabbitmq.quotationExchange, ROUTING_KEY);
    await channel.prefetch(10);

    await channel.consume(env.rabbitmq.quotationQueue, (message) => {
      if (!message) return;
      void this.handleMessage(message);
    });

    console.log(
      `RabbitMQ quotation consumer listening on queue "${env.rabbitmq.quotationQueue}"`,
    );
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    this.channel = null;
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    const channel = this.channel;
    if (!channel) return;

    try {
      const payload = JSON.parse(message.content.toString());
      const dto = this.validate(payload);
      await this.createQuotationUseCase.execute(dto);
      channel.ack(message);
    } catch (error) {
      const isPermanentFailure = error instanceof Error && PERMANENT_FAILURE.test(error.message);
      console.error(`Failed to process "${ROUTING_KEY}" event from RabbitMQ`, error);
      channel.nack(message, false, !isPermanentFailure);
    }
  }

  private validate(payload: unknown): CreateQuotationDto {
    const body = payload as Partial<CreateQuotationDto> | null;

    const requiredStringFields: Array<keyof CreateQuotationDto> = [
      'serviceOrderId',
      'customerId',
      'customerEmail',
      'description',
    ];

    for (const field of requiredStringFields) {
      if (!body || typeof body[field] !== 'string' || body[field] === '') {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (typeof body?.serviceOrderNumber !== 'number' || !Number.isFinite(body.serviceOrderNumber)) {
      throw new Error('Missing required field: serviceOrderNumber');
    }

    if (typeof body?.amount !== 'number' || !Number.isFinite(body.amount)) {
      throw new Error('Missing required field: amount');
    }

    return body as CreateQuotationDto;
  }
}
