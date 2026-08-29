import "dotenv/config";
import { db } from "../db"; // Update path to your database client instance
import {
  officers,
  phones,
  certs,
  units,
  areas,
  officerCerts,
  roles,
  officerCertRoles,
  dataCorrectionReports,
  certUnits,
} from "../db/schema"; // Update path to your schema file

async function seed() {
  console.log("🌱 Starting database seeding...");

  // -----------------------------------------------------------------------
  // 1. Roles (ตำแหน่งงาน)
  // -----------------------------------------------------------------------
  const [roleDirector, roleManager, roleIncidentHandler, roleAnalyst] = await db
    .insert(roles)
    .values([
      { name: "Director" },
      { name: "Cybersecurity Manager" },
      { name: "Incident Handler" },
      { name: "Threat Intelligence Analyst" },
    ])
    .returning();

  console.log("✅ Roles created.");

  // -----------------------------------------------------------------------
  // 2. Officers (ผู้ใช้งาน / เจ้าหน้าที่)
  // -----------------------------------------------------------------------
  const [
    superAdmin,
    adminThaiCert,
    adminEnergyCert,
    officerSomchai,
    reporterCharlie,
  ] = await db
    .insert(officers)
    .values([
      {
        name: "System Administrator",
        email: "sysadmin@cert.or.th",
        systemRole: "superadmin",
      },
      {
        name: "Somsak Jaidee",
        email: "somsak@thaicert.or.th",
        systemRole: "admin",
      },
      {
        name: "Kanya Rattana",
        email: "kanya@energycert.or.th",
        systemRole: "admin",
      },
      {
        name: "Somchai Meesuk",
        email: "somchai@cert-ops.or.th",
        systemRole: "officer",
      },
      {
        name: "Charlie Reporter",
        email: "charlie@cert-user.or.th",
        systemRole: "officer",
      },
    ])
    .returning();

  console.log("✅ Officers created.");

  // -----------------------------------------------------------------------
  // 3. Phone Numbers (1-to-1 with Officers)
  // -----------------------------------------------------------------------
  await db.insert(phones).values([
    { officerId: superAdmin.id, phoneNumber: "021234560" },
    { officerId: adminThaiCert.id, phoneNumber: "021234561" },
    { officerId: adminEnergyCert.id, phoneNumber: "021234562" },
    { officerId: officerSomchai.id, phoneNumber: "0819876543" }, // Outdated/wrong phone
    { officerId: reporterCharlie.id, phoneNumber: "0891112222" },
  ]);

  console.log("✅ Phone numbers linked.");

  // -----------------------------------------------------------------------
  // 3.5 Units & Areas
  // -----------------------------------------------------------------------
  const [unitGov, unitRegulator, unitCii] = await db
    .insert(units)
    .values([
      { name: "หน่วยงานรัฐ" },
      { name: "หน่วยงานกำกับดูแล" },
      { name: "หน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ" },
    ])
    .returning();

  const [
    areaSecurity,
    areaFinance,
    areaTransport,
    areaHealth,
    areaTelecom,
    areaEnergy,
    areaPublic,
  ] = await db
    .insert(areas)
    .values([
      { name: "ด้านความมั่นคงของรัฐ" },
      { name: "ด้านการเงินการธนาคาร" },
      { name: "ด้านการขนส่งและโลจิสติกส์" },
      { name: "ด้านสาธารณสุข" },
      { name: "ด้านเทคโนโลยีสารสนเทศและโทรคมนาคม" },
      { name: "ด้านพลังงานและสาธารณูปโภค" },
      { name: "ด้านบริการภาครัฐที่สำคัญ" },
    ])
    .returning();

  console.log("✅ Units and Areas created.");

  // -----------------------------------------------------------------------
  // 4. Certs (Organizations: THAICERT & EnergyCERT)
  // -----------------------------------------------------------------------
  const [thaiCert, energyCert] = await db
    .insert(certs)
    .values([
      {
        shortName: "THAICERT",
        fullName: "Thailand Computer Emergency Response Team",
        adminId: adminThaiCert.id,
        areaId: areaSecurity.id,
      },
      {
        shortName: "EnergyCERT",
        fullName: "Energy Sector Computer Emergency Response Team",
        adminId: adminEnergyCert.id,
        areaId: areaEnergy.id,
      },
    ])
    .returning();

  await db.insert(certUnits).values([
    { certId: thaiCert.id, unitId: unitGov.id },
    { certId: energyCert.id, unitId: unitCii.id },
  ]);

  console.log("✅ Certs created with assigned Admins.");

  // -----------------------------------------------------------------------
  // 5. Officer-Cert Memberships
  // -----------------------------------------------------------------------
  const [somchaiThaiCert, somchaiEnergyCert, kanyaEnergyCert] = await db
    .insert(officerCerts)
    .values([
      // Somchai belongs to BOTH THAICERT and EnergyCERT
      { officerId: officerSomchai.id, certId: thaiCert.id },
      { officerId: officerSomchai.id, certId: energyCert.id },
      // Kanya belongs to EnergyCERT
      { officerId: adminEnergyCert.id, certId: energyCert.id },
    ])
    .returning();

  console.log("✅ Officer-Cert memberships established.");

  // -----------------------------------------------------------------------
  // 6. Scoped Roles PER Cert (officer_cert_roles)
  // -----------------------------------------------------------------------
  await db.insert(officerCertRoles).values([
    // Somchai = "Incident Handler" at THAICERT
    { officerCertId: somchaiThaiCert.id, roleId: roleIncidentHandler.id },

    // Somchai = "Threat Intelligence Analyst" at EnergyCERT (Different role per cert!)
    { officerCertId: somchaiEnergyCert.id, roleId: roleAnalyst.id },

    // Kanya = "Director" at EnergyCERT
    { officerCertId: kanyaEnergyCert.id, roleId: roleDirector.id },
  ]);

  console.log("✅ Per-cert roles assigned.");

  // -----------------------------------------------------------------------
  // 7. Data Correction Reports
  // -----------------------------------------------------------------------
  await db.insert(dataCorrectionReports).values([
    {
      targetOfficerId: officerSomchai.id, // Somchai has incorrect phone details
      reporterId: reporterCharlie.id, // Charlie reported the issue
      reason: "wrong_phone",
      details:
        "Tried calling Somchai regarding an incident, but the line was unreachable.",
      status: "reported",
    },
    {
      targetOfficerId: officerSomchai.id,
      reporterId: adminEnergyCert.id,
      reason: "wrong_role",
      details: "Somchai's title at EnergyCERT needs to be updated to Manager.",
      status: "resolved",
      adminNotes: "Updated role assignment in DB.",
      resolvedBy: adminEnergyCert.id,
      resolvedAt: new Date(),
    },
  ]);

  console.log("✅ Data correction reports seeded.");
  console.log("🎉 Seeding completed successfully!");
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
