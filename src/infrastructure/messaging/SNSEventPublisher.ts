import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { IEventPublisher } from '../../application/services/IEventPublisher';
import { env } from '../../shared/config/env';

export class SNSEventPublisher implements IEventPublisher {
  private client = new SNSClient({ region: env.aws.region });

  async publishPaymentApproved(payload: Record<string, unknown>): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: env.aws.snsPaymentApprovedTopicArn,
        Message: JSON.stringify(payload),
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: 'payment.approved' },
        },
      }),
    );
  }

  async publishPaymentFailed(payload: Record<string, unknown>): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: env.aws.snsPaymentFailedTopicArn,
        Message: JSON.stringify(payload),
        MessageAttributes: {
          eventType: { DataType: 'String', StringValue: 'payment.failed' },
        },
      }),
    );
  }
}
