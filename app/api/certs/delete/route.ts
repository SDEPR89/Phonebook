import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { certs, certUnits, officerCerts, auditLogs, officers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidUuid } from "@/app/lib/validators";

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Only Super Admins can delete CERTs." }, { status: 403 });
    }

    const { certId } = await req.json();

    if (!certId || !isValidUuid(certId)) {
      return NextResponse.json(
        { error: "Valid CERT ID is required." },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const existingCert = await tx
        .select()
        .from(certs)
        .where(eq(certs.id, certId))
        .limit(1);

      if (existingCert.length === 0) {
        return { error: "CERT not found.", status: 404 };
      }

      const certName = existingCert[0].shortName;

      const [actor] = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, session.userId))
        .limit(1);
      const actorName = actor?.name || "Super Admin";

      await tx.insert(auditLogs).values({
        officerId: session.userId,
        officerName: actorName,
        action: "DELETED",
        changes: [
          { field: "Target CERT", old: certName, new: "" }
        ],
      });

      await tx.delete(certs).where(eq(certs.id, certId));

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    revalidatePath("/admin/certs");

    return NextResponse.json({ success: true, message: "CERT deleted successfully." });
  } catch (error: unknown) {
    console.error("CERT DELETE ERROR:", error);
    return NextResponse.json({ error: "An unexpected error occurred while deleting CERT." }, { status: 500 });
  }
}
