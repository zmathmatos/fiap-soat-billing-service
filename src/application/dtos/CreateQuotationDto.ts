export interface CreateQuotationDto {
  serviceOrderId: string;
  serviceOrderNumber: number;
  customerId: string;
  customerEmail: string;
  description: string;
  amount: number;
}
