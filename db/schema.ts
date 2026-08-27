import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  primaryKey,
  index,
  jsonb,
  integer,
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
    index("officers_deleted_at_idx").on(table.deletedAt),
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
    index("phones_deleted_at_idx").on(table.deletedAt),
  ],
);

// --- Lookup Table: Sectors (หมวดหมู่ของ Cert) ----------------------------
export const sectors = pgTable(
  "sectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull().unique(),
  },
  (table) => [index("sectors_name_idx").on(table.name)],
);

export const certs = pgTable(
  "certs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shortName: varchar("short_name", { length: 128 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    logoUrl: text("logo_url"),
    location: text("location"),
    sectorId: uuid("sector_id")
      .notNull()
      .references(() => sectors.id, { onDelete: "cascade" }),
    adminId: uuid("admin_id").references(() => officers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    index("certs_short_name_idx").on(table.shortName),
    index("certs_admin_id_idx").on(table.adminId),
    index("certs_sector_id_idx").on(table.sectorId),
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
export const auditLogs = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  officerId: text("officer_id").notNull(),
  officerName: text("officer_name").notNull(),
  action: text("action").notNull(), // 'CREATED', 'UPDATED', 'DELETED'
  changes: jsonb("changes"), // e.g. { field: "email", old: "a@b.com", new: "c@d.com" }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =========================================================================
// Authentication & Security
// =========================================================================
export const loginCredentials = pgTable(
  "login_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officerId: uuid("officer_id")
      .notNull()
      .unique()
      .references(() => officers.id, { onDelete: "cascade" }),
    username: varchar("username", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    salt: varchar("salt", { length: 255 }),
    failedLoginAttempts: integer("failed_login_attempts").default(0),
    lockedUntil: timestamp("locked_until"),
    lastLoginAt: timestamp("last_login_at"),
    ...timestamps,
  },
  (table) => [
    index("login_credentials_officer_id_idx").on(table.officerId),
    index("login_credentials_username_idx").on(table.username),
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
  loginCredential: one(loginCredentials, {
    fields: [officers.id],
    references: [loginCredentials.officerId],
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

export const loginCredentialsRelations = relations(
  loginCredentials,
  ({ one }) => ({
    officer: one(officers, {
      fields: [loginCredentials.officerId],
      references: [officers.id],
    }),
  }),
);

export const sectorsRelations = relations(sectors, ({ many }) => ({
  certs: many(certs),
}));

export const certsRelations = relations(certs, ({ one, many }) => ({
  admin: one(officers, {
    fields: [certs.adminId],
    references: [officers.id],
  }),
  sector: one(sectors, {
    fields: [certs.sectorId],
    references: [sectors.id],
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
