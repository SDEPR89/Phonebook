import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import {
  officers,
  phones,
  certs,
  units,
  areas,
  officerCerts,
  roles,
  officerCertRoles,
  auditLogs,
  loginCredentials,
  certUnits,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/app/lib/crypto";
import { isValidEmail } from "@/app/lib/validators";

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

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
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
        systemRole = requestedSystemRole as "officer" | "admin" | "superadmin";
      }
    }

    const avatarFile = formData.get("avatar") as File | null;
    let avatarUrl: string | null = null;

    if (avatarFile && avatarFile.size > 0) {
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
    }

    const newOfficer = await db.transaction(async (tx) => {
      // 1. Insert Officer
      const [officer] = await tx
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
        const { hash: passwordHash, salt } = hashPassword(password.trim());

        await tx.insert(loginCredentials).values({
          officerId: officer.id,
          username: email.trim(),
          passwordHash,
          salt,
        });
      }

      // 2. Insert Phone
      if (phone && phone.trim()) {
        await tx.insert(phones).values({
          officerId: officer.id,
          phoneNumber: phone.trim(),
        });
      }

      // 3. Insert Cert and Role
      if (certName && certName.trim()) {
        let [existingCert] = await tx
          .select()
          .from(certs)
          .where(eq(certs.shortName, certName.trim()));

        if (!existingCert) {
          let [defaultUnit] = await tx.select().from(units).limit(1);
          if (!defaultUnit) {
            [defaultUnit] = await tx
              .insert(units)
              .values({ name: "General Unit" })
              .returning();
          }

          let [defaultArea] = await tx.select().from(areas).limit(1);
          if (!defaultArea) {
            [defaultArea] = await tx
              .insert(areas)
              .values({ name: "General Area" })
              .returning();
          }

          [existingCert] = await tx
            .insert(certs)
            .values({
              shortName: certName.trim(),
              fullName: certName.trim(),
              areaId: defaultArea.id,
            })
            .returning();

          await tx.insert(certUnits).values({
            certId: existingCert.id,
            unitId: defaultUnit.id,
          });
        }

        // Guard: find existing membership before inserting to avoid duplicates
        const [existingMembership] = await tx
          .select({ id: officerCerts.id })
          .from(officerCerts)
          .where(
            and(
              eq(officerCerts.officerId, officer.id),
              eq(officerCerts.certId, existingCert.id)
            )
          )
          .limit(1);

        const [newOfficerCert] = existingMembership
          ? [existingMembership]
          : await tx
              .insert(officerCerts)
              .values({ officerId: officer.id, certId: existingCert.id })
              .returning();

        if (roleName && roleName.trim()) {
          let [existingRole] = await tx
            .select()
            .from(roles)
            .where(eq(roles.name, roleName.trim()));

          if (!existingRole) {
            [existingRole] = await tx
              .insert(roles)
              .values({ name: roleName.trim() })
              .returning();
          }

          await tx.insert(officerCertRoles).values({
            officerCertId: newOfficerCert.id,
            roleId: existingRole.id,
          });
        }
      }

      // 4. Insert CREATED Audit Log
      const [actor] = await tx
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

      await tx.insert(auditLogs).values({
        officerId: session.userId,
        officerName: actorName,
        action: "CREATED",
        changes: changesArray,
      });

      return officer;
    });

    // Revalidate paths so new officer and history logs show immediately
    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true, officer: newOfficer });
  } catch (err: any) {
    console.error("Failed to save officer:", err);

    if (err?.code === "23505" || err?.message?.includes("unique constraint")) {
      return NextResponse.json(
        { error: "An officer or credential with this email/phone number already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while creating the officer." },
      { status: 500 }
    );
  }
}