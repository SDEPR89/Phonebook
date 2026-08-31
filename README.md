# 📒 Phonebook

ระบบสมุดโทรศัพท์สำหรับบริหารจัดการข้อมูลเจ้าหน้าที่และหน่วยงาน CERT
พัฒนาด้วย **Next.js 16**, **PostgreSQL**, **Drizzle ORM** และ **Tailwind CSS v4**

---

## 🛠 Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Framework   | Next.js 16 (App Router)           |
| Language    | TypeScript 5                      |
| Database    | PostgreSQL                        |
| ORM         | Drizzle ORM + Drizzle Kit         |
| Auth        | JWT (jose) via HTTP-only cookie   |
| Styling     | Tailwind CSS v4                   |
| Animation   | Framer Motion                     |

---

## ⚡ Quick Start (after `git clone`)

### 1. Prerequisites

- **Node.js** >= 20
- **PostgreSQL** database (local or cloud e.g. Neon, Supabase)
- **npm** (comes with Node.js)

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in the values:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# JWT secret — must be at least 32 characters
JWT_SECRET=your-super-secret-token-32-chars-or-more
```

> **Tip:** If you use Neon or Supabase, copy the connection string from the dashboard.

### 4. Push the schema to the database

```bash
npm run db:push
```

This creates all tables in your PostgreSQL database.

### 5. (Optional) Seed initial data

```bash
npm run db:seed
```

Seeds lookup tables: `units`, `areas`, `roles`, and an initial superadmin account.

### 6. (Optional) Import certificate data from CSV

```bash
npm run db:import-certs
```

Imports CERT records from `data_001.csv` in the project root.

### 7. Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 📁 Project Structure

```
phonebook/
├── app/                    # Next.js App Router
│   ├── admin/              # Admin panel (role-protected)
│   ├── api/                # API Route Handlers
│   ├── contact/            # Contact detail pages
│   ├── lib/                # Shared utilities (auth, db helpers)
│   ├── login/              # Login page
│   ├── officers/           # Officer profile pages
│   ├── profile/            # Current user profile (auth-protected)
│   ├── search/             # Search results page
│   ├── setting/            # User settings (auth-protected)
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home / directory page
│
├── components/             # Reusable React components
│   ├── AdminCertList.tsx
│   ├── AdminCreateCertModal.tsx
│   ├── AdminCreateOfficerModal.tsx
│   ├── AdminEditCertModal.tsx
│   ├── AdminEditOfficerModal.tsx
│   ├── AdminUserList.tsx
│   ├── Header.tsx
│   ├── SearchBar.tsx
│   └── ...
│
├── db/
│   ├── schema.ts           # Drizzle ORM table definitions
│   └── index.ts            # Database connection instance
│
├── drizzle/                # Auto-generated SQL migrations
├── scripts/
│   ├── seed.ts             # Seeds lookup tables + superadmin
│   └── import-certs.ts     # Imports CERT data from CSV
│
├── middleware.ts            # Auth/role route protection
├── drizzle.config.ts        # Drizzle Kit configuration
└── .env.example             # Environment variable template
```

---

## 🗃 Database Schema Overview

| Table                     | Description                                    |
|---------------------------|------------------------------------------------|
| `officers`                | Core user/officer records                      |
| `phones`                  | Phone numbers (1-to-1 with officers)           |
| `login_credentials`       | Username, password hash, login attempts        |
| `units`                   | Lookup: หน่วย (organizational units)           |
| `areas`                   | Lookup: ด้าน (operational areas)               |
| `certs`                   | CERT organizations                             |
| `cert_units`              | Junction: CERT ↔ Units                         |
| `officer_certs`           | Junction: Officer ↔ CERT memberships           |
| `roles`                   | Lookup: job roles / ตำแหน่งงาน                 |
| `officer_cert_roles`      | Scoped role assignments within a CERT          |
| `data_correction_reports` | User-submitted data correction requests        |
| `audit_logs`              | Admin action audit trail                       |

---

## 🔐 Authentication & Roles

Auth is handled via **JWT stored in an HTTP-only cookie** (`auth_token`).

| Role         | Access                                            |
|--------------|---------------------------------------------------|
| `officer`    | Browse directory, view contacts, edit own profile |
| `admin`      | All of the above + manage officers and CERTs      |
| `superadmin` | Full access including admin management            |

Route protection is enforced in `middleware.ts`:
- `/admin/*` → requires `admin` or `superadmin` role
- `/profile`, `/setting` → requires any authenticated session
- `/login` → redirects to `/` if already logged in

---

## 📜 Available Scripts

| Command                   | Description                                      |
|---------------------------|--------------------------------------------------|
| `npm run dev`             | Start development server                         |
| `npm run build`           | Build for production                             |
| `npm run start`           | Start production server                          |
| `npm run lint`            | Run ESLint                                       |
| `npm run db:generate`     | Generate SQL migration files from schema changes |
| `npm run db:push`         | Push schema directly to DB (dev use)             |
| `npm run db:migrate`      | Apply generated migration files                  |
| `npm run db:seed`         | Seed initial lookup data + superadmin account    |
| `npm run db:import-certs` | Import CERT data from `data_001.csv`             |

---

## 🔄 Making Schema Changes

1. Edit `db/schema.ts`
2. Generate a migration:
   ```bash
   npm run db:generate
   ```
3. Apply the migration:
   ```bash
   npm run db:migrate
   ```
   Or push directly during development:
   ```bash
   npm run db:push
   ```

---

## 🧑‍💻 Development Notes

- **Environment file:** Never commit `.env`. Use `.env.example` as a template.
- **JWT_SECRET** must be **32+ characters** — shorter secrets will break token verification.
- **Soft deletes:** The `officers`, `phones`, `certs`, and related tables use a `deleted_at` column for soft deletion. Always filter with `WHERE deleted_at IS NULL` in queries.
- **CSV import:** The `data_001.csv` file is the initial data source for CERT records. The import script (`db:import-certs`) is idempotent — running it multiple times is safe.
- **Audit logs:** Admin actions are recorded in the `audit_logs` table automatically.
- **Next.js version:** This project uses **Next.js 16** (App Router). Check `node_modules/next/dist/docs/` for the latest API documentation before modifying routing or middleware.

---

## 🐛 Troubleshooting

**Database connection failed**
- Check `DATABASE_URL` in your `.env` file.
- Ensure your PostgreSQL server is running and accessible from your machine.

**`db:push` fails or tables are missing**
- Run `npm run db:generate` first to generate migrations, then `npm run db:migrate`.

**Login always fails**
- Confirm `JWT_SECRET` is set in `.env` and is at least 32 characters.
- Clear browser cookies and try again.

**Seed script fails**
- Ensure `db:push` or `db:migrate` has been run first so all tables exist before seeding.

---

## 🚀 Future Improvements

### 1. Soft Delete & Account Lifecycle Management
- **Account Restoration (Restore Account):** Provide an administrative interface and API endpoints to restore soft-deleted officer accounts (`deleted_at IS NOT NULL`) within the active grace period.
- **Automated 90-Day Hard Purge (Data Retention Policy):** Implement a scheduled cron worker/background task to permanently purge soft-deleted records and associated data from the database after 90 days pass (`deleted_at <= NOW() - INTERVAL '90 days'`) to ensure compliance with data retention and privacy policies.

