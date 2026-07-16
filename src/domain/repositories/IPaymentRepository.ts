import { Payment } from '../entities/Payment';

export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByQuotationId(quotationId: string): Promise<Payment | null>;
  findByMercadoPagoPaymentId(mercadoPagoPaymentId: string): Promise<Payment | null>;
  update(payment: Payment): Promise<void>;
}
