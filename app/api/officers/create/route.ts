import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import {
  officers,
  phones,
  certs,
  sectors,
  officerCerts,
  roles,
  officerCertRoles,
  auditLogs,
  loginCredentials,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

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
    const requestedSystemRole = (formData.get("systemRole") as string) || "officer";
    const password = formData.get("password") as string;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Email are required fields." },
        { status: 400 },
      );
    }

    let systemRole: "officer" | "admin" | "superadmin" = "officer";
    if (session.role !== "superadmin") {
      if (requestedSystemRole && requestedSystemRole !== "officer") {
        return NextResponse.json(
          { error: "Admins can only create Officer accounts." },
          { status: 403 }
        );
      }
      systemRole = "officer";
    } else {
      if (["officer", "admin", "superadmin"].includes(requestedSystemRole)) {
        systemRole = requestedSystemRole as any;
      }
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
        systemRole,
      })
      .returning();

    // 1.5 Insert Login Credentials
    if (password && password.trim()) {
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = crypto.pbkdf2Sync(
        password.trim(),
        salt,
        1000,
        64,
        "sha512"
      ).toString("hex");

      await db.insert(loginCredentials).values({
        officerId: newOfficer.id,
        username: email.trim(),
        passwordHash,
        salt,
      });
    }

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
        .where(eq(certs.shortName, certName.trim()));

      if (!existingCert) {
        let [defaultSector] = await db.select().from(sectors).limit(1);
        if (!defaultSector) {
          [defaultSector] = await db
            .insert(sectors)
            .values({ name: "General" })
            .returning();
        }

        [existingCert] = await db
          .insert(certs)
          .values({
            shortName: certName.trim(),
            fullName: certName.trim(),
            sectorId: defaultSector.id,
          })
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
    const [actor] = await db
      .select()
      .from(officers)
      .where(eq(officers.id, session.userId))
      .limit(1);

    const actorName = actor?.name || "Admin";

    const changesArray = [
      { field: "Created Profile", old: "", new: name },
      { field: "Email", old: "", new: email },
      { field: "System Role", old: "", new: systemRole },
      ...(phone ? [{ field: "Phone", old: "", new: phone.trim() }] : []),
      ...(certName ? [{ field: "Cert", old: "", new: certName.trim() }] : []),
      ...(roleName ? [{ field: "Role", old: "", new: roleName.trim() }] : []),
      ...(password && password.trim()
        ? [{ field: "Initial Password", old: "", new: "••••••••" }]
        : []),
    ];

    await db.insert(auditLogs).values({
      officerId: session.userId,
      officerName: actorName,
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