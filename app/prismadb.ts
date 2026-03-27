import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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