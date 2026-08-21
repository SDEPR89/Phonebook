import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { officers, officerCerts, certs, roles, officerCertRoles, auditLogs } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const officerId = (formData.get("officerId") as string) || "";
    const rawName = (formData.get("name") as string) || "";
    const name = rawName.toUpperCase();
    const email = (formData.get("email") as string) || "";
    const certName = (formData.get("certName") as string) || "";
    const roleName = (formData.get("roleName") as string) || "";
    const avatarFile = formData.get("avatar") as File | null;

    if (!officerId || !name || !email) {
      return NextResponse.json(
        { error: "Officer ID, Name, and Email are required." },
        { status: 400 },
      );
    }

    // Process Avatar File
    let avatarUrl: string | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      const arrayBuffer = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      avatarUrl = `data:${avatarFile.type};base64,${buffer.toString("base64")}`;
    }

    // 1. Fetch existing officer
    const existingOfficer = await db
      .select()
      .from(officers)
      .where(eq(officers.id, officerId))
      .limit(1);

    if (existingOfficer.length === 0) {
      return NextResponse.json(
        { error: "Officer record not found." },
        { status: 404 },
      );
    }

    const currentOfficer = existingOfficer[0];

    // 2. Fetch linked cert and role
    const currentCertRoleLink = await db
      .select({
        certId: certs.id,
        certName: certs.name,
        junctionId: officerCerts.id,
        roleName: roles.name,
        roleJunctionId: officerCertRoles.roleId, // just checking if it exists
      })
      .from(officerCerts)
      .innerJoin(certs, eq(certs.id, officerCerts.certId))
      .leftJoin(officerCertRoles, eq(officerCertRoles.officerCertId, officerCerts.id))
      .leftJoin(roles, eq(roles.id, officerCertRoles.roleId))
      .where(eq(officerCerts.officerId, officerId))
      .limit(1);

    const oldCertName = currentCertRoleLink[0]?.certName || "None";
    const oldRoleName = currentCertRoleLink[0]?.roleName || "None";
    let junctionId = currentCertRoleLink[0]?.junctionId;

    // 3. Track Changes
    const changes: Array<{ field: string; old: string; new: string }> = [];

    if (currentOfficer.name !== name) {
      changes.push({
        field: "Name",
        old: currentOfficer.name || "",
        new: name,
      });
    }
    if (currentOfficer.email !== email) {
      changes.push({
        field: "Email",
        old: currentOfficer.email || "",
        new: email,
      });
    }
    if (avatarUrl) {
      changes.push({
        field: "Avatar",
        old: "Previous Photo",
        new: "Updated Photo",
      });
    }
    if (certName && oldCertName !== certName) {
      changes.push({ field: "Cert Name", old: oldCertName, new: certName });
    }
    if (roleName && oldRoleName !== roleName) {
      changes.push({ field: "Role Name", old: oldRoleName, new: roleName });
    }

    // 4. Update Officer Record (including avatarUrl if new photo provided)
    await db
      .update(officers)
      .set({
        name,
        email,
        ...(avatarUrl && { avatarUrl }),
        updatedAt: new Date(),
      })
      .where(eq(officers.id, officerId));

    // 5. Update Cert Link
    if (certName && oldCertName !== certName) {
      const existingCert = await db
        .select({ id: certs.id })
        .from(certs)
        .where(ilike(certs.name, certName))
        .limit(1);

      let targetCertId: string;

      if (existingCert.length > 0) {
        targetCertId = existingCert[0].id;
      } else {
        const [newCert] = await db
          .insert(certs)
          .values({ name: certName, adminId: officerId })
          .returning({ id: certs.id });

        targetCertId = newCert.id;
      }

      if (junctionId) {
        await db
          .update(officerCerts)
          .set({ certId: targetCertId, updatedAt: new Date() })
          .where(eq(officerCerts.id, junctionId));
      } else {
        const [newOfficerCert] = await db
          .insert(officerCerts)
          .values({ officerId, certId: targetCertId })
          .returning({ id: officerCerts.id });
        junctionId = newOfficerCert.id;
      }
    }

    // 5.5 Update Role Link
    if (roleName && oldRoleName !== roleName && junctionId) {
      const existingRole = await db
        .select({ id: roles.id })
        .from(roles)
        .where(ilike(roles.name, roleName))
        .limit(1);

      let targetRoleId: string;

      if (existingRole.length > 0) {
        targetRoleId = existingRole[0].id;
      } else {
        const [newRole] = await db
          .insert(roles)
          .values({ name: roleName })
          .returning({ id: roles.id });
        targetRoleId = newRole.id;
      }

      // We only support 1 role per cert. So we delete existing roles for this junctionId
      await db
        .delete(officerCertRoles)
        .where(eq(officerCertRoles.officerCertId, junctionId));
      
      await db
        .insert(officerCertRoles)
        .values({ officerCertId: junctionId, roleId: targetRoleId });
    }

    // 6. Record Audit Log
    if (changes.length > 0) {
      await db.insert(auditLogs).values({
        officerId,
        officerName: name,
        action: "UPDATED",
        changes,
      });
    }

    // Clear Next.js Route Caches
    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true, changes });
  } catch (error: unknown) {
    console.error("UPDATE ERROR:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}