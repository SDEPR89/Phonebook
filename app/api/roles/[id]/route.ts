import { NextRequest } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { updateRoleSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const data = parsed.data;
    if (Object.keys(data).length > 0) {
      const updateData: any = { ...data, updatedAt: new Date() };
      await db.update(roles).set(updateData).where(eq(roles.id, params.id));
    }

    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.update(roles).set({ deletedAt: new Date() }).where(eq(roles.id, params.id));
    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}
