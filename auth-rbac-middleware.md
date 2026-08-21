# RBAC Authentication Middleware Plan

## Goal
Implement Edge-compatible authentication middleware for Next.js enforcing access controls for `officer`, `admin`, and `superadmin` roles.

## Tasks
- [ ] Task 1: Install `jose` dependency for Edge JWT handling → Verify: `package.json` contains `jose`
- [ ] Task 2: Create `lib/auth.ts` with JWT sign/verify & cookie utilities → Verify: Unit functions compile with TypeScript
- [ ] Task 3: Create `app/api/auth/login/route.ts` & `app/api/auth/logout/route.ts` → Verify: `curl -X POST /api/auth/login` returns cookie
- [ ] Task 4: Connect `app/login/page.tsx` form submit to login API → Verify: Login sets HTTP-Only cookie and redirects
- [ ] Task 5: Create `middleware.ts` in Next.js root with role checks (`officer`, `admin`, `superadmin`) → Verify: Accessing `/admin` as `officer` redirects to `/`
- [ ] Task 6: Add role checks in `app/api/officers/create/route.ts` & `app/api/officers/update/route.ts` → Verify: Unauthenticated POST returns 401
- [ ] Task 7: Build and verify Next.js app → Verify: `npm run build` passes with zero errors

## Done When
- [ ] Unauthenticated users are blocked from `/admin/*` and API mutations.
- [ ] `officer` users can access `/profile`, `/setting`, `/search`, but are blocked from `/admin/*`.
- [ ] `admin` users can manage officer accounts on `/admin`.
- [ ] `superadmin` users have full access across the entire app.
