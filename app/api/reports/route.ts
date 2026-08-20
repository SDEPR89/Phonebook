import { NextRequest } from "next/server";
import { db } from "@/db";
import { dataCorrectionReports } from "@/db/schema";
import { createReportSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { desc, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const rows = await db
      .select()
      .from(dataCorrectionReports)
      .where(isNull(dataCorrectionReports.deletedAt))
      .orderBy(desc(dataCorrectionReports.createdAt));

    return successResponse({ items: rows });
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const data = parsed.data;

    const [report] = await db.insert(dataCorrectionReports).values({
      targetOfficerId: data.targetOfficerId,
      reporterId: null,
      reason: data.reason,
      details: data.details,
      status: "reported",
    }).returning();

    return successResponse({ report }, 201);
  } catch (error: any) {
    return errorResponse("Internal server error", 500, error.message);
  }
}
