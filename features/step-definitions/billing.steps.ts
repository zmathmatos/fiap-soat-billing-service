import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { BillingWorld } from '../support/world';

Given('que um pedido de orçamento é recebido para a OS {string}', async function (this: BillingWorld, alias: string) {
  this.currentQuotation = await this.createQuotation.execute({
    serviceOrderId: alias,
    serviceOrderNumber: this.nextNumber(),
    customerId: `customer-${alias}`,
    customerEmail: `cliente-${alias}@test.com`,
    description: 'Troca de pastilhas de freio',
    amount: 450,
  });
});

When('o cliente aprova o orçamento', async function (this: BillingWorld) {
  assert.ok(this.currentQuotation, 'Nenhum orçamento criado');
  this.currentQuotation = await this.approveQuotation.execute(this.currentQuotation.id);
});

When('o cliente rejeita o orçamento', async function (this: BillingWorld) {
  assert.ok(this.currentQuotation, 'Nenhum orçamento criado');
  this.currentQuotation = await this.rejectQuotation.execute(this.currentQuotation.id);
});

When('o pagamento é confirmado no Mercado Pago', async function (this: BillingWorld) {
  assert.ok(this.currentQuotation, 'Nenhum orçamento criado');
  this.paymentService.externalReference = this.currentQuotation.id;
  this.paymentService.nextPaymentStatus = 'approved';
  await this.processWebhook.execute({ type: 'payment', data: { id: 'mp-payment-1' } });
});

When('o pagamento é recusado no Mercado Pago', async function (this: BillingWorld) {
  assert.ok(this.currentQuotation, 'Nenhum orçamento criado');
  this.paymentService.externalReference = this.currentQuotation.id;
  this.paymentService.nextPaymentStatus = 'rejected';
  await this.processWebhook.execute({ type: 'payment', data: { id: 'mp-payment-1' } });
});

Then('o orçamento fica com status {string}', function (this: BillingWorld, status: string) {
  assert.ok(this.currentQuotation, 'Nenhum orçamento criado');
  assert.strictEqual(this.currentQuotation.status, status);
});

Then('um pagamento é criado com status {string}', async function (this: BillingWorld, status: string) {
  assert.ok(this.currentQuotation, 'Nenhum orçamento criado');
  const payment = await this.paymentRepo.findByQuotationId(this.currentQuotation.id);
  assert.ok(payment, 'Pagamento não foi criado');
  assert.strictEqual(payment.status, status);
});

Then('o evento {string} é publicado para a OS {string}', function (this: BillingWorld, eventType: string, alias: string) {
  const events = [...this.quotationRepo.pendingEvents, ...this.paymentRepo.pendingEvents];
  const match = events.some(
    (e) => e.type === eventType && (e.payload as { serviceOrderId?: string }).serviceOrderId === alias,
  );
  assert.ok(match, `Evento "${eventType}" não publicado para "${alias}"`);
});
