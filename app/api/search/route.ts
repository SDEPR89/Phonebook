import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { officers, phones, officerCerts, certs } from "@/db/schema";
import { or, eq, isNull, and, sql, ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchTerm = request.nextUrl.searchParams.get("q");

  if (!searchTerm || searchTerm.trim() === "") {
    return NextResponse.json([]);
  }

  const term = searchTerm.trim();
  const searchPattern = `%${term}%`; // Standard substring match for both EN and Thai

  const rows = await db
    .select({
      officerId: officers.id,
      name: officers.name,
      email: officers.email,
      profileUrl: officers.avatarUrl,
      phoneNumber: phones.phoneNumber,
      certName: certs.shortName,
      certFullName: certs.fullName,
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
          ilike(officers.name, searchPattern),
          ilike(officers.email, searchPattern),
          ilike(phones.phoneNumber, searchPattern),
          ilike(certs.shortName, searchPattern),
          ilike(certs.fullName, searchPattern),
        ),
      ),
    );

  const lowerTerm = term.toLowerCase();
  const suggestionsMap = new Map<
    string,
    { id: string; text: string; profileUrl?: string | null }
  >();

  for (const row of rows) {
    let matchedText = "";

    // Case-insensitive substring match working seamlessly for both English & Thai
    if (row.name && row.name.toLowerCase().includes(lowerTerm)) {
      matchedText = row.name;
    } else if (
      row.phoneNumber &&
      row.phoneNumber.toLowerCase().includes(lowerTerm)
    ) {
      matchedText = row.phoneNumber;
    } else if (row.email && row.email.toLowerCase().includes(lowerTerm)) {
      matchedText = row.email;
    } else if (
      row.certName &&
      row.certName.toLowerCase().includes(lowerTerm)
    ) {
      matchedText = row.certName;
    } else if (
      row.certFullName &&
      row.certFullName.toLowerCase().includes(lowerTerm)
    ) {
      matchedText = row.certFullName;
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