import "dotenv/config";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import { db } from "../db";
import {
  officers,
  loginCredentials,
  certs,
  units,
  areas,
  certUnits,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../app/lib/crypto";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseStatus(thaiStatus: string) {
  if (thaiStatus === "จัดตั้งเสร็จสมบูรณ์") return "establishment_completed";
  if (thaiStatus === "อยู่ระหว่างดำเนินการ") return "in_progress";
  return "not_started";
}

function parseContacts(phoneStr: string) {
  if (!phoneStr) return [];
  return phoneStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      if (part.toLowerCase().includes("fax")) {
        return {
          type: "fax" as const,
          number: part.replace(/\(fax\)/i, "").trim(),
        };
      }
      return { type: "phone" as const, number: part };
    });
}

async function upsertArea(name: string): Promise<string> {
  const label = name || "ไม่ระบุด้าน";
  const existing = await db
    .select()
    .from(areas)
    .where(eq(areas.name, label))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(areas).values({ name: label }).returning();
  return row.id;
}

async function upsertUnit(name: string): Promise<string> {
  const label = name || "ไม่ระบุหน่วยงาน";
  const existing = await db
    .select()
    .from(units)
    .where(eq(units.name, label))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(units).values({ name: label }).returning();
  return row.id;
}

// ---------------------------------------------------------------------------
// STEP 1 — Superadmin account
// ---------------------------------------------------------------------------

const SUPERADMIN_NAME = "System Administrator";
const SUPERADMIN_EMAIL = "superadmin@example.com";
const SUPERADMIN_USERNAME = "superadmin@example.com";
const SUPERADMIN_PASSWORD = "superadmin123";

async function seedSuperadmin() {
  console.log("\n── Superadmin ──────────────────────────────────");

  const { hash, salt } = hashPassword(SUPERADMIN_PASSWORD);

  const existing = await db
    .select()
    .from(officers)
    .where(eq(officers.email, SUPERADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    const adminId = existing[0].id;

    // Update existing credentials to use PBKDF2 hash
    const existingCred = await db
      .select()
      .from(loginCredentials)
      .where(eq(loginCredentials.officerId, adminId))
      .limit(1);

    if (existingCred.length > 0) {
      await db
        .update(loginCredentials)
        .set({
          username: SUPERADMIN_USERNAME,
          passwordHash: hash,
          salt,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(loginCredentials.id, existingCred[0].id));
    } else {
      await db.insert(loginCredentials).values({
        officerId: adminId,
        username: SUPERADMIN_USERNAME,
        passwordHash: hash,
        salt,
      });
    }

    console.log(`✅ Superadmin password updated (id: ${adminId}).`);
    console.log(`   email    : ${SUPERADMIN_EMAIL}`);
    console.log(`   password : ${SUPERADMIN_PASSWORD}`);
    return;
  }

  const [admin] = await db
    .insert(officers)
    .values({
      name: SUPERADMIN_NAME,
      email: SUPERADMIN_EMAIL,
      systemRole: "superadmin",
    })
    .returning();

  await db.insert(loginCredentials).values({
    officerId: admin.id,
    username: SUPERADMIN_USERNAME,
    passwordHash: hash,
    salt,
  });

  console.log(`✅ Superadmin created.`);
  console.log(`   email    : ${SUPERADMIN_EMAIL}`);
  console.log(`   password : ${SUPERADMIN_PASSWORD}`);
}

// ---------------------------------------------------------------------------
// STEP 2 — All CERTs from data_001.csv
// ---------------------------------------------------------------------------

async function seedCerts() {
  console.log("\n── Certs from data_001.csv ─────────────────────");

  const csvPath = path.join(process.cwd(), "data_001.csv");
  if (!fs.existsSync(csvPath)) {
    console.warn("⚠️  data_001.csv not found — skipping cert import.");
    return;
  }

  const records = parse(fs.readFileSync(csvPath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, string>[];

  // Row 0 = English column labels, actual data starts at row 1
  const dataRows = records.slice(1);
  console.log(`   ${dataRows.length} rows found in CSV.`);

  let inserted = 0;
  let skipped = 0;

  for (const record of dataRows) {
    const shortName = record["Column4"]?.trim();
    const fullNameThai = record["Column2"]?.trim();
    const fullNameEng = record["Column3"]?.trim();
    const status = record["Column5"]?.trim();
    const unitName = record["Column6"]?.trim();
    const areaName = record["Column7"]?.trim();
    const location = record["Column8"]?.trim();
    const sarabanEmail = record["Column9"]?.trim();
    const sarabanPhone = record["Column10"]?.trim();
    const logoUrl = record["Column1"]?.trim();

    if (!shortName) continue;

    const areaId = await upsertArea(areaName);
    const unitId = await upsertUnit(unitName);

    // Upsert cert
    const existing = await db
      .select()
      .from(certs)
      .where(eq(certs.shortName, shortName))
      .limit(1);

    let certId: string;

    if (existing.length > 0) {
      certId = existing[0].id;
      skipped++;
    } else {
      const fullName = fullNameEng
        ? `${fullNameThai} (${fullNameEng})`
        : fullNameThai || shortName;

      const [newCert] = await db
        .insert(certs)
        .values({
          shortName,
          fullName,
          logoUrl: logoUrl || null,
          location: location || null,
          sarabanEmail: sarabanEmail || null,
          sarabanContacts: parseContacts(sarabanPhone),
          establishmentStatus: parseStatus(status),
          areaId,
        })
        .returning();

      certId = newCert.id;
      inserted++;
      console.log(`   ➕ ${shortName}`);
    }

    // Link cert ↔ unit (idempotent)
    const existingLinks = await db
      .select()
      .from(certUnits)
      .where(eq(certUnits.certId, certId));
    if (!existingLinks.some((cu) => cu.unitId === unitId)) {
      await db.insert(certUnits).values({ certId, unitId });
    }
  }

  console.log(
    `✅ Certs done — ${inserted} inserted, ${skipped} already existed.`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting seed...");

  await seedSuperadmin();
  await seedCerts();

  console.log("\n🎉 Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
