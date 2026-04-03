import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL이 설정되지 않았습니다.");
}

const client = DATABASE_URL ? postgres(DATABASE_URL) : null;
export const db = client ? drizzle(client, { schema }) : null as any;

export type DB = typeof db;