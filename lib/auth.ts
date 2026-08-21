import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: {
  officerId: string;
  username: string;
}) {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getJwtSecretKey());

  return token;
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, getJwtSecretKey());
    return verified.payload as { officerId: string; username: string };
  } catch (error) {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getSessionPayload(req?: NextRequest) {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get("session")?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("session")?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}
