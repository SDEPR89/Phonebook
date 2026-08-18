import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load Next.js environment variables (.env.local first, then fallback to .env)
config({ path: ".env.local" });
config({ path: ".env" });
config({ path: "../.env" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
