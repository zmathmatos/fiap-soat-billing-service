# language: pt
Funcionalidade: Orçamento e pagamento (saga coreografada)
  Como serviço de cobrança
  Quero gerar orçamentos e processar pagamentos publicando eventos
  Para conduzir a saga da ordem de serviço entre os microsserviços

  Cenário: Fluxo feliz — orçamento aprovado e pagamento confirmado
    Dado que um pedido de orçamento é recebido para a OS "OS-100"
    Então o orçamento fica com status "pending"
    Quando o cliente aprova o orçamento
    Então o orçamento fica com status "approved"
    E um pagamento é criado com status "pending"
    Quando o pagamento é confirmado no Mercado Pago
    Então o evento "payment.approved" é publicado para a OS "OS-100"

  Cenário: Compensação — cliente rejeita o orçamento
    Dado que um pedido de orçamento é recebido para a OS "OS-200"
    Quando o cliente rejeita o orçamento
    Então o orçamento fica com status "rejected"
    E o evento "quotation.rejected" é publicado para a OS "OS-200"

  Cenário: Compensação — pagamento recusado no Mercado Pago
    Dado que um pedido de orçamento é recebido para a OS "OS-300"
    E o cliente aprova o orçamento
    Quando o pagamento é recusado no Mercado Pago
    Então o evento "payment.failed" é publicado para a OS "OS-300"
