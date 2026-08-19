import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerRoles,
  roles,
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { updateOfficerSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const officerId = params.id;

  // Basic sanity check: is this even a valid UUID shape?
  // (Prevents wasting a DB call on garbage input like "/api/officers/abc")
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(officerId)) {
    return NextResponse.json({ error: "Invalid officer id" }, { status: 400 });
  }

  const rows = await db
    .select({
      officerId: officers.id,
      name: officers.name,
      email: officers.email,
      phoneNumber: phones.phoneNumber,
      certName: certs.name,
      roleName: roles.name,
    })
    .from(officers)
    .leftJoin(
      phones,
      and(eq(phones.officerId, officers.id), isNull(phones.deletedAt)),
    )
    .leftJoin(officerCerts, eq(officerCerts.officerId, officers.id))
    .leftJoin(certs, eq(certs.id, officerCerts.certId))
    .leftJoin(officerRoles, eq(officerRoles.officerId, officers.id))
    .leftJoin(roles, eq(roles.id, officerRoles.roleId))
    .where(and(eq(officers.id, officerId), isNull(officers.deletedAt)));

  // No rows at all means: officer doesn't exist, or was soft-deleted
  if (rows.length === 0) {
    return NextResponse.json({ error: "Officer not found" }, { status: 404 });
  }

  // Same grouping trick as search, just collapsing to ONE officer object
  const first = rows[0];
  const result = {
    id: first.officerId,
    name: first.name,
    email: first.email,
    phones: new Set<string>(),
    certs: new Set<string>(),
    roles: new Set<string>(),
  };

  for (const row of rows) {
    if (row.phoneNumber) result.phones.add(row.phoneNumber);
    if (row.certName) result.certs.add(row.certName);
    if (row.roleName) result.roles.add(row.roleName);
  }

  return NextResponse.json({
    id: result.id,
    name: result.name,
    email: result.email,
    phones: Array.from(result.phones),
    certs: Array.from(result.certs),
    roles: Array.from(result.roles),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const targetId = params.id;

    const body = await request.json();
    const parsed = updateOfficerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 400, parsed.error);
    }

    const data = parsed.data;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.systemRole !== undefined) {
      updateData.systemRole = data.systemRole;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db.update(officers).set(updateData).where(eq(officers.id, targetId));
    }

    // Update phone if provided
    if (data.phoneNumber !== undefined) {
      if (data.phoneNumber === null) {
        // Soft delete phone
        await db.update(phones).set({ deletedAt: new Date() }).where(eq(phones.officerId, targetId));
      } else {
        // Check if exists
        const existingPhone = await db.select().from(phones).where(eq(phones.officerId, targetId)).limit(1);
        if (existingPhone.length > 0) {
          await db.update(phones).set({ phoneNumber: data.phoneNumber, deletedAt: null, updatedAt: new Date() }).where(eq(phones.officerId, targetId));
        } else {
          await db.insert(phones).values({ officerId: targetId, phoneNumber: data.phoneNumber });
        }
      }
    }

    return successResponse({ success: true });
  } catch (error: any) {
    console.error(error);
    return errorResponse("Internal server error", 500, error.message);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const targetId = params.id;

    // Soft delete
    await db.update(officers).set({ deletedAt: new Date() }).where(eq(officers.id, targetId));
    await db.update(phones).set({ deletedAt: new Date() }).where(eq(phones.officerId, targetId));

    return successResponse({ success: true });
  } catch (error: any) {
    console.error(error);
    return errorResponse("Internal server error", 500, error.message);
  }
}
