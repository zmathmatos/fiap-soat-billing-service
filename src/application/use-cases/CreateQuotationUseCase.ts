import { Quotation } from '../../domain/entities/Quotation';
import { IQuotationRepository } from '../../domain/repositories/IQuotationRepository';
import { IEmailService } from '../services/IEmailService';
import { CreateQuotationDto } from '../dtos/CreateQuotationDto';
import { QuotationResponseDto } from '../dtos/QuotationResponseDto';
import { env } from '../../shared/config/env';

export class CreateQuotationUseCase {
  constructor(
    private readonly quotationRepository: IQuotationRepository,
    private readonly emailService: IEmailService,
  ) {}

  async execute(dto: CreateQuotationDto): Promise<QuotationResponseDto> {
    const existing = await this.quotationRepository.findByServiceOrderId(dto.serviceOrderId);
    if (existing) {
      return {
        id: existing.id,
        serviceOrderId: existing.serviceOrderId,
        serviceOrderNumber: existing.serviceOrderNumber,
        customerId: existing.customerId,
        customerEmail: existing.customerEmail,
        description: existing.description,
        amount: existing.amount,
        status: existing.status,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    const quotation = new Quotation(dto);

    await this.quotationRepository.save(quotation);

    const approveUrl = `${env.appBaseUrl}/quotations/${quotation.id}/approve`;
    const rejectUrl = `${env.appBaseUrl}/quotations/${quotation.id}/reject`;

    await this.emailService.send({
      to: dto.customerEmail,
      subject: 'Orçamento gerado — FIAP SOAT',
      html: `
        <h2>Olá!</h2>
        <p>Seu orçamento foi gerado com sucesso.</p>
        <p><strong>OS nº:</strong> ${dto.serviceOrderNumber}</p>
        <p><strong>Descrição:</strong> ${dto.description}</p>
        <p><strong>Valor:</strong> R$ ${dto.amount.toFixed(2)}</p>
        <p><strong>ID do orçamento:</strong> ${quotation.id}</p>
        <p>
          <a href="${approveUrl}">Aprovar orçamento</a>
          &nbsp;|&nbsp;
          <a href="${rejectUrl}">Rejeitar orçamento</a>
        </p>
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
