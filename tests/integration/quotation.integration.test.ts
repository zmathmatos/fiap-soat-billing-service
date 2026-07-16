import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MongoQuotationRepository } from '../../src/infrastructure/database/MongoQuotationRepository';
import { Quotation } from '../../src/domain/entities/Quotation';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('MongoQuotationRepository', () => {
  it('saves and retrieves a quotation', async () => {
    const repo = new MongoQuotationRepository();
    const quotation = new Quotation({
      serviceOrderId: 'so-1',
      customerId: 'c-1',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    });

    await repo.save(quotation);
    const found = await repo.findById(quotation.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(quotation.id);
    expect(found!.amount).toBe(500);
  });

  it('updates quotation status', async () => {
    const repo = new MongoQuotationRepository();
    const quotation = new Quotation({
      serviceOrderId: 'so-1',
      customerId: 'c-1',
      customerEmail: 'test@example.com',
      description: 'Fix brakes',
      amount: 500,
    });

    await repo.save(quotation);
    quotation.approve();
    await repo.update(quotation);

    const found = await repo.findById(quotation.id);
    expect(found!.status).toBe('approved');
  });
});
