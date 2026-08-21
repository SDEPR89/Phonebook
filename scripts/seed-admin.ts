import { db } from "../db";
import { officers, loginCredentials } from "../db/schema";
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.local" });

async function seedAdmin() {
  try {
    const username = "admin";
    const password = "password123";

    console.log("Hashing password...");
    const passwordHash = await bcrypt.hash(password, 10);

    console.log("Creating officer profile...");
    const [officer] = await db
      .insert(officers)
      .values({
        name: "System Administrator",
        email: "admin@example.com",
        systemRole: "superadmin",
      })
      .returning();

    console.log("Creating login credentials...");
    await db.insert(loginCredentials).values({
      officerId: officer.id,
      username,
      passwordHash,
    });

    console.log("✅ Admin account successfully created!");
    console.log("-----------------------------------");
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log("-----------------------------------");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    process.exit(1);
  }
}

seedAdmin();
