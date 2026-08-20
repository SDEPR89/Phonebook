import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  officers,
  phones,
  officerCerts,
  certs,
  officerCertRoles,
  roles,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET profile with created_at & updated_at timestamps
export async function GET() {
  try {
    const [officer] = await db
      .select()
      .from(officers)
      .where(isNull(officers.deletedAt))
      .limit(1);

    if (!officer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [phoneRecord] = await db
      .select()
      .from(phones)
      .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));

    const certRows = await db
      .select({ certName: certs.name, roleName: roles.name })
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
      avatarUrl: officer.avatarUrl ?? null,
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
    const [officer] = await db
      .select()
      .from(officers)
      .where(isNull(officers.deletedAt))
      .limit(1);

    if (!officer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const avatarFile = formData.get("avatar") as File | null;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and Email are required." },
        { status: 400 },
      );
    }

    let avatarUrl: string | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
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

    await db
      .update(officers)
      .set(updatePayload)
      .where(eq(officers.id, officer.id));

    if (phone !== null) {
      const existingPhone = await db
        .select()
        .from(phones)
        .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));

      if (existingPhone.length > 0) {
        await db
          .update(phones)
          .set({ phoneNumber: phone.trim(), updatedAt: new Date() })
          .where(eq(phones.id, existingPhone[0].id));
      } else if (phone.trim()) {
        await db.insert(phones).values({
          officerId: officer.id,
          phoneNumber: phone.trim(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT profile error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE endpoint for Soft Delete
export async function DELETE() {
  try {
    const [officer] = await db
      .select()
      .from(officers)
      .where(isNull(officers.deletedAt))
      .limit(1);

    if (!officer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();

    // 1. Soft delete officer record
    await db
      .update(officers)
      .set({ deletedAt: now })
      .where(eq(officers.id, officer.id));

    // 2. Soft delete associated phone record
    await db
      .update(phones)
      .set({ deletedAt: now })
      .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));

    return NextResponse.json({
      success: true,
      message: "User soft deleted successfully",
    });
  } catch (err) {
    console.error("DELETE profile error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}