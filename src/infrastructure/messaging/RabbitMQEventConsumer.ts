import amqplib, { Channel, ConsumeMessage } from 'amqplib';
import { env } from '../../shared/config/env';

export type MessageHandler = (body: Record<string, unknown>) => Promise<void>;

// Generic consumer kept for future inbound events. It is not wired in app.ts today:
// this service only publishes (payment.*/quotation.rejected) in the choreographed saga.
export class RabbitMQEventConsumer {
  private channel: Channel | null = null;

  async start(handler: MessageHandler): Promise<void> {
    const connection = await amqplib.connect(env.rabbitmq.url);
    this.channel = await connection.createChannel();
    await this.channel.assertQueue(env.rabbitmq.queue, { durable: true });
    await this.channel.prefetch(10);

    await this.channel.consume(env.rabbitmq.queue, (message) => {
      if (!message) return;
      void this.handleMessage(message, handler);
    });
  }

  async stop(): Promise<void> {
    await this.channel?.close();
    this.channel = null;
  }

  private async handleMessage(message: ConsumeMessage, handler: MessageHandler): Promise<void> {
    try {
      const body = JSON.parse(message.content.toString());
      await handler(body);
      this.channel!.ack(message);
    } catch (err) {
      // A malformed payload never becomes valid on retry — requeueing it would loop forever.
      const permanent = err instanceof SyntaxError;
      this.channel!.nack(message, false, !permanent);
    }
  }
}
