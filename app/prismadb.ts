import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // If Vercel hides the real URL during build, use a fake one so it doesn't crash!
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.DATABASE_URL_NEW || 
    "postgresql://dummy:password@localhost:5432/dummy?sslmode=require";

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prismadb = globalThis.prisma ?? prismaClientSingleton();

export default prismadb;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prismadb;