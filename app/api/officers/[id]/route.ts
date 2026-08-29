import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import {
  officers,
  phones,
  officerCerts,
  certs,
  units,
  areas,
  officerCertRoles,
  roles,
  certUnits,
  loginCredentials,
  auditLogs,
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { isValidUuid, isValidEmail } from "@/app/lib/validators";

//GET officer details with timestamp
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: officerId } = await params;
    if (!isValidUuid(officerId)) {
      return NextResponse.json({ error: "Invalid officer ID format" }, { status: 400 });
    }

    const [officer] = await db
      .select()
      .from(officers)
      .where(and(eq(officers.id, officerId), isNull(officers.deletedAt)));
    if (!officer) {
      return NextResponse.json({ error: "Officer not found" }, { status: 404 });
    }

    const [phoneRecord] = await db
      .select()
      .from(phones)
      .where(and(eq(phones.officerId, officerId), isNull(phones.deletedAt)));

    return NextResponse.json({
      ...officer,
      phoneNumber: phoneRecord?.phoneNumber ?? "",
    });
  } catch (err) {
    console.error("GET officer error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// PUT to update Officer, Phone, Cert, and Role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: officerId } = await params;

    if (!isValidUuid(officerId)) {
      return NextResponse.json(
        { error: "Invalid officer ID format" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const certName = formData.get("cert") as string;
    const roleName = formData.get("role") as string;
    const avatarFile = formData.get("avatar") as File | null;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Email are required" },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    let avatarUrl: string | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
    }

    const result = await db.transaction(async (tx) => {
      const [targetOfficer] = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, officerId))
        .limit(1);

      if (!targetOfficer) {
        return { error: "Officer not found", status: 404 };
      }

      if (targetOfficer.systemRole === "superadmin" && session.role !== "superadmin") {
        return { error: "Only Super Admins can modify Super Admin accounts.", status: 403 };
      }

      const emailChanged = targetOfficer.email !== email.trim();

      // 1. Update Officer Details
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

      await tx
        .update(officers)
        .set(updatePayload)
        .where(eq(officers.id, officerId));

      // 1.5 Sync loginCredentials username if email changed
      if (emailChanged) {
        await tx
          .update(loginCredentials)
          .set({ username: email.trim(), updatedAt: new Date() })
          .where(eq(loginCredentials.officerId, officerId));
      }

      // 2. Update Phone Number
      if (phone !== null) {
        const trimmedPhone = phone.trim();
        const existingPhone = await tx
          .select()
          .from(phones)
          .where(and(eq(phones.officerId, officerId), isNull(phones.deletedAt)));

        if (trimmedPhone === "") {
          if (existingPhone.length > 0) {
            await tx
              .update(phones)
              .set({ deletedAt: new Date() })
              .where(eq(phones.id, existingPhone[0].id));
          }
        } else if (existingPhone.length > 0) {
          await tx
            .update(phones)
            .set({ phoneNumber: trimmedPhone, updatedAt: new Date() })
            .where(eq(phones.id, existingPhone[0].id));
        } else {
          await tx.insert(phones).values({
            officerId,
            phoneNumber: trimmedPhone,
          });
        }
      }

      // 3. Update Cert & Role
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

        const existingOfficerCert = await tx
          .select()
          .from(officerCerts)
          .where(eq(officerCerts.officerId, officerId));

        let officerCertId: string;
        if (existingOfficerCert.length > 0) {
          officerCertId = existingOfficerCert[0].id;
          await tx
            .update(officerCerts)
            .set({ certId: existingCert.id })
            .where(eq(officerCerts.id, officerCertId));
        } else {
          const [newOfficerCert] = await tx
            .insert(officerCerts)
            .values({ officerId, certId: existingCert.id })
            .returning();
          officerCertId = newOfficerCert.id;
        }

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

          // Delete & Re-insert link for composite keys
          await tx
            .delete(officerCertRoles)
            .where(eq(officerCertRoles.officerCertId, officerCertId));

          await tx.insert(officerCertRoles).values({
            officerCertId,
            roleId: existingRole.id,
          });
        }
      }

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to update officer:", err);
    if (err?.code === "23505" || err?.message?.includes("unique constraint")) {
      return NextResponse.json(
        { error: "An officer or phone number with these details already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE for Soft Delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: officerId } = await params;

    if (!isValidUuid(officerId)) {
      return NextResponse.json(
        { error: "Invalid officer ID format" },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const [targetOfficer] = await tx
        .select({ systemRole: officers.systemRole })
        .from(officers)
        .where(eq(officers.id, officerId))
        .limit(1);

      if (!targetOfficer) {
        return { error: "Officer not found", status: 404 };
      }

      if (targetOfficer?.systemRole === "superadmin" && session.role !== "superadmin") {
        return { error: "Only Super Admins can delete Super Admin accounts.", status: 403 };
      }

      // Fetch full officer record for the audit log
      const [fullOfficer] = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, officerId))
        .limit(1);

      // Fetch actor name for the audit log
      const [actor] = await tx
        .select()
        .from(officers)
        .where(eq(officers.id, session.userId))
        .limit(1);

      await tx.insert(auditLogs).values({
        officerId: session.userId,
        officerName: actor?.name || "Admin",
        action: "DELETED",
        changes: [
          {
            field: "Deleted Officer",
            old: fullOfficer?.name || "Unknown Officer",
            new: "Removed",
          },
          ...(fullOfficer?.email
            ? [{ field: "Email", old: fullOfficer.email, new: "Removed" }]
            : []),
        ],
      });

      const now = new Date();

      // Soft delete officer
      await tx
        .update(officers)
        .set({ deletedAt: now })
        .where(eq(officers.id, officerId));

      // Soft delete linked phone numbers
      await tx
        .update(phones)
        .set({ deletedAt: now })
        .where(and(eq(phones.officerId, officerId), isNull(phones.deletedAt)));

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to soft delete officer:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
