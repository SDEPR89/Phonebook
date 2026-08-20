import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// A single shared connection, reused across your app's server code.
const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { schema });
