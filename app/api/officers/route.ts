import { NextRequest } from "next/server";
import { db } from "@/db";
import { officers, phones, officerCerts, officerRoles } from "@/db/schema";
import { createOfficerSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, isNull, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: officers.id,
        name: officers.name,
        email: officers.email,
        systemRole: officers.systemRole,
        avatarUrl: officers.avatarUrl,
        createdAt: officers.createdAt,
      })
      .from(officers)
      .where(isNull(officers.deletedAt))
      .orderBy(desc(officers.createdAt))
      .limit(limit)
      .offset(offset);

    // We skip joining all related tables to keep the listing fast, 
    // or we could fetch them if necessary. For now, simple list.

    return successResponse({ items: rows, page, limit });
  } catch (error: any) {
    console.error(error);
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createOfficerSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const data = parsed.data;
    
    // Check email uniqueness
    const existing = await db.select().from(officers).where(eq(officers.email, data.email)).limit(1);
    if (existing.length > 0) {
      return errorResponse("Email already in use", 409);
    }

    // Start a transaction to insert officer and related records
    const result = await db.transaction(async (tx) => {
      const [newOfficer] = await tx.insert(officers).values({
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        systemRole: data.systemRole as any,
      }).returning();

      if (data.phoneNumber) {
        await tx.insert(phones).values({
          officerId: newOfficer.id,
          phoneNumber: data.phoneNumber,
        });
      }

      if (data.certId) {
        await tx.insert(officerCerts).values({
          officerId: newOfficer.id,
          certId: data.certId,
        });
      }

      if (data.roleId) {
        await tx.insert(officerRoles).values({
          officerId: newOfficer.id,
          roleId: data.roleId,
        });
      }

      return newOfficer;
    });

    return successResponse({ officer: result }, 201);
  } catch (error: any) {
    console.error(error);
    return errorResponse("Internal server error", 500, error.message);
  }
}
