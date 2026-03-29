import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(shouldEnableSsl()
    ? { ssl: { rejectUnauthorized: shouldVerifySslCerts() } }
    : {}),
});

export const db = drizzle(pool);
export const index = db;

function shouldEnableSsl() {
  const value = process.env.DATABASE_SSL ?? process.env.PG_SSL ?? "";
  return /^(true|1|yes)$/i.test(value.trim());
}

function shouldVerifySslCerts() {
  const value = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "";
  if (!value) return true;
  return !/^(false|0|no)$/i.test(value.trim());
}
