import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { officers, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { officerId } = await req.json();

    if (!officerId) {
      return NextResponse.json(
        { error: "Officer ID is required." },
        { status: 400 },
      );
    }

    // 1. Fetch existing officer details before deletion
    const existingOfficer = await db
      .select()
      .from(officers)
      .where(eq(officers.id, officerId))
      .limit(1);

    if (existingOfficer.length === 0) {
      return NextResponse.json(
        { error: "Officer not found." },
        { status: 404 },
      );
    }

    const officer = existingOfficer[0];

    // 2. Insert DELETED record into Audit Logs
    const [actor] = await db
      .select()
      .from(officers)
      .where(eq(officers.id, session.userId))
      .limit(1);

    const actorName = actor?.name || "Admin";

    const deletedName = officer.name || "Unknown Officer";
    const deletedEmail = officer.email || "";

    await db.insert(auditLogs).values({
      officerId: session.userId,
      officerName: actorName,
      action: "DELETED",
      changes: [
        {
          field: "Deleted Officer",
          old: deletedName,
          new: "Removed",
        },
        ...(deletedEmail
          ? [{ field: "Email", old: deletedEmail, new: "Removed" }]
          : []),
      ],
    });

    // 3. Delete the officer
    await db.delete(officers).where(eq(officers.id, officerId));

    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE ROUTE ERROR:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}