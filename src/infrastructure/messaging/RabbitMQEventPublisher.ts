import amqplib, { Channel } from 'amqplib';
import { IEventPublisher } from '../../application/services/IEventPublisher';
import { env } from '../../shared/config/env';

export class RabbitMQEventPublisher implements IEventPublisher {
  private channelPromise: Promise<Channel> | null = null;

  async publishPaymentApproved(payload: Record<string, unknown>): Promise<void> {
    await this.publish('payment.approved', payload);
  }

  async publishPaymentFailed(payload: Record<string, unknown>): Promise<void> {
    await this.publish('payment.failed', payload);
  }

  private async publish(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    const channel = await this.getChannel();
    channel.publish(env.rabbitmq.exchange, routingKey, Buffer.from(JSON.stringify(payload)), {
      contentType: 'application/json',
      persistent: true,
    });
  }

  private getChannel(): Promise<Channel> {
    if (!this.channelPromise) {
      this.channelPromise = amqplib.connect(env.rabbitmq.url).then(async (connection) => {
        const channel = await connection.createChannel();
        await channel.assertExchange(env.rabbitmq.exchange, 'topic', { durable: true });
        return channel;
      });
    }
    return this.channelPromise;
  }
}
