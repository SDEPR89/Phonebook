Phonebook

An internal directory for looking up officers by name, phone number, certification, and role.

Tech stack
Next.js (App Router) — frontend and server
PostgreSQL via Supabase — database
Drizzle ORM — schema, queries, and migrations
Data model

Each officer can have multiple phone numbers, multiple certifications, and multiple roles. See db/schema.ts for the full table definitions:

officers — core record (name, etc.)
phones — one-to-many with officers
certs / officer_certs — many-to-many, officer ↔ certification
roles / officer_roles — many-to-many, officer ↔ role
Getting started

1. Install dependencies
   bash
   npm install
2. Set up environment variables

Create a .env.local file in the project root:

bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

Get this from your Supabase project → Project Settings → Database → Connection string. .env.local is git-ignored — never commit real credentials.

3. Run database migrations
   bash
   npx drizzle-kit generate # generate SQL from db/schema.ts
   npx drizzle-kit migrate # apply it to your database
4. (Optional) Browse the database visually
   bash
   npx drizzle-kit studio
5. Start the dev server
   bash
   npm run dev

Visit http://localhost:3000.

Project structure
app/ Next.js routes and UI
db/
schema.ts Table definitions (source of truth for the database)
index.ts Database connection client
drizzle.config.ts Config for the drizzle-kit CLI
