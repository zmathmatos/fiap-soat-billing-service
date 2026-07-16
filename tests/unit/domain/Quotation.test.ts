import { Quotation } from '../../../src/domain/entities/Quotation';

describe('Quotation entity', () => {
  const makeQuotation = () =>
    new Quotation({
      serviceOrderId: 'so-1',
      serviceOrderNumber: 1001,
      customerId: 'c-1',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    });

  it('creates with pending status by default', () => {
    expect(makeQuotation().status).toBe('pending');
  });

  it('approves a pending quotation', () => {
    const q = makeQuotation();
    q.approve();
    expect(q.status).toBe('approved');
  });

  it('rejects a pending quotation', () => {
    const q = makeQuotation();
    q.reject();
    expect(q.status).toBe('rejected');
  });

  it('throws when approving a non-pending quotation', () => {
    const q = makeQuotation();
    q.approve();
    expect(() => q.approve()).toThrow();
  });

  it('throws when rejecting a non-pending quotation', () => {
    const q = makeQuotation();
    q.reject();
    expect(() => q.reject()).toThrow();
  });
});
