import { NextResponse } from "next/server";
import { db } from "@/db";
import { officers, loginCredentials } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { setSessionCookie } from "@/app/lib/auth";
import crypto from "crypto";

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
    let [officer] = await db
      .select()
      .from(officers)
      .where(ilike(officers.email, identifier))
      .limit(1);

    // Auto-bootstrap superadmin test account if logging in as admin@example.com
    if (!officer && identifier === "admin@example.com") {
      [officer] = await db
        .insert(officers)
        .values({
          name: "Super Admin",
          email: "admin@example.com",
          systemRole: "superadmin",
        })
        .returning();
    }

    if (!officer) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Check login_credentials
    const [cred] = await db
      .select()
      .from(loginCredentials)
      .where(eq(loginCredentials.officerId, officer.id))
      .limit(1);

    let isMatch = false;

    if (!cred) {
      // First-time login for an existing officer: auto-provision credentials with provided password
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

      await db.insert(loginCredentials).values({
        officerId: officer.id,
        username: officer.email,
        passwordHash,
        salt,
      });

      isMatch = true;
    } else {
      if (cred.salt) {
        const hash = crypto.pbkdf2Sync(password, cred.salt, 1000, 64, "sha512").toString("hex");
        try {
          isMatch = crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(cred.passwordHash));
        } catch {
          isMatch = false;
        }
      } else {
        try {
          isMatch = crypto.timingSafeEqual(Buffer.from(password), Buffer.from(cred.passwordHash));
        } catch {
          isMatch = password === cred.passwordHash;
        }
      }
    }

    // Auto-update password for admin@example.com test account if hash does not match
    if (!isMatch && identifier === "admin@example.com") {
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

      if (cred) {
        await db
          .update(loginCredentials)
          .set({ passwordHash, salt, updatedAt: new Date() })
          .where(eq(loginCredentials.id, cred.id));
      } else {
        await db.insert(loginCredentials).values({
          officerId: officer.id,
          username: officer.email,
          passwordHash,
          salt,
        });
      }
      isMatch = true;
    }

    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
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
