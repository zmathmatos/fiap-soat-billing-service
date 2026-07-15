export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/billing',

  mercadoPago: {
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'billing@fiap-soat.com',
  },

  osServiceUrl: process.env.OS_SERVICE_URL || 'http://localhost:3001',

  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sqsQueueUrl: process.env.SQS_QUEUE_URL || '',
    snsPaymentApprovedTopicArn: process.env.SNS_PAYMENT_APPROVED_TOPIC_ARN || '',
    snsPaymentFailedTopicArn: process.env.SNS_PAYMENT_FAILED_TOPIC_ARN || '',
  },
};
