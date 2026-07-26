import { randomUUID } from 'crypto';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { IPaymentService } from '../services/IPaymentService';
import { PaymentWebhookDto } from '../dtos/PaymentWebhookDto';
import { AppError } from '../../shared/errors/AppError';

export class ProcessPaymentWebhookUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentService: IPaymentService,
  ) {}

  async execute(dto: PaymentWebhookDto): Promise<void> {
    if (dto.type !== 'payment') return;

    const mpPaymentId = dto.data.id;
    const mpPayload = await this.paymentService.getPayment(mpPaymentId);
    const mpStatus = (mpPayload as { status?: string }).status;

    const externalRef = (mpPayload as { external_reference?: string }).external_reference;
    if (!externalRef) throw new AppError('Missing external_reference in payment', 422);

    const payment = await this.paymentRepository.findByQuotationId(externalRef);
    if (!payment) throw new AppError('Payment not found for quotation', 404);

    if (mpStatus === 'approved') {
      payment.confirm(mpPaymentId, mpPayload);
      await this.paymentRepository.atomicUpdateWithEvent(
        payment.id,
        {
          status: payment.status,
          mercadoPagoPaymentId: payment.mercadoPagoPaymentId,
          mercadoPagoPayload: payment.mercadoPagoPayload,
          updatedAt: payment.updatedAt,
        },
        {
          id: randomUUID(),
          type: 'payment.approved',
          payload: {
            paymentId: payment.id,
            serviceOrderId: payment.serviceOrderId,
            amount: payment.amount,
          },
          createdAt: new Date(),
        },
      );
    } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
      payment.fail();
      await this.paymentRepository.atomicUpdateWithEvent(
        payment.id,
        { status: payment.status, updatedAt: payment.updatedAt },
        {
          id: randomUUID(),
          type: 'payment.failed',
          payload: {
            paymentId: payment.id,
            serviceOrderId: payment.serviceOrderId,
          },
          createdAt: new Date(),
        },
      );
    }
  }
}
