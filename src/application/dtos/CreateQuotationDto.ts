export interface CreateQuotationDto {
  serviceOrderId: string;
  customerId: string;
  customerEmail: string;
  description: string;
  amount: number;
}
