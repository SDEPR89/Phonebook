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
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"),
};

// =========================================================================
// 2. Allowed value lists
// =========================================================================
export const SYSTEM_ROLES = ["officer", "admin", "superadmin"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const REPORT_STATUSES = ["reported", "resolved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_REASONS = [
  "unreachable_phone",
  "wrong_phone",
  "wrong_name",
  "wrong_cert",
  "wrong_role",
  "resigned_or_moved",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// =========================================================================
// 3. Core Entities
// =========================================================================

export const officers = pgTable(
  "officers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    avatarUrl: text("avatar_url"),
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

export const phones = pgTable(
  "phones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officerId: uuid("officer_id")
      .notNull()
      .unique()
      .references(() => officers.id, { onDelete: "cascade" }),
    phoneNumber: varchar("phone_number", { length: 32 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [
    index("phones_phone_number_idx").on(table.phoneNumber),
    index("phones_officer_id_idx").on(table.officerId),
  ],
);

export const certs = pgTable(
  "certs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    logoUrl: text("logo_url"),
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

// --- Junction: Membership of an Officer in a Cert -----------------------
export const officerCerts = pgTable(
  "officer_certs",
  {
    id: uuid("id").defaultRandom().primaryKey(), // Added primary key for easier referencing
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    certId: uuid("cert_id")
      .notNull()
      .references(() => certs.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("officer_certs_officer_id_cert_id_idx").on(
      table.officerId,
      table.certId,
    ),
    index("officer_certs_cert_id_idx").on(table.certId),
  ],
);

// --- Lookup Table: Job Roles (ตำแหน่งงาน) --------------------------------
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
    ...timestamps,
  },
  (table) => [index("roles_name_idx").on(table.name)],
);

// --- Scoped Junction: Assign Roles to an Officer WITHIN a specific Cert --
export const officerCertRoles = pgTable(
  "officer_cert_roles",
  {
    officerCertId: uuid("officer_cert_id")
      .notNull()
      .references(() => officerCerts.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.officerCertId, table.roleId] }),
    index("officer_cert_roles_role_id_idx").on(table.roleId),
  ],
);

// =========================================================================
// 4. Data Correction Reports
// =========================================================================
export const dataCorrectionReports = pgTable(
  "data_correction_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetOfficerId: uuid("target_officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    reporterId: uuid("reporter_id").references(() => officers.id, {
      onDelete: "set null",
    }),
    reason: varchar("reason", { length: 64 }).notNull(),
    details: text("details"),
    status: varchar("status", { length: 32 }).notNull().default("reported"),
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
// 5. Relations
// =========================================================================
export const officersRelations = relations(officers, ({ one, many }) => ({
  phone: one(phones, {
    fields: [officers.id],
    references: [phones.officerId],
  }),
  officerCerts: many(officerCerts),
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

export const officerCertsRelations = relations(
  officerCerts,
  ({ one, many }) => ({
    officer: one(officers, {
      fields: [officerCerts.officerId],
      references: [officers.id],
    }),
    cert: one(certs, {
      fields: [officerCerts.certId],
      references: [certs.id],
    }),
    // A single officer-cert membership can have multiple assigned roles
    officerCertRoles: many(officerCertRoles),
  }),
);

export const rolesRelations = relations(roles, ({ many }) => ({
  officerCertRoles: many(officerCertRoles),
}));

export const officerCertRolesRelations = relations(
  officerCertRoles,
  ({ one }) => ({
    officerCert: one(officerCerts, {
      fields: [officerCertRoles.officerCertId],
      references: [officerCerts.id],
    }),
    role: one(roles, {
      fields: [officerCertRoles.roleId],
      references: [roles.id],
    }),
  }),
);

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
