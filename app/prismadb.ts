import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  // This line tells Prisma: "Use NEW, if that's empty, use the old one"
  const connectionString = process.env.DATABASE_URL_NEW || process.env.DATABASE_URL;

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