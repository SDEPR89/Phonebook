import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =========================================================================
// 1. Reusable Timestamps
// =========================================================================
// Every table gets the same three audit columns, so the pattern is
// consistent and easy to recognize everywhere.
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"), // null = active, timestamp = soft-deleted
};

// =========================================================================
// 2. Allowed value lists (replaces pgEnum)
// =========================================================================
// These are NOT database enums on purpose — enums are painful to alter
// later (adding/removing a value requires a special migration). Instead,
// the column is a plain varchar, and the allowed values are enforced in
// application code (e.g. a Zod schema or TypeScript union type) using
// these lists as the single source of truth.

// Three-tier permission system:
// - "officer"    : normal member, has their own phonebook entry
// - "admin"      : manages officers within ONE cert (see certs.adminId)
// - "superadmin" : manages admins; there should only ever be one
export const SYSTEM_ROLES = ["officer", "admin", "superadmin"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

// Status of a problem report submitted regarding an officer
export const REPORT_STATUSES = [
  "reported", // แจ้งปัญหาเข้ามา
  "resolved", // แก้ไขข้อมูล/จัดการเรียบร้อยแล้ว
  "rejected", // ปฏิเสธ (ข้อมูลถูกต้องอยู่แล้ว หรือไม่พบปัญหา)
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// Choices for problem types reported (เช่น โทรไม่ติด, เบอร์โทรไม่ถูกต้อง ฯลฯ)
export const REPORT_REASONS = [
  "unreachable_phone", // โทรไม่ติด / ติดต่อไม่ได้
  "wrong_phone", // เบอร์โทรศัพท์ไม่ถูกต้อง
  "wrong_name", // ชื่อ-นามสกุลไม่ถูกต้อง
  "wrong_cert", // สังกัด/หน่วยงานไม่ถูกต้อง
  "wrong_role", // ตำแหน่งไม่ถูกต้อง
  "resigned_or_moved", // ย้ายหน่วยงาน / ลาออก
  "other", // อื่นๆ
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// =========================================================================
// 3. Core Entities
// =========================================================================

// --- Core entity: officers ------------------------------------------------
// Every person in the system is an "officer" row, regardless of their
// systemRole. An admin or superadmin is just an officer with a higher
// systemRole value — they still have their own name/phone/email like
// anyone else.
export const officers = pgTable(
  "officers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(), // required, per workflow
    avatarUrl: text("avatar_url"), // รูปโปรไฟล์ของบุคคล (URL / Path)

    // Allowed values: "officer" | "admin" | "superadmin" (see SYSTEM_ROLES above)
    systemRole: varchar("system_role", { length: 32 })
      .notNull()
      .default("officer"),

    ...timestamps,
  },
  (table) => [
    index("officers_name_idx").on(table.name),
    index("officers_email_idx").on(table.email),
  ],
);

// --- One-to-many: an officer has ONE phone number ---------------------
// (Schema still supports multiple rows per officer if that ever changes,
// but your workflow says "one per user" — enforced via unique below.)
export const phones = pgTable(
  "phones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officerId: uuid("officer_id")
      .notNull()
      .unique() // enforces "one phone number per officer"
      .references(() => officers.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [
    index("phones_phone_number_idx").on(table.phoneNumber),
    index("phones_officer_id_idx").on(table.officerId),
  ],
);

// --- Lookup table: the fixed list of certs (organizations/agencies) -----
export const certs = pgTable(
  "certs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    logoUrl: text("logo_url"), // รูปโลโก้/รูปของหน่วยงาน (URL / Path)

    // The ONE officer (with systemRole = "admin") who manages this cert.
    // Nullable: a cert may not have an admin assigned yet.
    // Enforcing "one admin per cert" lives here, on the cert side, since
    // each cert can only point to a single admin at a time.
    adminId: uuid("admin_id").references(() => officers.id, {
      onDelete: "set null",
    }),

    ...timestamps,
  },
  (table) => [
    index("certs_name_idx").on(table.name),
    index("certs_admin_id_idx").on(table.adminId),
  ],
);

// --- Junction table: many-to-many between officers and certs ------------
// (Officer membership in a cert — separate from who ADMINISTERS the cert.)
export const officerCerts = pgTable(
  "officer_certs",
  {
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    certId: uuid("cert_id")
      .notNull()
      .references(() => certs.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.officerId, table.certId] }),
    index("officer_certs_cert_id_idx").on(table.certId),
  ],
);

