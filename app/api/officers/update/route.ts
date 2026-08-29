import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { getSession } from "@/app/lib/auth";
import { officers, officerCerts, certs, units, areas, roles, officerCertRoles, auditLogs, certUnits, loginCredentials } from "@/db/schema";
import { eq, ilike, isNull, and } from "drizzle-orm";
import { isValidEmail } from "@/app/lib/validators";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin" && session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();

    const officerId = (formData.get("officerId") as string) || "";
    const rawName = (formData.get("name") as string) || "";
    const name = rawName.toUpperCase();
    const email = (formData.get("email") as string) || "";
    const certName = (formData.get("certName") as string) || "";
    const roleName = (formData.get("roleName") as string) || "";
    const requestedSystemRole = (formData.get("systemRole") as string) || "";
    const avatarFile = formData.get("avatar") as File | null;

    if (!officerId || !name || !email) {
      return NextResponse.json(
        { error: "Officer ID, Name, and Email are required." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
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

    const result = await db.transaction(async (tx) => {
      // 1. Fetch existing officer (exclude soft-deleted)
      const existingOfficer = await tx
        .select()
        .from(officers)
        .where(and(eq(officers.id, officerId), isNull(officers.deletedAt)))
        .limit(1);

      if (existingOfficer.length === 0) {
        return { error: "Officer record not found.", status: 404 };
      }

      const currentOfficer = existingOfficer[0];

      if (currentOfficer.systemRole !== "officer" && session.role !== "superadmin") {
        return { error: "Only Super Admins can modify Admin and Super Admin accounts.", status: 403 };
      }

      let systemRoleToUpdate: string | undefined = undefined;
      if (requestedSystemRole && ["officer", "admin", "superadmin"].includes(requestedSystemRole)) {
        if (requestedSystemRole !== currentOfficer.systemRole) {
          if (session.role !== "superadmin") {
            return { error: "Only Super Admins can modify account system roles.", status: 403 };
          }
          systemRoleToUpdate = requestedSystemRole;
        }
      }

      // 2. Guard: only superadmin may change cert/role assignments
      //    Evaluated after we know the current DB values (below).

      // 3. Fetch linked cert and role
      const currentCertRoleLink = await tx
        .select({
          certId: certs.id,
          certName: certs.shortName,
          junctionId: officerCerts.id,
          roleName: roles.name,
          roleJunctionId: officerCertRoles.roleId,
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

      // Only block if the admin is actually *changing* the cert/role
      const isCertChanging = certName && certName !== oldCertName;
      if (isCertChanging && session.role !== "superadmin") {
        return {
          error: "Only Super Admins can change an officer's CERT assignment.",
          status: 403,
        };
      }

      // 4. Track Changes

      const changes: Array<{ field: string; old: string; new: string }> = [];

      if (currentOfficer.name !== name) {
        changes.push({
          field: "Name",
          old: currentOfficer.name || "",
          new: name,
        });
      }
      const emailChanged = currentOfficer.email !== email;
      if (emailChanged) {
        changes.push({
          field: "Email",
          old: currentOfficer.email || "",
          new: email,
        });
      }
      if (systemRoleToUpdate && currentOfficer.systemRole !== systemRoleToUpdate) {
        changes.push({
          field: "System Role",
          old: currentOfficer.systemRole || "officer",
          new: systemRoleToUpdate,
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

      // 4. Update Officer Record
      await tx
        .update(officers)
        .set({
          name,
          email,
          ...(systemRoleToUpdate && { systemRole: systemRoleToUpdate }),
          ...(avatarUrl && { avatarUrl }),
          updatedAt: new Date(),
        })
        .where(eq(officers.id, officerId));

      // 4.5 Sync loginCredentials username if email changed
      if (emailChanged) {
        await tx
          .update(loginCredentials)
          .set({ username: email, updatedAt: new Date() })
          .where(eq(loginCredentials.officerId, officerId));
      }

      // 5. Update Cert Link
      if (certName && oldCertName !== certName) {
        const existingCert = await tx
          .select({ id: certs.id })
          .from(certs)
          .where(ilike(certs.shortName, certName))
          .limit(1);

        let targetCertId: string;

        if (existingCert.length > 0) {
          targetCertId = existingCert[0].id;
        } else {
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

          const [newCert] = await tx
            .insert(certs)
            .values({
              shortName: certName,
              fullName: certName,
              adminId: officerId,
              areaId: defaultArea.id,
            })
            .returning({ id: certs.id });

          targetCertId = newCert.id;

          await tx.insert(certUnits).values({
            certId: targetCertId,
            unitId: defaultUnit.id,
          });
        }

        if (junctionId) {
          await tx
            .update(officerCerts)
            .set({ certId: targetCertId, updatedAt: new Date() })
            .where(eq(officerCerts.id, junctionId));
        } else {
          const [newOfficerCert] = await tx
            .insert(officerCerts)
            .values({ officerId, certId: targetCertId })
            .returning({ id: officerCerts.id });
          junctionId = newOfficerCert.id;
        }
      }

      // 5.5 Update Role Link
      if (roleName && oldRoleName !== roleName) {
        if (!junctionId && certName) {
          const [certRec] = await tx
            .select({ id: certs.id })
            .from(certs)
            .where(ilike(certs.shortName, certName))
            .limit(1);
          if (certRec) {
            const [newJunction] = await tx
              .insert(officerCerts)
              .values({ officerId, certId: certRec.id })
              .returning({ id: officerCerts.id });
            junctionId = newJunction.id;
          }
        }

        if (junctionId) {
          const existingRole = await tx
            .select({ id: roles.id })
            .from(roles)
            .where(ilike(roles.name, roleName))
            .limit(1);

          let targetRoleId: string;

          if (existingRole.length > 0) {
            targetRoleId = existingRole[0].id;
          } else {
            const [newRole] = await tx
              .insert(roles)
              .values({ name: roleName })
              .returning({ id: roles.id });
            targetRoleId = newRole.id;
          }

          await tx
            .delete(officerCertRoles)
            .where(eq(officerCertRoles.officerCertId, junctionId));

          await tx
            .insert(officerCertRoles)
            .values({ officerCertId: junctionId, roleId: targetRoleId });
        }
      }

      // 6. Record Audit Log
      if (changes.length > 0) {
        const [actor] = await tx
          .select()
          .from(officers)
          .where(eq(officers.id, session.userId))
          .limit(1);

        const actorName = actor?.name || "Admin";

        await tx.insert(auditLogs).values({
          officerId: session.userId,
          officerName: actorName,
          action: "UPDATED",
          changes: [
            { field: "Target Officer", old: "", new: name },
            ...changes,
          ],
        });
      }

      return { success: true, changes };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Clear Next.js Route Caches
    revalidatePath("/admin");
    revalidatePath("/admin/history");

    return NextResponse.json({ success: true, changes: result.changes });
  } catch (error: any) {
    console.error("UPDATE ERROR:", error);

    if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
      return NextResponse.json(
        { error: "An officer or credential with this email already exists." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while updating officer." },
      { status: 500 }
    );
  }
}