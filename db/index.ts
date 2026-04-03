// db/index.ts
// Drizzle ORM 클라이언트 싱글톤

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export type DB = typeof db;
