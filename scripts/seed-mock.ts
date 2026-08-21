import { db } from "../db";
import {
  officers,
  certs,
  roles,
  officerCerts,
  officerCertRoles,
  phones,
  loginCredentials,
  dataCorrectionReports,
  auditLogs,
} from "../db/schema";
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const MOCK_CERTS = [
  "ThaiCERT",
  "NCSA",
  "GovCERT",
  "FinancialCERT",
  "TelecomCERT",
  "HealthCERT",
];

const MOCK_ROLES = [
  "Director",
  "Lead Incident Responder",
  "Cybersecurity Specialist",
  "Forensics Analyst",
  "Threat Hunter",
  "System Administrator",
  "Coordinator",
  "Public Relations",
];

const MOCK_USERS = [
  { name: "SOMCHAI JAIDEE", email: "somchai.j@example.com", phone: "081-111-1111", role: "Director", cert: "ThaiCERT" },
  { name: "SOMYING RAKDEE", email: "somying.r@example.com", phone: "082-222-2222", role: "Lead Incident Responder", cert: "ThaiCERT" },
  { name: "MANA MANEE", email: "mana.m@example.com", phone: "083-333-3333", role: "Threat Hunter", cert: "ThaiCERT" },
  { name: "PITI CHUJAI", email: "piti.c@example.com", phone: "084-444-4444", role: "Cybersecurity Specialist", cert: "ThaiCERT" },
  
  { name: "ANONG THONGKHAM", email: "anong.t@example.com", phone: "02-111-1111 ext 101", role: "Director", cert: "NCSA" },
  { name: "WICHAI SANGTONG", email: "wichai.s@example.com", phone: "085-555-5555", role: "System Administrator", cert: "NCSA" },
  { name: "SUREE PORNSAWAN", email: "suree.p@example.com", phone: "086-666-6666", role: "Coordinator", cert: "NCSA" },
  { name: "NATTAPONG YINDEE", email: "nattapong.y@example.com", phone: "087-777-7777", role: "Public Relations", cert: "NCSA" },
  { name: "JIRAYU MEECHAI", email: "jirayu.m@example.com", phone: "088-888-8888", role: "Forensics Analyst", cert: "NCSA" },

  { name: "SUPHAKORN WONGSA", email: "suphakorn.w@example.com", phone: "089-999-9999", role: "Director", cert: "GovCERT" },
  { name: "NIPA CHANTRAPA", email: "nipa.c@example.com", phone: "090-000-0000", role: "Cybersecurity Specialist", cert: "GovCERT" },
  { name: "TAWATCHAI SURASAK", email: "tawatchai.s@example.com", phone: "091-111-1111", role: "Lead Incident Responder", cert: "GovCERT" },
  
  { name: "CHATCHAI BOONMEE", email: "chatchai.b@example.com", phone: "02-222-2222 ext 201", role: "Director", cert: "FinancialCERT" },
  { name: "PORNCHAI SUTTIRAK", email: "pornchai.s@example.com", phone: "092-222-2222", role: "Threat Hunter", cert: "FinancialCERT" },
  { name: "ORAWAN JITPAISAN", email: "orawan.j@example.com", phone: "093-333-3333", role: "Cybersecurity Specialist", cert: "FinancialCERT" },
  { name: "RATTANA CHAISILP", email: "rattana.c@example.com", phone: "094-444-4444", role: "System Administrator", cert: "FinancialCERT" },

  { name: "SUWIT PHONSIRI", email: "suwit.p@example.com", phone: "02-333-3333 ext 301", role: "Director", cert: "TelecomCERT" },
  { name: "NIDA WATTANA", email: "nida.w@example.com", phone: "095-555-5555", role: "Lead Incident Responder", cert: "TelecomCERT" },
  { name: "EKASIT MANOCHAI", email: "ekasit.m@example.com", phone: "096-666-6666", role: "Forensics Analyst", cert: "TelecomCERT" },

  { name: "KANJANA RATTANAPAN", email: "kanjana.r@example.com", phone: "097-777-7777", role: "Director", cert: "HealthCERT" },
  { name: "PONGPAT SIRICHAI", email: "pongpat.s@example.com", phone: "098-888-8888", role: "Coordinator", cert: "HealthCERT" },
  { name: "SIRIWAN THAMMA", email: "siriwan.t@example.com", phone: "099-999-9999", role: "System Administrator", cert: "HealthCERT" },
  { name: "APIWAT CHANGSIRI", email: "apiwat.c@example.com", phone: "081-234-5678", role: "Cybersecurity Specialist", cert: "HealthCERT" },
];

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function seed() {
  console.log("Starting database reset and seeding...");

  try {
    // 1. Delete all existing data
    console.log("Clearing old data...");
    await db.delete(loginCredentials);
    await db.delete(dataCorrectionReports);
    await db.delete(auditLogs);
    await db.delete(officerCertRoles);
    await db.delete(officerCerts);
    await db.delete(phones);
    await db.delete(certs);
    await db.delete(roles);
    await db.delete(officers);

    // 2. Create Admin Account
    console.log("Creating Admin account...");
    const adminPasswordHash = await bcrypt.hash("password123", 10);
    const [adminOfficer] = await db
      .insert(officers)
      .values({
        name: "SYSTEM ADMINISTRATOR",
        email: "admin@example.com",
        systemRole: "superadmin",
      })
      .returning();

    await db.insert(loginCredentials).values({
      officerId: adminOfficer.id,
      username: "admin@example.com",
      passwordHash: adminPasswordHash,
    });

    // 3. Create Certs
    console.log("Creating Certs...");
    const certMap = new Map();
    for (const certName of MOCK_CERTS) {
      const [newCert] = await db
        .insert(certs)
        .values({ name: certName, adminId: adminOfficer.id }) // Defaulting admin to superadmin
        .returning();
      certMap.set(certName, newCert.id);
    }

    // 4. Create Roles
    console.log("Creating Roles...");
    const roleMap = new Map();
    for (const roleName of MOCK_ROLES) {
      const [newRole] = await db
        .insert(roles)
        .values({ name: roleName })
        .returning();
      roleMap.set(roleName, newRole.id);
    }

    // 5. Create Mock Officers
    console.log("Creating Mock Officers & Passwords...");
    const userCredentials = [];

    for (const user of MOCK_USERS) {
      // Create Officer
      const [newOfficer] = await db
        .insert(officers)
        .values({
          name: user.name,
          email: user.email,
          systemRole: "officer",
        })
        .returning();

      // Generate Password
      const randomPassword = generatePassword();
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      // Create Login Credentials
      await db.insert(loginCredentials).values({
        officerId: newOfficer.id,
        username: user.email,
        passwordHash: passwordHash,
      });

      userCredentials.push({
        name: user.name,
        email: user.email,
        password: randomPassword
      });

      // Create Phone
      await db.insert(phones).values({
        officerId: newOfficer.id,
        phoneNumber: user.phone,
      });

      // Link to Cert
      const certId = certMap.get(user.cert);
      if (certId) {
        const [newOfficerCert] = await db
          .insert(officerCerts)
          .values({
            officerId: newOfficer.id,
            certId,
          })
          .returning();

        // Link to Role
        const roleId = roleMap.get(user.role);
        if (roleId) {
          await db.insert(officerCertRoles).values({
            officerCertId: newOfficerCert.id,
            roleId,
          });
        }
      }
    }

    console.log("✅ Database seeded successfully!");
    console.log("-----------------------------------");
    console.log("Total Certs created:", MOCK_CERTS.length);
    console.log("Total Roles created:", MOCK_ROLES.length);
    console.log("Total Mock Officers created:", MOCK_USERS.length);
    console.log("-----------------------------------");
    console.log("Admin Login Details:");
    console.log("Username: admin@example.com");
    console.log("Password: password123");
    console.log("-----------------------------------");
    console.log("Mock Officer Credentials (First 5):");
    for (let i = 0; i < Math.min(5, userCredentials.length); i++) {
      console.log(`- ${userCredentials[i].email} : ${userCredentials[i].password}`);
    }
    console.log("-----------------------------------");

    // Write all credentials to a file for reference
    const fs = require("fs");
    const credText = userCredentials.map(u => `${u.email},${u.password}`).join("\\n");
    fs.writeFileSync("mock-credentials.csv", "Email,Password\\n" + credText);
    console.log("Full mock credentials saved to mock-credentials.csv");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
