import MercadoPago, { Payment, Preference } from 'mercadopago';
import { IPaymentService, CreatePreferenceInput, CreatePreferenceOutput } from '../../application/services/IPaymentService';
import { env } from '../../shared/config/env';

export class MercadoPagoService implements IPaymentService {
  private client: MercadoPago;

  constructor() {
    this.client = new MercadoPago({ accessToken: env.mercadoPago.accessToken });
  }

  async createPreference(input: CreatePreferenceInput): Promise<CreatePreferenceOutput> {
    const preference = new Preference(this.client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: input.quotationId,
            title: input.title,
            quantity: 1,
            unit_price: input.amount,
          },
        ],
        payer: { email: input.payerEmail },
        external_reference: input.quotationId,
      },
    });

    return {
      preferenceId: result.id!,
      initPoint: result.init_point!,
    };
  }

  async getPayment(paymentId: string): Promise<Record<string, unknown>> {
    const payment = new Payment(this.client);
    const result = await payment.get({ id: Number(paymentId) });
    return result as unknown as Record<string, unknown>;
  }
}
