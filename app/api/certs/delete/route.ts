import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { certs, certUnits, officerCerts, auditLogs, officers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Only Super Admins can delete CERTs." }, { status: 403 });
    }

    const { certId } = await req.json();

    if (!certId) {
      return NextResponse.json(
        { error: "CERT ID is required." },
        { status: 400 },
      );
    }

    const existingCert = await db
      .select()
      .from(certs)
      .where(eq(certs.id, certId))
      .limit(1);

    if (existingCert.length === 0) {
      return NextResponse.json({ error: "CERT not found." }, { status: 404 });
    }

    const certName = existingCert[0].shortName;

    // Since deleting a CERT cascades to officerCerts and certUnits in the database schema 
    // (via onDelete: "cascade" in references), we can just delete the cert directly.
    await db.delete(certs).where(eq(certs.id, certId));

    const [actor] = await db
      .select()
      .from(officers)
      .where(eq(officers.id, session.userId))
      .limit(1);
    const actorName = actor?.name || "Super Admin";

    await db.insert(auditLogs).values({
      officerId: session.userId,
      officerName: actorName,
      action: "DELETED",
      changes: [
        { field: "Target CERT", old: certName, new: "" }
      ],
    });

    revalidatePath("/admin/certs");

    return NextResponse.json({ success: true, message: "CERT deleted successfully." });
  } catch (error: unknown) {
    console.error("CERT DELETE ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
