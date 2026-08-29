import { NextResponse } from "next/server";
import { db } from "@/db";
import { officers, loginCredentials } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { setSessionCookie } from "@/app/lib/auth";
import { hashPassword, verifyPassword } from "@/app/lib/crypto";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = (body.email || body.username || "").trim().toLowerCase();
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email/username and password are required" },
        { status: 400 }
      );
    }

    // 1. Find officer by email (case-insensitive)
    const [officer] = await db
      .select()
      .from(officers)
      .where(ilike(officers.email, identifier))
      .limit(1);

    if (!officer) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Check login_credentials — must exist (no auto-provisioning)
    const [cred] = await db
      .select()
      .from(loginCredentials)
      .where(eq(loginCredentials.officerId, officer.id))
      .limit(1);

    if (!cred) {
      return NextResponse.json(
        { error: "Account not yet activated. Please contact your administrator." },
        { status: 401 }
      );
    }

    // 3. Check account lockout
    if (cred.lockedUntil && cred.lockedUntil > new Date()) {
      const remainingMs = cred.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { error: `Account locked due to too many failed attempts. Try again in ${remainingMins} minute(s).` },
        { status: 429 }
      );
    }

    // 4. Verify password — requires salt (no plain-text fallback)
    if (!cred.salt) {
      return NextResponse.json(
        { error: "Account credentials are invalid. Please contact your administrator." },
        { status: 401 }
      );
    }

    const { match: isMatch, needsRehash } = verifyPassword(password, cred.passwordHash, cred.salt);

    // 5. On success: reset lockout, update lastLoginAt, re-hash if using legacy iterations
    if (isMatch) {
      const updatePayload: Record<string, unknown> = {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };
      if (needsRehash) {
        const { hash: newHash, salt: newSalt } = hashPassword(password);
        updatePayload.passwordHash = newHash;
        updatePayload.salt = newSalt;
      }
      await db
        .update(loginCredentials)
        .set(updatePayload)
        .where(eq(loginCredentials.id, cred.id));
    }

    if (!isMatch) {
      const newFailedCount = (cred.failedLoginAttempts ?? 0) + 1;
      const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
      await db
        .update(loginCredentials)
        .set({
          failedLoginAttempts: newFailedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
          updatedAt: new Date(),
        })
        .where(eq(loginCredentials.id, cred.id));

      return NextResponse.json(
        {
          error: shouldLock
            ? "Too many failed attempts. Account locked for 15 minutes."
            : "Invalid credentials",
        },
        { status: 401 }
      );
    }

    // 6. Issue JWT & set HTTP-Only session cookie
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
