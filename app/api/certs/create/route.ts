import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { certs, auditLogs, officers, areas } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    const sarabanContactsRaw = formData.get("sarabanContacts") as string;
    let sarabanContacts: any[] = [];
    if (sarabanContactsRaw) {
      try { sarabanContacts = JSON.parse(sarabanContactsRaw); } catch(e) {}
    }
    const contact247Email = (formData.get("contact247Email") as string) || "";
    const contact247Phone = (formData.get("contact247Phone") as string) || "";
    const establishmentStatus = (formData.get("establishmentStatus") as string) || "not_started";
    const logoFile = formData.get("logo") as File | null;

    let logoUrl: string | null = null;
    if (logoFile && logoFile.size > 0) {
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      logoUrl = `data:${logoFile.type};base64,${buffer.toString("base64")}`;
    }

    // Since area is required, get or create a default area
    let [defaultArea] = await db.select().from(areas).limit(1);
    if (!defaultArea) {
      [defaultArea] = await db
        .insert(areas)
        .values({ name: "General Area" })
        .returning();
    }

    // Check if a cert with this shortName already exists
    const existingCert = await db.select().from(certs).where(eq(certs.shortName, shortName)).limit(1);
    if (existingCert.length > 0) {
      return NextResponse.json(
        { error: "A CERT with this Short Name already exists." },
        { status: 409 }
      );
    }

    // Insert the new CERT
    const [newCert] = await db.insert(certs).values({
      shortName,
      fullName,
      location: location || null,
      sarabanEmail: sarabanEmail || null,
      sarabanContacts: sarabanContacts,
      contact247Email: contact247Email || null,
      contact247Phone: contact247Phone || null,
      establishmentStatus,
      logoUrl,
      areaId: defaultArea.id,
    }).returning();

    // Audit log
    const [actor] = await db
      .select()
      .from(officers)
      .where(eq(officers.id, session.userId))
      .limit(1);

    const actorName = actor?.name || "Super Admin";

    await db.insert(auditLogs).values({
      officerId: session.userId,
      officerName: actorName,
      action: "CREATED",
      changes: [
        { field: "Target CERT", old: "", new: shortName },
        { field: "Full Name", old: "", new: fullName },
      ],
    });

    revalidatePath("/admin/certs");

    return NextResponse.json({ success: true, certId: newCert.id });
  } catch (error) {
    console.error("Error creating CERT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
