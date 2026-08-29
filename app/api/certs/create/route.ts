import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { certs, auditLogs, officers, areas, certUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isValidUuid, parseJsonArray } from "@/app/lib/validators";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 },
      );
    }

    const formData = await req.formData();

    const shortName = formData.get("shortName") as string;
    const fullName = formData.get("fullName") as string;

    if (!shortName || !fullName) {
      return NextResponse.json(
        { error: "Short Name and Full Name are required." },
        { status: 400 }
      );
    }

    const location = (formData.get("location") as string) || "";
    const sarabanEmail = (formData.get("sarabanEmail") as string) || "";
    const sarabanContacts = parseJsonArray<{ type: "phone" | "fax"; number: string }>(
      formData.get("sarabanContacts") as string
    );
    const contact247Email = (formData.get("contact247Email") as string) || "";
    const contact247Phone = (formData.get("contact247Phone") as string) || "";
    const establishmentStatus = (formData.get("establishmentStatus") as string) || "not_started";
    const providedAreaId = formData.get("areaId") as string;

    if (providedAreaId && !isValidUuid(providedAreaId)) {
      return NextResponse.json(
        { error: "Invalid area ID format. Must be a valid UUID." },
        { status: 400 }
      );
    }

    const units = parseJsonArray<string>(formData.get("units") as string);
    const logoFile = formData.get("logo") as File | null;

    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      logoUrl = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
    }

    const newCertId = await db.transaction(async (tx) => {
      // Since area is required, get or create a default area
      let [defaultArea] = await tx.select().from(areas).limit(1);
      if (!defaultArea) {
        [defaultArea] = await tx
          .insert(areas)
          .values({ name: "General Area" })
          .returning();
      }

      // Check if a cert with this shortName already exists
      const existingCert = await tx.select().from(certs).where(eq(certs.shortName, shortName)).limit(1);
      if (existingCert.length > 0) {
        throw new Error("EXISTS:A CERT with this Short Name already exists.");
      }

      // Validate providedAreaId exists before using it
      if (providedAreaId) {
        const [areaExists] = await tx
          .select({ id: areas.id })
          .from(areas)
          .where(eq(areas.id, providedAreaId))
          .limit(1);
        if (!areaExists) {
          throw new Error("INVALID_AREA:The specified area does not exist.");
        }
      }

      // Insert the new CERT
      const [newCert] = await tx.insert(certs).values({
        shortName,
        fullName,
        location: location || null,
        sarabanEmail: sarabanEmail || null,
        sarabanContacts: sarabanContacts,
        contact247Email: contact247Email || null,
        contact247Phone: contact247Phone || null,
        establishmentStatus,
        logoUrl,
        areaId: providedAreaId || defaultArea.id,
      }).returning();

      // Insert the selected units
      if (units.length > 0) {
        const uniqueUnits = Array.from(new Set(units));
        await tx.insert(certUnits).values(
          uniqueUnits.map(unitId => ({
            certId: newCert.id,
            unitId
          }))
        );
      }

      // Audit log
      const [actor] = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, session.userId))
        .limit(1);

      const actorName = actor?.name || "Super Admin";

      await tx.insert(auditLogs).values({
        officerId: session.userId,
        officerName: actorName,
        action: "CREATED",
        changes: [
          { field: "Target CERT", old: "", new: shortName },
          { field: "Full Name", old: "", new: fullName },
        ],
      });

      return newCert.id;
    });

    revalidatePath("/admin/certs");

    return NextResponse.json({ success: true, certId: newCertId });
  } catch (error: any) {
    if (error?.message?.startsWith("EXISTS:")) {
      return NextResponse.json({ error: error.message.replace("EXISTS:", "") }, { status: 409 });
    }
    if (error?.message?.startsWith("INVALID_AREA:")) {
      return NextResponse.json({ error: error.message.replace("INVALID_AREA:", "") }, { status: 400 });
    }
    console.error("Error creating CERT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