// --- Lookup table: the fixed list of roles (ตำแหน่งงาน) ------------------
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [index("roles_name_idx").on(table.name)],
);

// --- Junction table: many-to-many between officers and roles ------------
export const officerRoles = pgTable(
  "officer_roles",
  {
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.officerId, table.roleId] }),
    index("officer_roles_role_id_idx").on(table.roleId),
  ],
);

// =========================================================================
// 4. ระบบแจ้งปัญหาข้อมูล (Data Correction Reports)
// =========================================================================
export const dataCorrectionReports = pgTable(
  "data_correction_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // เจ้าของข้อมูลที่ถูกแจ้งว่าเกิดปัญหา
    targetOfficerId: uuid("target_officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    // ผู้ใช้ที่เป็นคนแจ้งเรื่องเข้ามา (null ได้กรณีไม่ล็อกอิน/ผู้ใช้ถูกลบ)
    reporterId: uuid("reporter_id").references(() => officers.id, {
      onDelete: "set null",
    }),
    // หัวข้อ/ประเภทปัญหาที่เลือก (เช่น โทรไม่ติด, เบอร์โทรไม่ถูกต้อง ฯลฯ ดู REPORT_REASONS)
    reason: varchar("reason", { length: 64 }).notNull(),
    // รายละเอียดเพิ่มเติม (Optional)
    details: text("details"),

    // Allowed values: "reported" | "resolved" | "rejected" (see REPORT_STATUSES above)
    status: varchar("status", { length: 32 }).notNull().default("reported"),

    // บันทึกการจัดการของ Admin
    adminNotes: text("admin_notes"),
    resolvedBy: uuid("resolved_by").references(() => officers.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    ...timestamps,
  },
  (table) => [
    index("reports_target_officer_id_idx").on(table.targetOfficerId),
    index("reports_status_idx").on(table.status),
    index("reports_reason_idx").on(table.reason),
    index("reports_created_at_idx").on(table.createdAt),
  ],
);

// =========================================================================
// 5. Relations (Drizzle Relational Queries)
// =========================================================================
export const officersRelations = relations(officers, ({ one, many }) => ({
  phone: one(phones, {
    fields: [officers.id],
    references: [phones.officerId],
  }),
  officerCerts: many(officerCerts),
  officerRoles: many(officerRoles),
  // The cert this officer administers, IF their systemRole is "admin"
  administeredCert: one(certs, {
    fields: [officers.id],
    references: [certs.adminId],
  }),
  receivedReports: many(dataCorrectionReports, {
    relationName: "targetOfficer",
  }),
  submittedReports: many(dataCorrectionReports, { relationName: "reporter" }),
}));

export const phonesRelations = relations(phones, ({ one }) => ({
  officer: one(officers, {
    fields: [phones.officerId],
    references: [officers.id],
  }),
}));

export const certsRelations = relations(certs, ({ one, many }) => ({
  admin: one(officers, {
    fields: [certs.adminId],
    references: [officers.id],
  }),
  officerCerts: many(officerCerts),
}));

export const officerCertsRelations = relations(officerCerts, ({ one }) => ({
  officer: one(officers, {
    fields: [officerCerts.officerId],
    references: [officers.id],
  }),
  cert: one(certs, {
    fields: [officerCerts.certId],
    references: [certs.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  officerRoles: many(officerRoles),
}));

export const officerRolesRelations = relations(officerRoles, ({ one }) => ({
  officer: one(officers, {
    fields: [officerRoles.officerId],
    references: [officers.id],
  }),
  role: one(roles, {
    fields: [officerRoles.roleId],
    references: [roles.id],
  }),
}));

export const dataCorrectionReportsRelations = relations(
  dataCorrectionReports,
  ({ one }) => ({
    targetOfficer: one(officers, {
      fields: [dataCorrectionReports.targetOfficerId],
      references: [officers.id],
      relationName: "targetOfficer",
    }),
    reporter: one(officers, {
      fields: [dataCorrectionReports.reporterId],
      references: [officers.id],
      relationName: "reporter",
    }),
    resolver: one(officers, {
      fields: [dataCorrectionReports.resolvedBy],
      references: [officers.id],
    }),
  }),
);

