import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { certs, auditLogs, officers, certUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidUuid, parseJsonArray } from "@/app/lib/validators";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Only Super Admins can update CERTs." }, { status: 403 });
    }

    const formData = await req.formData();
    
    const certId = (formData.get("certId") as string) || "";
    const shortName = (formData.get("shortName") as string) || "";
    const fullName = (formData.get("fullName") as string) || "";
    const location = (formData.get("location") as string) || "";
    const sarabanEmail = (formData.get("sarabanEmail") as string) || "";
    const sarabanContacts = parseJsonArray<{ type: "phone" | "fax"; number: string }>(
      formData.get("sarabanContacts") as string
    );
    const coordinators = parseJsonArray<string>(formData.get("coordinators") as string);
    const contact247Email = (formData.get("contact247Email") as string) || "";
    const contact247Phone = (formData.get("contact247Phone") as string) || "";
    const establishmentStatus = (formData.get("establishmentStatus") as string) || "";
    const areaId = (formData.get("areaId") as string) || "";
    const units = parseJsonArray<string>(formData.get("units") as string);
    
    const logoFile = formData.get("logo") as File | null;

    if (!certId || !shortName || !fullName) {
      return NextResponse.json(
        { error: "CERT ID, Short Name, and Full Name are required." },
        { status: 400 },
      );
    }

    if (!isValidUuid(certId)) {
      return NextResponse.json(
        { error: "Invalid CERT ID format." },
        { status: 400 },
      );
    }

    if (areaId && !isValidUuid(areaId)) {
      return NextResponse.json(
        { error: "Invalid Area ID format." },
        { status: 400 },
      );
    }

    let logoUrl: string | undefined = undefined;
    if (logoFile && logoFile.size > 0) {
      const arrayBuffer = await logoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      logoUrl = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
    }

    const result = await db.transaction(async (tx) => {
      const existingCert = await tx
        .select()
        .from(certs)
        .where(eq(certs.id, certId))
        .limit(1);

      if (existingCert.length === 0) {
        return { error: "CERT record not found.", status: 404 };
      }

      const currentCert = existingCert[0];
      const changes: Array<{ field: string; old: string; new: string }> = [];

      if (currentCert.shortName !== shortName) changes.push({ field: "Short Name", old: currentCert.shortName, new: shortName });
      if (currentCert.fullName !== fullName) changes.push({ field: "Full Name", old: currentCert.fullName, new: fullName });
      if ((currentCert.location || "") !== location) changes.push({ field: "Location", old: currentCert.location || "", new: location });
      if ((currentCert.sarabanEmail || "") !== sarabanEmail) changes.push({ field: "Saraban Email", old: currentCert.sarabanEmail || "", new: sarabanEmail });
      if (JSON.stringify(currentCert.sarabanContacts || []) !== JSON.stringify(sarabanContacts)) changes.push({ field: "Saraban Contacts", old: JSON.stringify(currentCert.sarabanContacts || []), new: JSON.stringify(sarabanContacts) });
      if (JSON.stringify(currentCert.coordinators || []) !== JSON.stringify(coordinators)) changes.push({ field: "Coordinators", old: JSON.stringify(currentCert.coordinators || []), new: JSON.stringify(coordinators) });
      if ((currentCert.contact247Email || "") !== contact247Email) changes.push({ field: "24/7 Email", old: currentCert.contact247Email || "", new: contact247Email });
      if ((currentCert.contact247Phone || "") !== contact247Phone) changes.push({ field: "24/7 Phone", old: currentCert.contact247Phone || "", new: contact247Phone });
      if ((currentCert.establishmentStatus || "not_started") !== establishmentStatus) changes.push({ field: "Status", old: currentCert.establishmentStatus || "not_started", new: establishmentStatus });
      if (areaId && currentCert.areaId !== areaId) changes.push({ field: "Area", old: currentCert.areaId, new: areaId });
      if (logoUrl) changes.push({ field: "Logo", old: "Previous Logo", new: "Updated Logo" });

      await tx
        .update(certs)
        .set({
          shortName,
          fullName,
          location: location || null,
          sarabanEmail: sarabanEmail || null,
          sarabanContacts: sarabanContacts,
          coordinators: coordinators,
          contact247Email: contact247Email || null,
          contact247Phone: contact247Phone || null,
          establishmentStatus: establishmentStatus || "not_started",
          ...(areaId && { areaId }),
          ...(logoUrl && { logoUrl }),
          updatedAt: new Date(),
        })
        .where(eq(certs.id, certId));

      await tx.delete(certUnits).where(eq(certUnits.certId, certId));
      if (units.length > 0) {
        const uniqueUnits = Array.from(new Set(units));
        await tx.insert(certUnits).values(
          uniqueUnits.map(unitId => ({
            certId,
            unitId
          }))
        );
      }

      if (changes.length > 0) {
        const [actor] = await tx
          .select()
          .from(officers)
          .where(eq(officers.id, session.userId))
          .limit(1);

        const actorName = actor?.name || "Super Admin";

        await tx.insert(auditLogs).values({
          officerId: session.userId,
          officerName: actorName,
          action: "UPDATED",
          changes: [
            { field: "Target CERT", old: "", new: shortName },
            ...changes,
          ],
        });
      }

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    revalidatePath("/admin/certs");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CERT UPDATE ERROR:", error);
    if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
      return NextResponse.json({ error: "A CERT with this short name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "An unexpected error occurred while updating CERT." }, { status: 500 });
  }
}
