import { NextRequest } from "next/server";
import { db } from "@/db";
import { certs } from "@/db/schema";
import { updateCertSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateCertSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const data = parsed.data;
    if (Object.keys(data).length > 0) {
      const updateData: any = { ...data, updatedAt: new Date() };
      await db.update(certs).set(updateData).where(eq(certs.id, params.id));
    }

    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.update(certs).set({ deletedAt: new Date() }).where(eq(certs.id, params.id));
    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}
