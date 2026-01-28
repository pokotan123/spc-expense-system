let prisma: any = null;

try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
} catch (error: any) {
  console.warn('Prisma client could not be initialized:', error.message);
  console.warn('Running in mock mode - database operations will use mock storage');
  // Create a mock prisma object that throws on any method call
  prisma = new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'then' || prop === 'catch') return undefined;
      return () => {
        throw new Error('Database not available - Prisma client not initialized');
      };
    }
  });
}

export default prisma;
