import type { ConsumeMessage } from 'amqplib';

const mockChannel = {
  assertExchange: jest.fn().mockResolvedValue(undefined),
  assertQueue: jest.fn().mockResolvedValue(undefined),
  bindQueue: jest.fn().mockResolvedValue(undefined),
  prefetch: jest.fn().mockResolvedValue(undefined),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
};

const mockConnect = jest.fn().mockResolvedValue(mockConnection);

jest.mock('amqplib', () => ({
  connect: (...args: unknown[]) => mockConnect(...args),
}));

import { RabbitMQQuotationEventConsumer } from '../../../../src/infrastructure/messaging/RabbitMQQuotationEventConsumer';
import type { CreateQuotationUseCase } from '../../../../src/application/use-cases/CreateQuotationUseCase';

type ConsumeCallback = (msg: ConsumeMessage) => void;

const makeMessage = (body: unknown): ConsumeMessage =>
  ({
    fields: { routingKey: 'quotation.requested' },
    content: Buffer.from(JSON.stringify(body)),
  }) as ConsumeMessage;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const validPayload = {
  serviceOrderId: 'so-1',
  serviceOrderNumber: 1001,
  customerId: 'c-1',
  customerEmail: 'test@example.com',
  description: 'Fix brakes',
  amount: 500,
};

describe('RabbitMQQuotationEventConsumer', () => {
  let execute: jest.Mock;
  let consumeCallback: ConsumeCallback;

  beforeEach(async () => {
    jest.clearAllMocks();
    execute = jest.fn().mockResolvedValue(undefined);
    const useCase = { execute } as unknown as CreateQuotationUseCase;

    mockChannel.consume.mockImplementation((_queue: string, cb: ConsumeCallback) => {
      consumeCallback = cb;
    });

    const consumer = new RabbitMQQuotationEventConsumer(useCase);
    await consumer.start();
  });

  it('connects, declares the topic exchange/queue, and binds the routing key', () => {
    expect(mockConnect).toHaveBeenCalled();
    expect(mockChannel.assertExchange).toHaveBeenCalledWith('quotation-events', 'topic', {
      durable: true,
    });
    expect(mockChannel.assertQueue).toHaveBeenCalledWith('billing-service.quotation-events', {
      durable: true,
    });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith(
      'billing-service.quotation-events',
      'quotation-events',
      'quotation.requested',
    );
  });

  it('creates the quotation for a valid message and acks on success', async () => {
    const message = makeMessage(validPayload);

    consumeCallback(message);
    await flushPromises();

    expect(execute).toHaveBeenCalledWith(validPayload);
    expect(mockChannel.ack).toHaveBeenCalledWith(message);
    expect(mockChannel.nack).not.toHaveBeenCalled();
  });

  it('drops the message (nack, no requeue) when a required field is missing', async () => {
    const withoutAmount: Record<string, unknown> = { ...validPayload };
    delete withoutAmount.amount;
    const message = makeMessage(withoutAmount);

    consumeCallback(message);
    await flushPromises();

    expect(execute).not.toHaveBeenCalled();
    expect(mockChannel.nack).toHaveBeenCalledWith(message, false, false);
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });

  it('requeues the message when the use case throws a transient error', async () => {
    execute.mockRejectedValue(new Error('mongo connection reset'));
    const message = makeMessage(validPayload);

    consumeCallback(message);
    await flushPromises();

    expect(mockChannel.nack).toHaveBeenCalledWith(message, false, true);
    expect(mockChannel.ack).not.toHaveBeenCalled();
  });
});
