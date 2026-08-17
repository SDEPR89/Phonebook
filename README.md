# 📞 Phonebook

An internal directory web application for searching and looking up officers by name, phone number, certifications, and roles.

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL (hosted via [Supabase](https://supabase.com/))
- **ORM:** Drizzle ORM (schema definition, type safety, and migrations)
- **Language:** TypeScript

---

## 📊 Data Model

The database uses a relational model to handle one-to-many and many-to-many relationships for officers:

- `officers` — Core record (name, badge ID, basic details).
- `phones` — One-to-many relationship with `officers`.
- `certs` / `officer_certs` — Many-to-many relationship (`officer` ↔ `certification`).
- `roles` / `officer_roles` — Many-to-many relationship (`officer` ↔ `role`).

> 📌 **Source of Truth:** All schema structures are defined in `db/schema.ts`.

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (pages, API routes, UI components)
├── db/                   # Database configuration & schema
│   ├── index.ts          # Supabase / Postgres database client instance
│   └── schema.ts         # Drizzle schema definitions
├── drizzle/              # Generated SQL migration files (auto-generated)
├── drizzle.config.ts     # Drizzle Kit CLI configuration
└── .env.local            # Environment variables (Git-ignored)
```
