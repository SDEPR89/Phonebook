import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import {
  officers,
  phones,
  certs,
  officerCerts,
  roles,
  officerCertRoles,
  auditLogs,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();

    const rawName = formData.get("name") as string;
    const name = rawName ? rawName.toUpperCase() : "";
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const certName = formData.get("cert") as string;
    const roleName = formData.get("role") as string;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Email are required fields." },
        { status: 400 },
      );
    }

    const avatarFile = formData.get("avatar") as File | null;
    let avatarUrl: string | null = null;

    if (avatarFile && avatarFile.size > 0) {
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
    }

    // 1. Insert Officer
    const [newOfficer] = await db
      .insert(officers)
      .values({
        name,
        email,
        avatarUrl,
      })
      .returning();

    // 2. Insert Phone
    if (phone && phone.trim()) {
      await db.insert(phones).values({
        officerId: newOfficer.id,
        phoneNumber: phone.trim(),
      });
    }

    // 3. Insert Cert and Role
    if (certName && certName.trim()) {
      let [existingCert] = await db
        .select()
        .from(certs)
        .where(eq(certs.name, certName.trim()));

      if (!existingCert) {
        [existingCert] = await db
          .insert(certs)
          .values({ name: certName.trim() })
          .returning();
      }

      const [newOfficerCert] = await db
        .insert(officerCerts)
        .values({
          officerId: newOfficer.id,
          certId: existingCert.id,
        })
        .returning();

      if (roleName && roleName.trim()) {
        let [existingRole] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, roleName.trim()));

        if (!existingRole) {
          [existingRole] = await db
            .insert(roles)
            .values({ name: roleName.trim() })
            .returning();
        }

        await db.insert(officerCertRoles).values({
          officerCertId: newOfficerCert.id,
          roleId: existingRole.id,
        });
      }
    }

    // 4. Insert CREATED Audit Log
    const changesArray = [
      { field: "Email", old: "", new: email },
      ...(phone ? [{ field: "Phone", old: "", new: phone.trim() }] : []),
      ...(certName ? [{ field: "Cert", old: "", new: certName.trim() }] : []),
      ...(roleName ? [{ field: "Role", old: "", new: roleName.trim() }] : []),
    ];

    await db.insert(auditLogs).values({
      officerId: newOfficer.id,
      officerName: newOfficer.name,
      action: "CREATED",
      changes: changesArray,
    });

    // Revalidate paths so new officer and history logs show immediately
    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true, officer: newOfficer });
  } catch (err: unknown) {
    console.error("Failed to save officer:", err);

    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}