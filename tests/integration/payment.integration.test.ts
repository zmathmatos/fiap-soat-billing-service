import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MongoPaymentRepository } from '../../src/infrastructure/database/MongoPaymentRepository';
import { Payment } from '../../src/domain/entities/Payment';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

const makePayment = (overrides: Partial<ConstructorParameters<typeof Payment>[0]> = {}) =>
  new Payment({
    quotationId: 'q-1',
    serviceOrderId: 'so-1',
    customerId: 'c-1',
    amount: 500,
    mercadoPagoPreferenceId: 'pref-1',
    ...overrides,
  });

describe('MongoPaymentRepository', () => {
  it('saves and retrieves a payment by id', async () => {
    const repo = new MongoPaymentRepository();
    const payment = makePayment();

    await repo.save(payment);
    const found = await repo.findById(payment.id);

    expect(found).not.toBeNull();
    expect(found!.quotationId).toBe('q-1');
    expect(found!.amount).toBe(500);
    expect(found!.status).toBe('pending');
  });

  it('finds a payment by quotation id', async () => {
    const repo = new MongoPaymentRepository();
    await repo.save(makePayment());

    const found = await repo.findByQuotationId('q-1');

    expect(found!.serviceOrderId).toBe('so-1');
  });

  it('finds a payment by Mercado Pago payment id after confirmation', async () => {
    const repo = new MongoPaymentRepository();
    const payment = makePayment();
    await repo.save(payment);

    payment.confirm('mp-99', { status: 'approved' });
    await repo.update(payment);

    const found = await repo.findByMercadoPagoPaymentId('mp-99');
    expect(found!.status).toBe('approved');
    expect(found!.mercadoPagoPayload).toEqual({ status: 'approved' });
  });

  it('returns null for unknown ids', async () => {
    const repo = new MongoPaymentRepository();

    expect(await repo.findById('ghost')).toBeNull();
    expect(await repo.findByQuotationId('ghost')).toBeNull();
    expect(await repo.findByMercadoPagoPaymentId('ghost')).toBeNull();
  });
});

describe('database connection helpers', () => {
  // env is read at import time, so the module is re-required after MONGODB_URI is set
  it('connects and disconnects using the configured URI', async () => {
    await jest.isolateModulesAsync(async () => {
      const connection = await import('../../src/infrastructure/database/connection');
      await expect(connection.connectDatabase()).resolves.toBeUndefined();
      await expect(connection.disconnectDatabase()).resolves.toBeUndefined();
    });
  });
});
