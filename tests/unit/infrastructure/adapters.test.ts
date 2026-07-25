import { Request, Response } from 'express';

const mockPost = jest.fn();
jest.mock('axios', () => ({ post: (...args: unknown[]) => mockPost(...args) }));

const mockChannel = {
  assertExchange: jest.fn().mockResolvedValue(undefined),
  publish: jest.fn().mockReturnValue(true),
};
const mockConnect = jest.fn().mockResolvedValue({
  createChannel: jest.fn().mockResolvedValue(mockChannel),
});
jest.mock('amqplib', () => ({ connect: (...args: unknown[]) => mockConnect(...args) }));

import { OsServiceClient } from '../../../src/infrastructure/http/OsServiceClient';
import { RabbitMQEventPublisher } from '../../../src/infrastructure/messaging/RabbitMQEventPublisher';
import { errorHandler } from '../../../src/interface/http/middlewares/errorHandler';
import { AppError } from '../../../src/shared/errors/AppError';

describe('OsServiceClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the quotation.rejected event to the os-service', async () => {
    mockPost.mockResolvedValue({ status: 204 });

    await new OsServiceClient().updateStatusToFinished('so-1');

    const [url, body] = mockPost.mock.calls[0];
    expect(url).toContain('/service-orders/so-1/events');
    expect(body).toEqual({ event: 'quotation.rejected' });
  });
});

describe('RabbitMQEventPublisher', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['publishPaymentApproved', 'payment.approved'],
    ['publishPaymentFailed', 'payment.failed'],
    ['publishQuotationRejected', 'quotation.rejected'],
  ])('%s publishes with routing key %s', async (method, routingKey) => {
    const publisher = new RabbitMQEventPublisher();

    await (publisher[method as keyof RabbitMQEventPublisher] as (p: Record<string, unknown>) => Promise<void>)(
      { serviceOrderId: 'so-1' },
    );

    expect(mockChannel.assertExchange).toHaveBeenCalledWith(
      expect.any(String),
      'topic',
      { durable: true },
    );
    expect(mockChannel.publish).toHaveBeenCalledWith(
      expect.any(String),
      routingKey,
      expect.any(Buffer),
      expect.objectContaining({ persistent: true, messageId: expect.any(String) }),
    );
  });

  it('reuses a single channel across publishes', async () => {
    const publisher = new RabbitMQEventPublisher();

    await publisher.publishPaymentApproved({ serviceOrderId: 'so-1' });
    await publisher.publishPaymentFailed({ serviceOrderId: 'so-1' });

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockChannel.publish).toHaveBeenCalledTimes(2);
  });
});

describe('errorHandler', () => {
  function makeResponse() {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
  }

  it('maps AppError to its status code', () => {
    const res = makeResponse();

    errorHandler(new AppError('Quotation not found', 404), {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Quotation not found' });
  });

  it('maps unexpected errors to 500', () => {
    const res = makeResponse();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    errorHandler(new Error('boom'), {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
