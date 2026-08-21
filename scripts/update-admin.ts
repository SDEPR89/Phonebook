import { db } from "../db";
import { loginCredentials } from "../db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

async function updateAdmin() {
  await db.update(loginCredentials)
    .set({ username: 'admin@example.com' })
    .where(eq(loginCredentials.username, 'admin'));
  console.log("Updated admin username to admin@example.com");
  process.exit(0);
}
updateAdmin();
