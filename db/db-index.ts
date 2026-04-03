// db/index.ts
// Drizzle ORM 클라이언트 싱글톤

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL이 설정되지 않았습니다. DB 기능이 작동하지 않습니다.");
}

const sql = DATABASE_URL ? neon(DATABASE_URL) : null;
export const db = sql ? drizzle(sql, { schema }) : null as any;

export type DB = typeof db;
