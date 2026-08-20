import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { officers, phones, officerCerts, certs } from "@/db/schema";
import { or, eq, isNull, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchTerm = request.nextUrl.searchParams.get("q");

  if (!searchTerm || searchTerm.trim() === "") {
    return NextResponse.json([]);
  }

  const term = searchTerm.trim();
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexPattern = `\\y${escapedTerm}`;

  const rows = await db
    .select({
      officerId: officers.id,
      name: officers.name,
      email: officers.email,
      profileUrl: officers.avatarUrl,
      phoneNumber: phones.phoneNumber,
      certName: certs.name,
    })
    .from(officers)
    .leftJoin(
      phones,
      and(eq(phones.officerId, officers.id), isNull(phones.deletedAt)),
    )
    .leftJoin(officerCerts, eq(officerCerts.officerId, officers.id))
    .leftJoin(certs, eq(certs.id, officerCerts.certId))
    .where(
      and(
        isNull(officers.deletedAt),
        or(
          sql`${officers.name} ~* ${regexPattern}`,
          sql`${officers.email} ~* ${regexPattern}`,
          sql`${phones.phoneNumber} ~* ${regexPattern}`,
          sql`${certs.name} ~* ${regexPattern}`,
        ),
      ),
    );

  const prefixRegex = new RegExp(`\\b${escapedTerm}`, "i");
  const suggestionsMap = new Map<
    string,
    { id: string; text: string; profileUrl?: string | null }
  >();

  for (const row of rows) {
    let matchedText = "";

    if (row.name && prefixRegex.test(row.name)) {
      matchedText = row.name;
    } else if (row.phoneNumber && prefixRegex.test(row.phoneNumber)) {
      matchedText = row.phoneNumber;
    } else if (row.email && prefixRegex.test(row.email)) {
      matchedText = row.email;
    } else if (row.certName && prefixRegex.test(row.certName)) {
      matchedText = row.certName;
    }

    if (matchedText && !suggestionsMap.has(matchedText)) {
      suggestionsMap.set(matchedText, {
        id: row.officerId,
        text: matchedText,
        profileUrl: row.profileUrl,
      });
    }
  }

  return NextResponse.json(Array.from(suggestionsMap.values()));
}
