import { Request, Response, NextFunction } from 'express';
import { QuotationController } from '../../../src/interface/http/controllers/QuotationController';
import { WebhookController } from '../../../src/interface/http/controllers/WebhookController';
import { CreateQuotationUseCase } from '../../../src/application/use-cases/CreateQuotationUseCase';
import { ApproveQuotationUseCase } from '../../../src/application/use-cases/ApproveQuotationUseCase';
import { RejectQuotationUseCase } from '../../../src/application/use-cases/RejectQuotationUseCase';
import { ProcessPaymentWebhookUseCase } from '../../../src/application/use-cases/ProcessPaymentWebhookUseCase';

function makeResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
}

const useCase = <T>(execute: jest.Mock) => ({ execute }) as unknown as T;

describe('QuotationController', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => jest.clearAllMocks());

  it('creates a quotation and answers 201', async () => {
    const execute = jest.fn().mockResolvedValue({ id: 'q-1' });
    const controller = new QuotationController(
      useCase<CreateQuotationUseCase>(execute),
      useCase<ApproveQuotationUseCase>(jest.fn()),
      useCase<RejectQuotationUseCase>(jest.fn()),
    );
    const res = makeResponse();

    await controller.create({ body: { amount: 10 } } as Request, res, next);

    expect(execute).toHaveBeenCalledWith({ amount: 10 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'q-1' });
  });

  it('approves a quotation by id', async () => {
    const execute = jest.fn().mockResolvedValue({ id: 'q-1', status: 'approved' });
    const controller = new QuotationController(
      useCase<CreateQuotationUseCase>(jest.fn()),
      useCase<ApproveQuotationUseCase>(execute),
      useCase<RejectQuotationUseCase>(jest.fn()),
    );
    const res = makeResponse();

    await controller.approve({ params: { id: 'q-1' } } as unknown as Request, res, next);

    expect(execute).toHaveBeenCalledWith('q-1');
    expect(res.json).toHaveBeenCalledWith({ id: 'q-1', status: 'approved' });
  });

  it('rejects a quotation by id', async () => {
    const execute = jest.fn().mockResolvedValue({ id: 'q-1', status: 'rejected' });
    const controller = new QuotationController(
      useCase<CreateQuotationUseCase>(jest.fn()),
      useCase<ApproveQuotationUseCase>(jest.fn()),
      useCase<RejectQuotationUseCase>(execute),
    );
    const res = makeResponse();

    await controller.reject({ params: { id: 'q-1' } } as unknown as Request, res, next);

    expect(execute).toHaveBeenCalledWith('q-1');
  });

  it('forwards use case errors to the error middleware', async () => {
    const error = new Error('boom');
    const controller = new QuotationController(
      useCase<CreateQuotationUseCase>(jest.fn().mockRejectedValue(error)),
      useCase<ApproveQuotationUseCase>(jest.fn()),
      useCase<RejectQuotationUseCase>(jest.fn()),
    );
    const res = makeResponse();
    const nextFn = jest.fn();

    await controller.create({ body: {} } as Request, res, nextFn);

    expect(nextFn).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('WebhookController', () => {
  it('acknowledges the Mercado Pago webhook', async () => {
    const execute = jest.fn().mockResolvedValue(undefined);
    const controller = new WebhookController(useCase<ProcessPaymentWebhookUseCase>(execute));
    const res = makeResponse();

    await controller.handleMercadoPago(
      { body: { type: 'payment' } } as Request,
      res,
      jest.fn(),
    );

    expect(execute).toHaveBeenCalledWith({ type: 'payment' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('forwards errors to the error middleware', async () => {
    const error = new Error('boom');
    const controller = new WebhookController(
      useCase<ProcessPaymentWebhookUseCase>(jest.fn().mockRejectedValue(error)),
    );
    const next = jest.fn();

    await controller.handleMercadoPago({ body: {} } as Request, makeResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
