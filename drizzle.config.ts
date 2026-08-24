import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load Next.js environment variables
config({ path: ".env" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
