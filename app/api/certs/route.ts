import { NextResponse } from "next/server";
import { db } from "@/db";
import { certs } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allCerts = await db.select().from(certs).orderBy(asc(certs.name));
    return NextResponse.json({ certs: allCerts });
  } catch (error) {
    console.error("Failed to fetch certs:", error);
    return NextResponse.json(
      { error: "Failed to fetch certs" },
      { status: 500 }
    );
  }
}
