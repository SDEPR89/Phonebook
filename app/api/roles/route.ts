import { NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allRoles = await db.select().from(roles).orderBy(asc(roles.name));
    return NextResponse.json({ roles: allRoles });
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}
