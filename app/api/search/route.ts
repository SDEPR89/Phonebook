import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { officers, phones, certs } from "@/db/schema";
import { or, isNull, eq, and, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchTerm = request.nextUrl.searchParams.get("q");

  if (!searchTerm || !searchTerm.trim()) {
    return NextResponse.json([]);
  }

  const term = searchTerm.trim();
  const searchPattern = `%${term}%`;

  try {
    // Query 1: Fetch Officers matching Name, Email, or Phone
    const officerResults = await db
      .select({
        id: officers.id,
        name: officers.name,
        email: officers.email,
        profileUrl: officers.avatarUrl,
        phone: phones.phoneNumber,
      })
      .from(officers)
      .leftJoin(phones, and(eq(phones.officerId, officers.id), isNull(phones.deletedAt)))
      .where(
        and(
          isNull(officers.deletedAt),
          or(
            ilike(officers.name, searchPattern),
            ilike(officers.email, searchPattern),
            ilike(phones.phoneNumber, searchPattern)
          )
        )
      )
      .limit(5);

    // Query 2: Fetch Certificates matching shortName OR fullName directly
    const certResults = await db
      .select({
        id: certs.id,
        shortName: certs.shortName,
        fullName: certs.fullName,
      })
      .from(certs)
      .where(
        or(
          ilike(certs.shortName, searchPattern),
          ilike(certs.fullName, searchPattern)
        )
      )
      .limit(5);

    const suggestions = [
      ...officerResults.map((o) => ({
        id: o.id,
        officerId: o.id,
        text: o.name,
        profileUrl: o.profileUrl,
        type: "officer" as const,
      })),
      ...certResults.map((c) => ({
        id: c.id,
        text: c.fullName || c.shortName,
        shortName: c.shortName,
        fullName: c.fullName,
        type: "cert" as const,
      })),
    ];

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}