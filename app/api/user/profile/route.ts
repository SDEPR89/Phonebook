import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerCertRoles,
  roles,
  auditLogs,
  loginCredentials,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword } from "@/app/lib/crypto";
import { isValidEmail } from "@/app/lib/validators";

// GET profile with created_at & updated_at timestamps
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [officer] = await db
      .select()
      .from(officers)
      .where(and(eq(officers.id, session.userId), isNull(officers.deletedAt)))
      .limit(1);

    if (!officer) {
      if (session.role === "admin" || session.role === "superadmin") {
        return NextResponse.json({
          id: session.userId,
          name: session.role === "superadmin" ? "SUPERADMIN" : "SYSTEM ADMINISTRATOR",
          email: "admin@thaicert.or.th",
          phone: "",
          avatarUrl: "/unlogin-avatar.svg",
          systemRole: session.role,
          certName: "ThaiCERT",
          roles: [session.role === "superadmin" ? "Super Admin" : "Admin"],
          createdAt: null,
          updatedAt: null,
        });
      }
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [phoneRecord] = await db
      .select()
      .from(phones)
      .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));

    const certRows = await db
      .select({ certName: certs.shortName, roleName: roles.name })
      .from(officerCerts)
      .leftJoin(certs, eq(officerCerts.certId, certs.id))
      .leftJoin(
        officerCertRoles,
        eq(officerCertRoles.officerCertId, officerCerts.id),
      )
      .leftJoin(roles, eq(officerCertRoles.roleId, roles.id))
      .where(eq(officerCerts.officerId, officer.id));

    const certName = certRows[0]?.certName ?? "No Cert";
    const userRoles = Array.from(
      new Set(
        certRows.map((r) => r.roleName).filter((r): r is string => Boolean(r)),
      ),
    );

    return NextResponse.json({
      id: officer.id,
      name: officer.name ?? "",
      email: officer.email ?? "",
      phone: phoneRecord?.phoneNumber ?? "",
      avatarUrl: officer.avatarUrl || "/unlogin-avatar.svg",
      systemRole: officer.systemRole ?? session?.role ?? "officer",
      certName,
      roles: userRoles,
      createdAt: officer.createdAt,
      updatedAt: officer.updatedAt,
    });
  } catch (err) {
    console.error("GET profile error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PUT endpoint to update details
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const avatarFile = formData.get("avatar") as File | null;

    // Cert & Role only accepted from superadmin
    const certNameRaw = session.role === "superadmin" ? (formData.get("certName") as string | null) : null;
    const roleNameRaw = session.role === "superadmin" ? (formData.get("roleName") as string | null) : null;
    const newCertName = certNameRaw?.trim() || "";
    const newRoleName = roleNameRaw?.trim() || "";

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Email are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 },
      );
    }

    let avatarUrl: string | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
    }

    const result = await db.transaction(async (tx) => {
      const [officer] = await tx
        .select()
        .from(officers)
        .where(and(eq(officers.id, session.userId), isNull(officers.deletedAt)))
        .limit(1);

      if (!officer) {
        return { error: "User not found", status: 404 };
      }

      const updatePayload: {
        name: string;
        email: string;
        avatarUrl?: string;
        updatedAt: Date;
      } = {
        name: name.trim(),
        email: email.trim(),
        updatedAt: new Date(),
      };
      if (avatarUrl !== undefined) {
        updatePayload.avatarUrl = avatarUrl;
      }

      // For Audit Logs
      const changes: { field: string; old: string; new: string }[] = [];
      if (officer.name !== name.trim()) {
        changes.push({ field: "Name", old: officer.name || "", new: name.trim() });
      }
      const emailChanged = officer.email !== email.trim();
      if (emailChanged) {
        changes.push({ field: "Email", old: officer.email || "", new: email.trim() });
      }

      const existingPhoneResult = await tx
        .select()
        .from(phones)
        .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));
      
      const existingPhoneNumber = existingPhoneResult[0]?.phoneNumber || "";
      const trimmedPhone = phone !== null ? phone.trim() : null;

      if (trimmedPhone !== null && trimmedPhone !== existingPhoneNumber) {
        changes.push({ field: "Phone", old: existingPhoneNumber, new: trimmedPhone });
      }

      await tx
        .update(officers)
        .set(updatePayload)
        .where(eq(officers.id, officer.id));

      if (trimmedPhone !== null) {
        if (trimmedPhone === "") {
          // If phone is cleared, soft-delete existing phone record
          if (existingPhoneResult.length > 0) {
            await tx
              .update(phones)
              .set({ deletedAt: new Date() })
              .where(eq(phones.id, existingPhoneResult[0].id));
          }
        } else if (existingPhoneResult.length > 0) {
          await tx
            .update(phones)
            .set({ phoneNumber: trimmedPhone, updatedAt: new Date() })
            .where(eq(phones.id, existingPhoneResult[0].id));
        } else {
          await tx.insert(phones).values({
            officerId: officer.id,
            phoneNumber: trimmedPhone,
          });
        }
      }

      // Cert & Role update — superadmin only
      if (session.role === "superadmin" && (certNameRaw !== null || roleNameRaw !== null)) {
        // Fetch current cert assignment
        const [existingOC] = await tx
          .select({ junctionId: officerCerts.id, certShortName: certs.shortName })
          .from(officerCerts)
          .leftJoin(certs, eq(certs.id, officerCerts.certId))
          .where(eq(officerCerts.officerId, officer.id))
          .limit(1);

        const oldCertName = existingOC?.certShortName || "";
        let junctionId: string | null = existingOC?.junctionId || null;

        if (certNameRaw !== null && newCertName !== oldCertName) {
          changes.push({ field: "Cert", old: oldCertName, new: newCertName });

          if (newCertName) {
            // Find or use existing cert
            const [existingCertRecord] = await tx
              .select({ id: certs.id })
              .from(certs)
              .where(eq(certs.shortName, newCertName))
              .limit(1);

            const targetCertId = existingCertRecord?.id;
            if (targetCertId) {
              if (junctionId) {
                await tx
                  .update(officerCerts)
                  .set({ certId: targetCertId, updatedAt: new Date() })
                  .where(eq(officerCerts.id, junctionId));
              } else {
                const [newJunction] = await tx
                  .insert(officerCerts)
                  .values({ officerId: officer.id, certId: targetCertId })
                  .returning({ id: officerCerts.id });
                junctionId = newJunction.id;
              }
            }
          }
        }

        if (roleNameRaw !== null && junctionId) {
          // Fetch current role
          const [existingOCR] = await tx
            .select({ roleName: roles.name })
            .from(officerCertRoles)
            .leftJoin(roles, eq(roles.id, officerCertRoles.roleId))
            .where(eq(officerCertRoles.officerCertId, junctionId))
            .limit(1);

          const oldRoleName = existingOCR?.roleName || "";

          if (newRoleName !== oldRoleName) {
            changes.push({ field: "Role", old: oldRoleName, new: newRoleName });

            if (newRoleName) {
              let [targetRole] = await tx
                .select({ id: roles.id })
                .from(roles)
                .where(eq(roles.name, newRoleName))
                .limit(1);

              if (!targetRole) {
                [targetRole] = await tx
                  .insert(roles)
                  .values({ name: newRoleName })
                  .returning({ id: roles.id });
              }

              // Replace role assignment
              await tx
                .delete(officerCertRoles)
                .where(eq(officerCertRoles.officerCertId, junctionId));

              await tx
                .insert(officerCertRoles)
                .values({ officerCertId: junctionId, roleId: targetRole.id });
            } else {
              // Clear role
              await tx
                .delete(officerCertRoles)
                .where(eq(officerCertRoles.officerCertId, junctionId));
            }
          }
        }
      }

      const newPassword = formData.get("newPassword") as string;
      const [existingCred] = await tx
        .select()
        .from(loginCredentials)
        .where(eq(loginCredentials.officerId, officer.id))
        .limit(1);

      if (newPassword && newPassword.trim()) {
        const { hash: passwordHash, salt } = hashPassword(newPassword.trim());

        if (existingCred) {
          await tx
            .update(loginCredentials)
            .set({
              passwordHash,
              salt,
              username: email.trim(),
              updatedAt: new Date(),
            })
            .where(eq(loginCredentials.id, existingCred.id));
        } else {
          await tx.insert(loginCredentials).values({
            officerId: officer.id,
            username: email.trim(),
            passwordHash,
            salt,
          });
        }

        changes.push({ field: "Password", old: "••••••••", new: "••••••••" });
      } else if (emailChanged && existingCred) {
        // Sync loginCredentials username if email changed without password change
        await tx
          .update(loginCredentials)
          .set({ username: email.trim(), updatedAt: new Date() })
          .where(eq(loginCredentials.id, existingCred.id));
      }

      // Insert Audit Log if there are changes
      if (changes.length > 0) {
        await tx.insert(auditLogs).values({
          officerId: session.userId,
          officerName: officer.name || "Unknown Officer",
          action: "UPDATED",
          changes: changes,
        });
      }

      return { success: true, changes, unchanged: changes.length === 0 && avatarUrl === undefined };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (result.unchanged) {
      return NextResponse.json({ success: true, unchanged: true, message: "Nothing changed." });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PUT profile error:", err);
    if (err?.code === "23505" || err?.message?.includes("unique constraint")) {
      return NextResponse.json(
        { error: "An officer or phone number with these details already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE endpoint for Soft Delete
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.transaction(async (tx) => {
      const [officer] = await tx
        .select()
        .from(officers)
        .where(and(eq(officers.id, session.userId), isNull(officers.deletedAt)))
        .limit(1);

      if (!officer) {
        return { error: "User not found", status: 404 };
      }

      const now = new Date();

      // 1. Soft delete officer record
      await tx
        .update(officers)
        .set({ deletedAt: now })
        .where(eq(officers.id, officer.id));

      // 2. Soft delete associated phone record
      await tx
        .update(phones)
        .set({ deletedAt: now })
        .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "User soft deleted successfully",
    });
  } catch (err) {
    console.error("DELETE profile error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}