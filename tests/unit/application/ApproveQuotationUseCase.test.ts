import { ApproveQuotationUseCase } from '../../../src/application/use-cases/ApproveQuotationUseCase';
import { IQuotationRepository } from '../../../src/domain/repositories/IQuotationRepository';
import { IPaymentRepository } from '../../../src/domain/repositories/IPaymentRepository';
import { IEmailService } from '../../../src/application/services/IEmailService';
import { IPaymentService } from '../../../src/application/services/IPaymentService';
import { Quotation } from '../../../src/domain/entities/Quotation';
import { AppError } from '../../../src/shared/errors/AppError';

const mockQuotationRepo: jest.Mocked<IQuotationRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByServiceOrderId: jest.fn(),
  update: jest.fn(),
};

const mockPaymentRepo: jest.Mocked<IPaymentRepository> = {
  save: jest.fn(),
  findById: jest.fn(),
  findByQuotationId: jest.fn(),
  findByMercadoPagoPaymentId: jest.fn(),
  update: jest.fn(),
};

const mockEmailService: jest.Mocked<IEmailService> = {
  send: jest.fn(),
};

const mockPaymentService: jest.Mocked<IPaymentService> = {
  createPreference: jest.fn(),
  getPayment: jest.fn(),
};

const makeQuotation = () =>
  new Quotation({
    id: 'q-1',
    serviceOrderId: 'so-1',
    serviceOrderNumber: 1001,
    customerId: 'c-1',
    customerEmail: 'test@example.com',
    description: 'Fix brakes',
    amount: 500,
  });

const makeUseCase = () =>
  new ApproveQuotationUseCase(
    mockQuotationRepo,
    mockPaymentRepo,
    mockEmailService,
    mockPaymentService,
  );

describe('ApproveQuotationUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentService.createPreference.mockResolvedValue({
      preferenceId: 'pref-1',
      initPoint: 'https://mp.example/checkout/pref-1',
    });
  });

  it('approves the quotation and persists it', async () => {
    const quotation = makeQuotation();
    mockQuotationRepo.findById.mockResolvedValue(quotation);

    const result = await makeUseCase().execute('q-1');

    expect(result.status).toBe('approved');
    expect(mockQuotationRepo.update).toHaveBeenCalledWith(quotation);
  });

  it('creates a Mercado Pago preference for the quotation amount', async () => {
    mockQuotationRepo.findById.mockResolvedValue(makeQuotation());

    await makeUseCase().execute('q-1');

    expect(mockPaymentService.createPreference).toHaveBeenCalledWith({
      quotationId: 'q-1',
      title: 'Fix brakes',
      amount: 500,
      payerEmail: 'test@example.com',
    });
  });

  it('saves a pending payment linked to the preference', async () => {
    mockQuotationRepo.findById.mockResolvedValue(makeQuotation());

    await makeUseCase().execute('q-1');

    expect(mockPaymentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        quotationId: 'q-1',
        serviceOrderId: 'so-1',
        amount: 500,
        mercadoPagoPreferenceId: 'pref-1',
        status: 'pending',
      }),
    );
  });

  it('emails the customer the payment link', async () => {
    mockQuotationRepo.findById.mockResolvedValue(makeQuotation());

    await makeUseCase().execute('q-1');

    const [options] = mockEmailService.send.mock.calls[0];
    expect(options.to).toBe('test@example.com');
    expect(options.html).toContain('https://mp.example/checkout/pref-1');
  });

  it('still approves when the email fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockQuotationRepo.findById.mockResolvedValue(makeQuotation());
    mockEmailService.send.mockRejectedValueOnce(new Error('ENOTFOUND mailhog'));

    const result = await makeUseCase().execute('q-1');

    expect(result.status).toBe('approved');
    expect(mockPaymentRepo.save).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'email.send.error', subject: 'quotation.approved' }),
    );

    consoleError.mockRestore();
  });

  it('throws 404 when the quotation does not exist', async () => {
    mockQuotationRepo.findById.mockResolvedValue(null);

    await expect(makeUseCase().execute('missing')).rejects.toThrow(AppError);
    expect(mockPaymentService.createPreference).not.toHaveBeenCalled();
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });
});
