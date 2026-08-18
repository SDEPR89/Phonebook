import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  date,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Reusable set of audit columns — every table gets the same three,
// so the pattern is consistent and easy to recognize everywhere.
const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"), // null = active, set = soft-deleted
};

// --- Core entity: officers ---------------------------------------------
export const officers = pgTable("officers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  ...timestamps,
});

// --- One-to-many: an officer has many phone numbers ---------------------
export const phones = pgTable("phones", {
  id: uuid("id").defaultRandom().primaryKey(),
  officerId: uuid("officer_id")
    .notNull()
    .references(() => officers.id, { onDelete: "cascade" }),
  // unique(): no two officers can share the same phone number
  phoneNumber: varchar("phone_number", { length: 32 }).notNull().unique(),
  ...timestamps,
});

// --- Lookup table: the fixed list of certs (organizations/agencies) -----
export const certs = pgTable("certs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  ...timestamps,
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
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.officerId, table.certId] })],
);

// --- Lookup table: the fixed list of roles -------------------------------
export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  ...timestamps,
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
    ...timestamps,
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
