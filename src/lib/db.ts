import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const db =
  global.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = db;
}

// Enable SQLite WAL mode & busy_timeout for high concurrency without locking
try {
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl.startsWith("file:") || !dbUrl.includes("://")) {
    db.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
    db.$queryRawUnsafe("PRAGMA busy_timeout = 5000;").catch(() => {});
    db.$queryRawUnsafe("PRAGMA synchronous = NORMAL;").catch(() => {});
  }
} catch {
  // Ignore pragma setup errors if unsupported
}
