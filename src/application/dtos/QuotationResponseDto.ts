export interface QuotationResponseDto {
  id: string;
  serviceOrderId: string;
  serviceOrderNumber: number;
  customerId: string;
  customerEmail: string;
  description: string;
  amount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
