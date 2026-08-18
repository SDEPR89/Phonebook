import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =========================================================================
// 1. Reusable Timestamps & Enums
// =========================================================================

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"), // null = active, timestamp = soft-deleted
};

// สิทธิ์การใช้งานระบบ (สำหรับแยกสิทธิ์ User ทั่วไป vs Admin)
export const systemRoleEnum = pgEnum("system_role", ["user", "admin"]);

// สถานะของรายการแจ้งข้อมูลผิดพลาด
export const reportStatusEnum = pgEnum("report_status", [
  "pending", // รอดำเนินการ
  "in_review", // กำลังตรวจสอบ
  "resolved", // แก้ไขข้อมูลเรียบร้อยแล้ว
  "rejected", // ปฏิเสธ (ข้อมูลถูกต้องอยู่แล้ว)
]);

// =========================================================================
// 2. Core Entities
// =========================================================================

// --- Core entity: officers ---
export const officers = pgTable(
  "officers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique(),
    avatarUrl: text("avatar_url"), // รูปโปรไฟล์ของบุคคล (URL / Path)
    systemRole: systemRoleEnum("system_role").default("user").notNull(),
    ...timestamps,
  },
  (table) => [
    // Index เพื่อเพิ่มความเร็วในการค้นหาชื่อ และ อีเมล
    index("officers_name_idx").on(table.name),
    index("officers_email_idx").on(table.email),
  ]
);

// --- One-to-many: an officer has many phone numbers ---
export const phones = pgTable(
  "phones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [
    // Index สำหรับค้นหาด้วยเบอร์โทรศัพท์ และ Foreign Key
    index("phones_phone_number_idx").on(table.phoneNumber),
    index("phones_officer_id_idx").on(table.officerId),
  ]
);

// --- Lookup table: the fixed list of certs (organizations/agencies) ---
export const certs = pgTable(
  "certs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    logoUrl: text("logo_url"), // รูปโลโก้/รูปของหน่วยงาน (URL / Path)
    ...timestamps,
  },
  (table) => [
    index("certs_name_idx").on(table.name),
  ]
);

// --- Junction table: many-to-many between officers and certs ---
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
  ]
);

// --- Lookup table: the fixed list of roles (ตำแหน่งงาน) ---
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [
    index("roles_name_idx").on(table.name),
  ]
);

// --- Junction table: many-to-many between officers and roles ---
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
  ]
);

// =========================================================================
// 3. ระบบแจ้งข้อมูลผิดพลาด (Data Correction Reports)
// =========================================================================

export const dataCorrectionReports = pgTable(
  "data_correction_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // เจ้าของข้อมูลที่ถูกแจ้งว่าผิดพลาด
    targetOfficerId: uuid("target_officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    // ผู้ใช้ที่เป็นคนแจ้งเรื่องเข้ามา (null ได้กรณีไม่ล็อกอิน/ผู้ใช้ถูกลบ)
    reporterId: uuid("reporter_id")
      .references(() => officers.id, { onDelete: "set null" }),
    // หัวข้อหรือฟิลด์ที่ผิด (เช่น "phone", "email", "cert", "role", "name")
    fieldName: varchar("field_name", { length: 64 }),
    // รายละเอียดข้อความที่แจ้ง
    reason: text("reason").notNull(),
    // ข้อมูลที่ถูกต้องที่ผู้ใช้แนะนำ/เสนอแนะ
    suggestedData: text("suggested_data"),
    // สถานะคำขอ
    status: reportStatusEnum("status").default("pending").notNull(),
    // บันทึกการจัดการของ Admin
    adminNotes: text("admin_notes"),
    resolvedBy: uuid("resolved_by")
      .references(() => officers.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    ...timestamps,
  },
  (table) => [
    index("reports_target_officer_id_idx").on(table.targetOfficerId),
    index("reports_status_idx").on(table.status),
    index("reports_created_at_idx").on(table.createdAt),
  ]
);

// =========================================================================
// 4. ระบบจัดการประวัติการใช้งาน (Log Management / Audit Logs)
// =========================================================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // ผู้กระทำ (null กรณีเป็น Guest search หรือ system)
    officerId: uuid("officer_id")
      .references(() => officers.id, { onDelete: "set null" }),
    // การกระทำ เช่น SEARCH, PROFILE_UPDATE, ADMIN_ADD_USER, REPORT_SUBMIT, RESOLVE_REPORT
    action: varchar("action", { length: 64 }).notNull(),
    // Entity ปลายทาง เช่น "officers", "data_correction_reports"
    targetEntity: varchar("target_entity", { length: 64 }),
    targetId: uuid("target_id"),
    // ข้อมูลประกอบการทำรายการ (เช่น search query, diff ข้อมูลเก่า-ใหม่)
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_officer_id_idx").on(table.officerId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);

// =========================================================================
// 5. Relations (Drizzle Relational Queries)
// =========================================================================

export const officersRelations = relations(officers, ({ many }) => ({
  phones: many(phones),
  officerCerts: many(officerCerts),
  officerRoles: many(officerRoles),
  receivedReports: many(dataCorrectionReports, { relationName: "targetOfficer" }),
  submittedReports: many(dataCorrectionReports, { relationName: "reporter" }),
  auditLogs: many(auditLogs),
}));

export const phonesRelations = relations(phones, ({ one }) => ({
  officer: one(officers, {
    fields: [phones.officerId],
    references: [officers.id],
  }),
}));

export const certsRelations = relations(certs, ({ many }) => ({
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

export const dataCorrectionReportsRelations = relations(dataCorrectionReports, ({ one }) => ({
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
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  officer: one(officers, {
    fields: [auditLogs.officerId],
    references: [officers.id],
  }),
}));
