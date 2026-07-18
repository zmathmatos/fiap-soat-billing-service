import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { IPaymentService } from '../services/IPaymentService';
import { IEventPublisher } from '../services/IEventPublisher';
import { PaymentWebhookDto } from '../dtos/PaymentWebhookDto';
import { AppError } from '../../shared/errors/AppError';

export class ProcessPaymentWebhookUseCase {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly paymentService: IPaymentService,
    private readonly eventPublisher: IEventPublisher,
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
      await this.paymentRepository.update(payment);

      await this.eventPublisher.publishPaymentApproved({
        paymentId: payment.id,
        serviceOrderId: payment.serviceOrderId,
        amount: payment.amount,
      });
    } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
      payment.fail();
      await this.paymentRepository.update(payment);

      await this.eventPublisher.publishPaymentFailed({
        paymentId: payment.id,
        serviceOrderId: payment.serviceOrderId,
      });
    }
  }
}
