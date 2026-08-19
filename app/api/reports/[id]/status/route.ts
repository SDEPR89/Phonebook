import { NextRequest } from "next/server";
import { db } from "@/db";
import { dataCorrectionReports } from "@/db/schema";
import { updateReportStatusSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = updateReportStatusSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const data = parsed.data;
    
    await db.update(dataCorrectionReports).set({
      status: data.status,
      adminNotes: data.adminNotes,
      resolvedBy: null, // Removed auth dependency
      resolvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(dataCorrectionReports.id, params.id));

    return successResponse({ success: true });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}
