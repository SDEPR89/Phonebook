import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// --- Core entity: officers ---------------------------------------------
export const officers = pgTable("officers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- One-to-many: an officer has many phone numbers ---------------------
export const phones = pgTable("phones", {
  id: uuid("id").defaultRandom().primaryKey(),
  officerId: uuid("officer_id")
    .notNull()
    .references(() => officers.id, { onDelete: "cascade" }),
  phoneNumber: varchar("phone_number", { length: 32 }).notNull(),
  label: varchar("label", { length: 64 }), // e.g. "mobile", "desk"
});

// --- Lookup table: the fixed list of certifications ---------------------
export const certs = pgTable("certs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
});

// --- Junction table: many-to-many between officers and certs ------------
export const officerCerts = pgTable(
  "officer_certs",
  {
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    certId: uuid("cert_id")
      .notNull()
      .references(() => certs.id, { onDelete: "cascade" }),
    issuedDate: date("issued_date"),
  },
  (table) => [primaryKey({ columns: [table.officerId, table.certId] })],
);

// --- Lookup table: the fixed list of roles -------------------------------
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
});

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
  },
  (table) => [primaryKey({ columns: [table.officerId, table.roleId] })],
);

// --- Relations: lets Drizzle's query API do officer.phones, officer.certs, etc. ---
export const officersRelations = relations(officers, ({ many }) => ({
  phones: many(phones),
  officerCerts: many(officerCerts),
  officerRoles: many(officerRoles),
}));

export const phonesRelations = relations(phones, ({ one }) => ({
  officer: one(officers, {
    fields: [phones.officerId],
    references: [officers.id],
  }),
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
