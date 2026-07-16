import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository';
import { IPaymentRepository } from '../../domain/repositories/IPaymentRepository';
import { IEmailService } from '../services/IEmailService';
import { IPaymentService } from '../services/IPaymentService';
import { AppError } from '../../shared/errors/AppError';
import { Payment } from '../../domain/entities/Payment';
import { QuotationResponseDto } from '../dtos/QuotationResponseDto';

export class ApproveQuotationUseCase {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly paymentRepository: IPaymentRepository,
    private readonly emailService: IEmailService,
    private readonly paymentService: IPaymentService,
  ) {}

  async execute(quotationId: string): Promise<QuotationResponseDto> {
    const quotation = await this.quotationRepository.findById(quotationId);
    if (!quotation) throw new AppError('Quotation not found', 404);

    quotation.approve();
    await this.quotationRepository.update(quotation);

    const preference = await this.paymentService.createPreference({
      quotationId: quotation.id,
      title: quotation.description,
      amount: quotation.amount,
      payerEmail: quotation.customerEmail,
    });

    const payment = new Payment({
      quotationId: quotation.id,
      serviceOrderId: quotation.serviceOrderId,
      customerId: quotation.customerId,
      amount: quotation.amount,
      mercadoPagoPreferenceId: preference.preferenceId,
    });
    await this.paymentRepository.save(payment);

    await this.emailService.send({
      to: quotation.customerEmail,
      subject: 'Orçamento aprovado — efetue o pagamento',
      html: `
        <h2>Orçamento aprovado!</h2>
        <p><strong>Valor:</strong> R$ ${quotation.amount.toFixed(2)}</p>
        <p><a href="${preference.initPoint}">Clique aqui para pagar</a></p>
      `,
    });

    return {
      id: quotation.id,
      serviceOrderId: quotation.serviceOrderId,
      serviceOrderNumber: quotation.serviceOrderNumber,
      customerId: quotation.customerId,
      customerEmail: quotation.customerEmail,
      description: quotation.description,
      amount: quotation.amount,
      status: quotation.status,
      createdAt: quotation.createdAt,
      updatedAt: quotation.updatedAt,
    };
  }
}
