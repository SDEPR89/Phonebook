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
import { or, ilike, eq, isNull, and } from "drizzle-orm";

type OfficerResult = {
  id: string;
  name: string;
  email: string;
  phones: Set<string>;
  certs: Set<string>;
  roles: Set<string>;
};

export async function GET(request: NextRequest) {
  const searchTerm = request.nextUrl.searchParams.get("q");

  if (!searchTerm || searchTerm.trim() === "") {
    return NextResponse.json([]);
  }

  const term = searchTerm.trim();

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
    .where(
      and(
        isNull(officers.deletedAt),
        or(
          ilike(officers.name, `%${term}%`),
          ilike(officers.email, `%${term}%`),
          ilike(phones.phoneNumber, `%${term}%`),
          ilike(certs.name, `%${term}%`)
        ),
      ),
    );

  const officerMap = new Map<string, OfficerResult>();
  for (const row of rows) {
    if (!officerMap.has(row.officerId)) {
      officerMap.set(row.officerId, {
        id: row.officerId,
        name: row.name,
        email: row.email,
        phones: new Set<string>(),
        certs: new Set<string>(),
        roles: new Set<string>(),
      });
    }
    const entry = officerMap.get(row.officerId)!;
    if (row.phoneNumber) entry.phones.add(row.phoneNumber);
    if (row.certName) entry.certs.add(row.certName);
    if (row.roleName) entry.roles.add(row.roleName);
  }

  const results = Array.from(officerMap.values()).map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    phones: Array.from(o.phones),
    certs: Array.from(o.certs),
    roles: Array.from(o.roles),
  }));

  return NextResponse.json(results);
}
