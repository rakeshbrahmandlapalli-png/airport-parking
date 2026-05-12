import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.DATABASE_URL_NEW;

  // 🚨 SAFETY NET: Alert you if Vercel loses the URL in production
  if (!connectionString) {
    if (process.env.NODE_ENV === "production") {
      console.error("🚨 FATAL: DATABASE_URL is missing in Vercel production environment!");
    } else {
      console.warn("⚠️ Using fallback dummy database URL for build phase.");
    }
  }

  return new PrismaClient({
    datasources: {
      db: {
        // Fallback used ONLY if the real string is missing during the build phase
        url: connectionString || "postgresql://dummy:password@localhost:5432/dummy?sslmode=require",
      },
    },
  });
};

declare global {
  // Use a slightly more unique global name to avoid conflicts
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Instantiate the client
const prismadb = globalThis.prismaGlobal ?? prismaClientSingleton();

// Export as Default AND Named export to prevent import crashes across your app
export default prismadb;
export { prismadb };

// Prevent hot-reloading from exhausting your database connections in dev
if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prismadb;
}