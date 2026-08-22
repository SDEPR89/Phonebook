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
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET profile with created_at & updated_at timestamps
export async function GET() {
  try {
    const session = await getSession();
    let officer;

    if (session?.userId) {
      [officer] = await db
        .select()
        .from(officers)
        .where(and(eq(officers.id, session.userId), isNull(officers.deletedAt)))
        .limit(1);
    }

    if (!officer) {
      [officer] = await db
        .select()
        .from(officers)
        .where(isNull(officers.deletedAt))
        .limit(1);
    }

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
    const session = await getSession();
    let officer;

    if (session?.userId) {
      [officer] = await db
        .select()
        .from(officers)
        .where(and(eq(officers.id, session.userId), isNull(officers.deletedAt)))
        .limit(1);
    }

    if (!officer) {
      [officer] = await db
        .select()
        .from(officers)
        .where(isNull(officers.deletedAt))
        .limit(1);
    }

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

    // For Audit Logs
    const changes: { field: string; old: string; new: string }[] = [];
    if (officer.name !== name.trim()) {
      changes.push({ field: "Name", old: officer.name || "", new: name.trim() });
    }
    if (officer.email !== email.trim()) {
      changes.push({ field: "Email", old: officer.email || "", new: email.trim() });
    }

    const existingPhoneResult = await db
      .select()
      .from(phones)
      .where(and(eq(phones.officerId, officer.id), isNull(phones.deletedAt)));
    
    const existingPhoneNumber = existingPhoneResult[0]?.phoneNumber || "";
    if (phone !== null && phone.trim() !== existingPhoneNumber) {
      changes.push({ field: "Phone", old: existingPhoneNumber, new: phone.trim() });
    }

    await db
      .update(officers)
      .set(updatePayload)
      .where(eq(officers.id, officer.id));

    if (phone !== null) {
      if (existingPhoneResult.length > 0) {
        await db
          .update(phones)
          .set({ phoneNumber: phone.trim(), updatedAt: new Date() })
          .where(eq(phones.id, existingPhoneResult[0].id));
      } else if (phone.trim()) {
        await db.insert(phones).values({
          officerId: officer.id,
          phoneNumber: phone.trim(),
        });
      }
    }

    // Insert Audit Log if there are changes
    if (changes.length > 0) {
      await db.insert(auditLogs).values({
        officerId: officer.id,
        officerName: officer.name || "Unknown Officer",
        action: "UPDATED",
        changes: changes,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/history");

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