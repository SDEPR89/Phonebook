import { NextResponse } from "next/server";
import { db } from "@/db";
import { certs } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    // Select all CERT records from the database using Drizzle
    const allCerts = await db
      .select()
      .from(certs)
      .orderBy(asc(certs.shortName));

    return NextResponse.json(allCerts);
  } catch (error) {
    console.error("Error fetching certs:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}
