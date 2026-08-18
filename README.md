# 📞 Phonebook

An internal directory web application for searching and looking up officers by name, phone number, cert, and email

---

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL (hosted via [Supabase](https://supabase.com/))
- **ORM:** Drizzle ORM (schema definition, type safety, and migrations)
- **Language:** TypeScript

---

## 📊 Data Model

The database uses a relational model to handle one-to-many and many-to-many relationships for officers:

- **`officers`** — Core record: `id`, `name`, `email`, plus audit timestamps (`createdAt`, `updatedAt`, `deletedAt` for soft deletes).
- **`phones`** — Each phone number is unique across the whole table.
- **`certs`** — Lookup table of certifying organizations/agencies.
- **`officer_certs`** — Many-to-many junction between `officers` ↔ `certs`.
- **`roles`** — Lookup table of role names.
- **`officer_roles`** — Many-to-many junction between `officers` ↔ `roles`.

Every table shares a common set of audit columns (`createdAt`, `updatedAt`, `deletedAt`) via a reusable `timestamps` object, and relations are wired up with Drizzle's `relations()` API so queries can pull nested data (e.g. `officer.phones`, `officer.officerCerts`) without hand-written joins.

> 📌 **Source of Truth:** All schema structures are defined in `db/schema.ts`.

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── db/                   # Database configuration & schema
│   ├── index.ts          # Supabase / Postgres database client instance
│   └── schema.ts         # Drizzle schema definitions
├── drizzle/              # Generated SQL migration files (auto-generated)
├── drizzle.config.ts     # Drizzle Kit CLI configuration
├── AGENTS.md
├── CLAUDE.md
└── .env                  # Environment variables (Git-ignored)
```

---

## 🚀 Getting Started

```bash
cd 
# Install dependencies
npm install

# Apply database migrations
npx drizzle-kit migrate

# Run the dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🗺️ Roadmap

- [x] Define relational schema (`officers`, `phones`, `certs`, `roles`, junction tables)
- [x] Add `email` to `officers`
- [x] Run initial migrations against Supabase
- [ ] Database client layer (`db/index.ts`) confirmed and reusable across routes
- [ ] API routes for `officers` (list, get by id, create, update, soft-delete)
- [ ] API routes for `phones`, `certs`, `roles`, and their junction tables
- [ ] Input validation layer for incoming request data
- [ ] Frontend search/lookup UI (name, phone, cert, role)

---

## 📝 Notes

- Soft deletes: records are never hard-deleted — `deletedAt` is set instead, so queries should filter `WHERE deletedAt IS NULL` to only return active rows.
- `phones.phoneNumber` is globally unique — no two officers can share the same number.