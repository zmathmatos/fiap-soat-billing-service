import { Quotation } from '../entities/Quotation';

export interface IQuotationRepository {
  save(quotation: Quotation): Promise<void>;
  findById(id: string): Promise<Quotation | null>;
  findByServiceOrderId(serviceOrderId: string): Promise<Quotation | null>;
  update(quotation: Quotation): Promise<void>;
}
