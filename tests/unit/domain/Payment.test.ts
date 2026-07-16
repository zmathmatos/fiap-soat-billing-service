import { Payment } from '../../../src/domain/entities/Payment';

describe('Payment entity', () => {
  const makePayment = () =>
    new Payment({
      quotationId: 'q-1',
      serviceOrderId: 'so-1',
      customerId: 'c-1',
      amount: 500,
    });

  it('creates with pending status by default', () => {
    expect(makePayment().status).toBe('pending');
  });

  it('confirms a payment', () => {
    const p = makePayment();
    p.confirm('mp-123', { id: 'mp-123', status: 'approved' });
    expect(p.status).toBe('approved');
    expect(p.mercadoPagoPaymentId).toBe('mp-123');
  });

  it('marks payment as failed', () => {
    const p = makePayment();
    p.fail();
    expect(p.status).toBe('failed');
  });
});
