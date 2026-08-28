import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { certs, auditLogs, officers, certUnits } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const sarabanContactsRaw = formData.get("sarabanContacts") as string;
    let sarabanContacts: any[] = [];
    if (sarabanContactsRaw) {
      try { sarabanContacts = JSON.parse(sarabanContactsRaw); } catch(e) {}
    }
    const coordinatorsRaw = formData.get("coordinators") as string;
    let coordinators: string[] = [];
    if (coordinatorsRaw) {
      try { coordinators = JSON.parse(coordinatorsRaw); } catch(e) {}
    }
    const contact247Email = (formData.get("contact247Email") as string) || "";
    const contact247Phone = (formData.get("contact247Phone") as string) || "";
    const establishmentStatus = (formData.get("establishmentStatus") as string) || "";
    const areaId = (formData.get("areaId") as string) || "";
    const unitsRaw = formData.get("units") as string;
    let units: string[] = [];
    if (unitsRaw) {
      try { units = JSON.parse(unitsRaw); } catch(e) {}
    }
    
    const logoFile = formData.get("logo") as File | null;

    if (!certId || !shortName || !fullName) {
      return NextResponse.json(
        { error: "CERT ID, Short Name, and Full Name are required." },
        { status: 400 },
      );
    }

    const existingCert = await db
      .select()
      .from(certs)
      .where(eq(certs.id, certId))
      .limit(1);

    if (existingCert.length === 0) {
      return NextResponse.json(
        { error: "CERT record not found." },
        { status: 404 },
      );
    }

    let logoUrl: string | undefined = undefined;
    if (logoFile && logoFile.size > 0) {
      const arrayBuffer = await logoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      logoUrl = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
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
    // Note: Logging unit changes is more complex and omitted here for simplicity, but could be added.
    if (logoUrl) changes.push({ field: "Logo", old: "Previous Logo", new: "Updated Logo" });

    await db
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

    await db.delete(certUnits).where(eq(certUnits.certId, certId));
    if (units.length > 0) {
      const uniqueUnits = Array.from(new Set(units));
      await db.insert(certUnits).values(
        uniqueUnits.map(unitId => ({
          certId,
          unitId
        }))
      );
    }

    if (changes.length > 0) {
      const [actor] = await db
        .select()
        .from(officers)
        .where(eq(officers.id, session.userId))
        .limit(1);

      const actorName = actor?.name || "Super Admin";

      await db.insert(auditLogs).values({
        officerId: session.userId,
        officerName: actorName,
        action: "UPDATED",
        changes: [
          { field: "Target CERT", old: "", new: shortName },
          ...changes,
        ],
      });
    }

    revalidatePath("/admin/certs");

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("CERT UPDATE ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
