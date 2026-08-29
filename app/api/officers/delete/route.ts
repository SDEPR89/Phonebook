import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { officers, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidUuid } from "@/app/lib/validators";

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

    if (!officerId || !isValidUuid(officerId)) {
      return NextResponse.json(
        { error: "Valid Officer ID is required." },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      // 1. Fetch existing officer details before deletion
      const existingOfficer = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, officerId))
        .limit(1);

      if (existingOfficer.length === 0) {
        return { error: "Officer not found.", status: 404 };
      }

      const officer = existingOfficer[0];

      if (officer.systemRole !== "officer" && session.role !== "superadmin") {
        return { error: "Only Super Admins can delete Admin and Super Admin accounts.", status: 403 };
      }

      // 2. Insert DELETED record into Audit Logs
      const [actor] = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, session.userId))
        .limit(1);

      const actorName = actor?.name || "Admin";

      const deletedName = officer.name || "Unknown Officer";
      const deletedEmail = officer.email || "";

      await tx.insert(auditLogs).values({
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
      await tx.delete(officers).where(eq(officers.id, officerId));

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("DELETE ROUTE ERROR:", error);
    return NextResponse.json({ error: "An unexpected error occurred while deleting officer." }, { status: 500 });
  }
}