import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerCertRoles,
  roles,
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const officerId = params.id;

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
    .leftJoin(
      officerCertRoles,
      eq(officerCertRoles.officerCertId, officerCerts.id),
    )
    .leftJoin(roles, eq(roles.id, officerCertRoles.roleId))
    .where(and(eq(officers.id, officerId), isNull(officers.deletedAt)));

  if (rows.length === 0) {
    return NextResponse.json({ error: "Officer not found" }, { status: 404 });
  }

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
