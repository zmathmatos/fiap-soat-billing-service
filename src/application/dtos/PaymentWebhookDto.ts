export interface PaymentWebhookDto {
  type: string;
  data: {
    id: string;
  };
  [key: string]: unknown;
}
