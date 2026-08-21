import { NextResponse } from "next/server";
import { db } from "@/db";
import { loginCredentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find the credentials
    const [credentials] = await db
      .select()
      .from(loginCredentials)
      .where(eq(loginCredentials.username, username));

    if (!credentials) {
      // Return a generic message to prevent username enumeration
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (credentials.lockedUntil && new Date(credentials.lockedUntil) > new Date()) {
      return NextResponse.json(
        { error: "Account is temporarily locked due to multiple failed login attempts. Please try again later." },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, credentials.passwordHash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const newAttempts = (credentials.failedLoginAttempts || 0) + 1;
      const updates: any = {
        failedLoginAttempts: newAttempts,
      };

      // Lock account if >= 5 failed attempts
      if (newAttempts >= 5) {
        // Lock for 15 minutes
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
        updates.lockedUntil = lockedUntil;
      }

      await db
        .update(loginCredentials)
        .set(updates)
        .where(eq(loginCredentials.id, credentials.id));

      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Success! Reset failed attempts and set last login
    await db
      .update(loginCredentials)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      })
      .where(eq(loginCredentials.id, credentials.id));

    // Generate JWT and set Cookie
    const token = await signToken({
      officerId: credentials.officerId,
      username: credentials.username,
    });

    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
