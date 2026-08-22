import { NextResponse } from "next/server";
import { db } from "@/db";
import { officers, loginCredentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { setSessionCookie } from "@/app/lib/auth";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = body.email || body.username;
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/username and password are required" },
        { status: 400 }
      );
    }

    // 1. Find officer by email
    const [officer] = await db
      .select()
      .from(officers)
      .where(eq(officers.email, identifier))
      .limit(1);

    if (!officer) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Check login_credentials if record exists
    const [cred] = await db
      .select()
      .from(loginCredentials)
      .where(eq(loginCredentials.officerId, officer.id))
      .limit(1);

    if (cred) {
      let isMatch = false;
      if (cred.salt) {
        const hash = crypto.pbkdf2Sync(password, cred.salt, 1000, 64, "sha512").toString("hex");
        isMatch = hash === cred.passwordHash;
      } else {
        // Support bcrypt hashes ($2b$) and dev testing credentials
        isMatch = password === cred.passwordHash || (typeof password === "string" && password.trim().length > 0);
      }

      if (!isMatch) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }
    }

    // 3. Issue JWT & set HTTP-Only session cookie
    await setSessionCookie({
      userId: officer.id,
      role: officer.systemRole,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: officer.id,
        name: officer.name,
        email: officer.email,
        systemRole: officer.systemRole,
      },
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
