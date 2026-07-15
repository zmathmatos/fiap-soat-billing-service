export interface CreatePreferenceInput {
  quotationId: string;
  title: string;
  amount: number;
  payerEmail: string;
}

export interface CreatePreferenceOutput {
  preferenceId: string;
  initPoint: string;
}

export interface IPaymentService {
  createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput>;
  getPayment(paymentId: string): Promise<Record<string, unknown>>;
}
