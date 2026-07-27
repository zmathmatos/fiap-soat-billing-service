import { ProcessPaymentWebhookUseCase } from '../../../src/application/use-cases/ProcessPaymentWebhookUseCase';
import { IPaymentRepository } from '../../../src/domain/repositories/IPaymentRepository';
import { IPaymentService } from '../../../src/application/services/IPaymentService';
import { Payment } from '../../../src/domain/entities/Payment';
import { AppError } from '../../../src/shared/errors/AppError';

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByQuotationId: jest.fn(),
  findByMercadoPagoPaymentId: jest.fn(),
  update: jest.fn(),
  atomicUpdateWithEvent: jest.fn(),
  findWithPendingEvents: jest.fn(),
  clearPendingEvent: jest.fn(),
};

const mockPaymentService: jest.Mocked<IPaymentService> = {
  createPreference: jest.fn(),
  getPayment: jest.fn(),
};

const makePayment = () =>
  new Payment({
    id: 'p-1',
    quotationId: 'q-1',
    serviceOrderId: 'so-1',
    customerId: 'c-1',
    amount: 500,
  });

const makeUseCase = () => new ProcessPaymentWebhookUseCase(mockPaymentRepo, mockPaymentService);

const webhook = { type: 'payment', data: { id: 'mp-1' } };

describe('ProcessPaymentWebhookUseCase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ignores webhooks that are not payment notifications', async () => {
    await makeUseCase().execute({ type: 'plan', data: { id: 'mp-1' } });

    expect(mockPaymentService.getPayment).not.toHaveBeenCalled();
    expect(mockPaymentRepo.atomicUpdateWithEvent).not.toHaveBeenCalled();
  });

  it('confirms the payment and enqueues payment.approved when Mercado Pago approves it', async () => {
    const payment = makePayment();
    const mpPayload = { status: 'approved', external_reference: 'q-1', id: 'mp-1' };
    mockPaymentService.getPayment.mockResolvedValue(mpPayload);
    mockPaymentRepo.findByQuotationId.mockResolvedValue(payment);
    mockPaymentRepo.atomicUpdateWithEvent.mockResolvedValue(undefined);

    await makeUseCase().execute(webhook);

    expect(payment.status).toBe('approved');
    expect(payment.mercadoPagoPayload).toEqual(mpPayload);
    expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    expect(mockPaymentRepo.atomicUpdateWithEvent).toHaveBeenCalledWith(
      'p-1',
      expect.objectContaining({ status: 'approved' }),
      expect.objectContaining({
        type: 'payment.approved',
        payload: expect.objectContaining({ paymentId: 'p-1', serviceOrderId: 'so-1', amount: 500 }),
      }),
    );
  });

  it.each(['rejected', 'cancelled'])(
    'fails the payment and enqueues payment.failed when Mercado Pago returns %s',
    async (status) => {
      const payment = makePayment();
      mockPaymentService.getPayment.mockResolvedValue({ status, external_reference: 'q-1' });
      mockPaymentRepo.findByQuotationId.mockResolvedValue(payment);
      mockPaymentRepo.atomicUpdateWithEvent.mockResolvedValue(undefined);

      await makeUseCase().execute(webhook);

      expect(payment.status).toBe('failed');
      expect(mockPaymentRepo.update).not.toHaveBeenCalled();
      expect(mockPaymentRepo.atomicUpdateWithEvent).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({ status: 'failed' }),
        expect.objectContaining({
          type: 'payment.failed',
          payload: expect.objectContaining({ paymentId: 'p-1', serviceOrderId: 'so-1' }),
        }),
      );
    },
  );

  it('does nothing for intermediate Mercado Pago statuses', async () => {
    const payment = makePayment();
    mockPaymentService.getPayment.mockResolvedValue({ status: 'in_process', external_reference: 'q-1' });
    mockPaymentRepo.findByQuotationId.mockResolvedValue(payment);

    await makeUseCase().execute(webhook);

    expect(payment.status).toBe('pending');
    expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    expect(mockPaymentRepo.atomicUpdateWithEvent).not.toHaveBeenCalled();
  });

  it('throws 422 when the Mercado Pago payload has no external_reference', async () => {
    mockPaymentService.getPayment.mockResolvedValue({ status: 'approved' });

    await expect(makeUseCase().execute(webhook)).rejects.toThrow(AppError);
    expect(mockPaymentRepo.findByQuotationId).not.toHaveBeenCalled();
  });

  it('throws 404 when no payment matches the quotation', async () => {
    mockPaymentService.getPayment.mockResolvedValue({ status: 'approved', external_reference: 'ghost' });
    mockPaymentRepo.findByQuotationId.mockResolvedValue(null);

    await expect(makeUseCase().execute(webhook)).rejects.toThrow(AppError);
    expect(mockPaymentRepo.atomicUpdateWithEvent).not.toHaveBeenCalled();
  });
});
