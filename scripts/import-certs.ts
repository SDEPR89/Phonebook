import 'dotenv/config';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { certs, areas, units, certUnits } from '../db/schema';
import { eq } from 'drizzle-orm';

function parseStatus(thaiStatus: string) {
  if (thaiStatus === 'จัดตั้งเสร็จสมบูรณ์') return 'establishment_completed';
  if (thaiStatus === 'อยู่ระหว่างดำเนินการ') return 'in_progress';
  return 'not_started';
}

function parseContacts(phoneStr: string) {
  if (!phoneStr) return [];
  const parts = phoneStr.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.map((part) => {
    if (part.toLowerCase().includes('fax')) {
      return { type: 'fax' as const, number: part.replace(/\(fax\)/i, '').trim() };
    }
    return { type: 'phone' as const, number: part };
  });
}

async function main() {
  console.log('Starting import...');
  const csvFilePath = path.join(process.cwd(), 'data_001.csv');
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true // Handles the UTF-8 BOM if present
  }) as Record<string, string>[];

  // Skip the first record because it's the Thai headers
  const dataRecords = records.slice(1);

  for (const record of dataRecords) {
    const rawLogo = record['Column1']?.trim();
    const fullNameThai = record['Column2']?.trim();
    const fullNameEng = record['Column3']?.trim();
    const shortName = record['Column4']?.trim();
    const status = record['Column5']?.trim();
    const unitName = record['Column6']?.trim();
    const areaName = record['Column7']?.trim();
    const location = record['Column8']?.trim();
    const sarabanEmail = record['Column9']?.trim();
    const sarabanPhone = record['Column10']?.trim();

    if (!shortName) continue;

    // 1. Handle Area
    let areaId: string;
    const existingArea = await db.select().from(areas).where(eq(areas.name, areaName || 'ไม่ระบุด้าน')).limit(1);
    if (existingArea.length > 0) {
      areaId = existingArea[0].id;
    } else {
      const [newArea] = await db.insert(areas).values({ name: areaName || 'ไม่ระบุด้าน' }).returning();
      areaId = newArea.id;
    }

    // 2. Handle Unit
    let unitId: string;
    const existingUnit = await db.select().from(units).where(eq(units.name, unitName || 'ไม่ระบุหน่วยงาน')).limit(1);
    if (existingUnit.length > 0) {
      unitId = existingUnit[0].id;
    } else {
      const [newUnit] = await db.insert(units).values({ name: unitName || 'ไม่ระบุหน่วยงาน' }).returning();
      unitId = newUnit.id;
    }

    // 3. Handle Cert
    let certId: string;
    const fullName = fullNameEng ? `${fullNameThai} (${fullNameEng})` : fullNameThai;
    const existingCert = await db.select().from(certs).where(eq(certs.shortName, shortName)).limit(1);
    
    if (existingCert.length > 0) {
      console.log(`Cert ${shortName} already exists, skipping insert.`);
      certId = existingCert[0].id;
    } else {
      const [newCert] = await db.insert(certs).values({
        shortName,
        fullName: fullName || shortName,
        logoUrl: rawLogo || null,
        location: location || null,
        sarabanEmail: sarabanEmail || null,
        sarabanContacts: parseContacts(sarabanPhone),
        establishmentStatus: parseStatus(status),
        areaId,
      }).returning();
      certId = newCert.id;
      console.log(`Inserted Cert: ${shortName}`);
    }

    // 4. Handle Cert-Unit Junction
    const existingCertUnit = await db.select().from(certUnits).where(
      eq(certUnits.certId, certId)
    );
    const hasLink = existingCertUnit.some((cu) => cu.unitId === unitId);
    if (!hasLink) {
      await db.insert(certUnits).values({
        certId,
        unitId
      });
    }
  }

  console.log('Import completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
