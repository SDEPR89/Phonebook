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
} from "@/db/schema";
import { eq, isNull, and } from "drizzle-orm";

//GET officer details with timestamp
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: officerId } = await params;
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

    if (!officerId) {
      return NextResponse.json(
        { error: "Officer ID required" },
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

    let avatarUrl: string | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
    }

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

    await db
      .update(officers)
      .set(updatePayload)
      .where(eq(officers.id, officerId));
    // 2. Update Phone Number
    if (phone !== null) {
      const existingPhone = await db
        .select()
        .from(phones)
        .where(and(eq(phones.officerId, officerId), isNull(phones.deletedAt)));

      if (existingPhone.length > 0) {
        await db
          .update(phones)
          .set({ phoneNumber: phone.trim(), updatedAt: new Date() })
          .where(eq(phones.id, existingPhone[0].id));
      } else if (phone.trim()) {
        await db.insert(phones).values({
          officerId,
          phoneNumber: phone.trim(),
        });
      }
    }

    // 3. Update Cert & Role
    if (certName && certName.trim()) {
      let [existingCert] = await db
        .select()
        .from(certs)
        .where(eq(certs.shortName, certName.trim()));

      if (!existingCert) {
        let [defaultUnit] = await db.select().from(units).limit(1);
        if (!defaultUnit) {
          [defaultUnit] = await db
            .insert(units)
            .values({ name: "General Unit" })
            .returning();
        }

        let [defaultArea] = await db.select().from(areas).limit(1);
        if (!defaultArea) {
          [defaultArea] = await db
            .insert(areas)
            .values({ name: "General Area" })
            .returning();
        }

        [existingCert] = await db
          .insert(certs)
          .values({
            shortName: certName.trim(),
            fullName: certName.trim(),
            areaId: defaultArea.id,
          })
          .returning();

        await db.insert(certUnits).values({
          certId: existingCert.id,
          unitId: defaultUnit.id,
        });
      }

      const existingOfficerCert = await db
        .select()
        .from(officerCerts)
        .where(eq(officerCerts.officerId, officerId));

      let officerCertId: string;
      if (existingOfficerCert.length > 0) {
        officerCertId = existingOfficerCert[0].id;
        await db
          .update(officerCerts)
          .set({ certId: existingCert.id })
          .where(eq(officerCerts.id, officerCertId));
      } else {
        const [newOfficerCert] = await db
          .insert(officerCerts)
          .values({ officerId, certId: existingCert.id })
          .returning();
        officerCertId = newOfficerCert.id;
      }

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

        // Delete & Re-insert link for composite keys
        await db
          .delete(officerCertRoles)
          .where(eq(officerCertRoles.officerCertId, officerCertId));

        await db.insert(officerCertRoles).values({
          officerCertId,
          roleId: existingRole.id,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update officer:", err);
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
    const now = new Date();

    // Soft delete officer
    await db
      .update(officers)
      .set({ deletedAt: now })
      .where(eq(officers.id, officerId));
    // Soft delete linked phone numbers
    await db
      .update(phones)
      .set({ deletedAt: now })
      .where(and(eq(phones.officerId, officerId), isNull(phones.deletedAt)));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to soft delete officer:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
