import { SignJWT, jwtVerify } from "jose";

// Always define a secret (use environment variable in production)
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only_please_change"
);

const alg = "HS256";

export type JwtPayload = {
  id: string;
  email: string;
  systemRole: string;
};

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as JwtPayload;
  } catch (error) {
    return null;
  }
}
