module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // src is a root so coverage also reports files no test imports
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/app.ts',
    '!src/**/routes/**',
    // Thin vendor adapters: no logic of our own, exercised end-to-end instead
    '!src/infrastructure/payment/MercadoPagoService.ts',
    '!src/infrastructure/email/NodemailerEmailService.ts',
    '!src/infrastructure/messaging/RabbitMQEventConsumer.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@interface/(.*)$': '<rootDir>/src/interface/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
};
