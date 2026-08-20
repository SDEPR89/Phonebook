import { NextRequest } from "next/server";
import { db } from "@/db";
import { certs } from "@/db/schema";
import { createCertSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isNull } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(certs)
      .where(isNull(certs.deletedAt));

    return successResponse({ items: rows });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createCertSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const [cert] = await db.insert(certs).values(parsed.data).returning();
    return successResponse({ cert }, 201);
  } catch (error: any) {
    if (error.code === '23505') { // Postgres unique violation
      return errorResponse("Cert name already exists", 409);
    }
    return errorResponse("Internal server error", 500, error.message);
  }
}
