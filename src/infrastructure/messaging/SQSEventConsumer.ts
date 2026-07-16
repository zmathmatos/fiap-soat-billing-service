import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { env } from '../../shared/config/env';

export type MessageHandler = (body: Record<string, unknown>) => Promise<void>;

export class SQSEventConsumer {
  private client = new SQSClient({ region: env.aws.region });
  private polling = false;

  async start(handler: MessageHandler): Promise<void> {
    this.polling = true;
    while (this.polling) {
      await this.poll(handler);
    }
  }

  stop(): void {
    this.polling = false;
  }

  private async poll(handler: MessageHandler): Promise<void> {
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: env.aws.sqsQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }),
    );

    for (const message of response.Messages || []) {
      try {
        const body = JSON.parse(message.Body || '{}');
        await handler(body);
        await this.client.send(
          new DeleteMessageCommand({
            QueueUrl: env.aws.sqsQueueUrl,
            ReceiptHandle: message.ReceiptHandle!,
          }),
        );
      } catch (_err) {
        // Message stays in queue for retry
      }
    }
  }
}
