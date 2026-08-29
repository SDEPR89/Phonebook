import "dotenv/config";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { db } from "../db";
import {
  officers,
  loginCredentials,
  certs,
  units,
  areas,
  certUnits,
  roles,
} from "../db/schema";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .createHmac("sha256", salt)
    .update(password)
    .digest("hex");
  return { hash, salt };
}

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
        return { type: "fax" as const, number: part.replace(/\(fax\)/i, "").trim() };
      }
      return { type: "phone" as const, number: part };
    });
}

async function upsertArea(name: string): Promise<string> {
  const label = name || "ไม่ระบุด้าน";
  const existing = await db.select().from(areas).where(eq(areas.name, label)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(areas).values({ name: label }).returning();
  return row.id;
}

async function upsertUnit(name: string): Promise<string> {
  const label = name || "ไม่ระบุหน่วยงาน";
  const existing = await db.select().from(units).where(eq(units.name, label)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(units).values({ name: label }).returning();
  return row.id;
}

// ---------------------------------------------------------------------------
// STEP 1 — Superadmin account
// ---------------------------------------------------------------------------

const SUPERADMIN_NAME = "System Administrator";
const SUPERADMIN_EMAIL = "sysadmin@cert.or.th";
const SUPERADMIN_USERNAME = "sysadmin";
const SUPERADMIN_PASSWORD = "ChangeMe@1234"; // ⚠️ Change after first login

async function seedSuperadmin() {
  console.log("\n── Superadmin ──────────────────────────────────");

  const existing = await db
    .select()
    .from(officers)
    .where(eq(officers.email, SUPERADMIN_EMAIL))
    .limit(1);

  if (existing.length > 0) {
    console.log(`⏭  Already exists (id: ${existing[0].id}), skipping.`);
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

  const { hash, salt } = hashPassword(SUPERADMIN_PASSWORD);

  await db.insert(loginCredentials).values({
    officerId: admin.id,
    username: SUPERADMIN_USERNAME,
    passwordHash: hash,
    salt,
  });

  console.log(`✅ Superadmin created.`);
  console.log(`   username : ${SUPERADMIN_USERNAME}`);
  console.log(`   password : ${SUPERADMIN_PASSWORD}  ← Change this immediately!`);
}

// ---------------------------------------------------------------------------
// STEP 2 — Default roles (idempotent)
// ---------------------------------------------------------------------------

const DEFAULT_ROLES = [
  "Director",
  "Cybersecurity Manager",
  "Incident Handler",
  "Threat Intelligence Analyst",
];

async function seedRoles() {
  console.log("\n── Roles ───────────────────────────────────────");
  let created = 0;
  for (const name of DEFAULT_ROLES) {
    const existing = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values({ name });
      created++;
    }
  }
  console.log(
    `✅ Roles ready (${created} new, ${DEFAULT_ROLES.length - created} already existed).`
  );
}

// ---------------------------------------------------------------------------
// STEP 3 — All CERTs from data_001.csv
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
    const shortName    = record["Column4"]?.trim();
    const fullNameThai = record["Column2"]?.trim();
    const fullNameEng  = record["Column3"]?.trim();
    const status       = record["Column5"]?.trim();
    const unitName     = record["Column6"]?.trim();
    const areaName     = record["Column7"]?.trim();
    const location     = record["Column8"]?.trim();
    const sarabanEmail = record["Column9"]?.trim();
    const sarabanPhone = record["Column10"]?.trim();
    const logoUrl      = record["Column1"]?.trim();

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
    `✅ Certs done — ${inserted} inserted, ${skipped} already existed.`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log("🌱 Starting seed...");

  await seedSuperadmin();
  await seedRoles();
  await seedCerts();

  console.log("\n🎉 Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
