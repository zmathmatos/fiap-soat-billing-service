import amqplib, { Channel, ConsumeMessage } from 'amqplib';
import { env } from '../../shared/config/env';

export type MessageHandler = (body: Record<string, unknown>) => Promise<void>;

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
    } catch (_err) {
      // Requeue for retry
      this.channel!.nack(message, false, true);
    }
  }
}
