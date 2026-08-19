import { NextRequest } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { createRoleSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isNull } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(roles)
      .where(isNull(roles.deletedAt));

    return successResponse({ items: rows });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const [role] = await db.insert(roles).values(parsed.data).returning();
    return successResponse({ role }, 201);
  } catch (error: any) {
    if (error.code === '23505') {
      return errorResponse("Role name already exists", 409);
    }
    return errorResponse("Internal server error", 500, error.message);
  }
}
