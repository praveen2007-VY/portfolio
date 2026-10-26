# Praveen R — Portfolio & Admin CMS

A one-page 3D portfolio (Next.js 16, React 19, Tailwind CSS 4, Framer Motion, React Three Fiber) with a private
admin dashboard backed by Supabase (Postgres, Auth, Storage). Every piece of content — profile, projects,
certificates, achievements, coding stats, skills, experience, education, resume and site settings — is edited
from `/admin`. No code changes are needed to update the portfolio.

- **Public site:** `/` (one continuous page) and `/projects/<slug>` (project details)
- **Admin:** `/admin` (click the logo 5 times quickly, or open `/admin/login` directly)
- **Draft preview:** `/preview` (admins only — shows drafts and unpublished site settings)
- **Resume download:** `/resume` (always serves the currently published PDF)

---

## 1. Quick start (local)

Requirements: Node.js 20.9+ (tested on Node 24), npm, and a free Supabase project.

```bash
npm install
cp .env.example .env.local     # then fill in the values (section 2)
npm run dev                    # http://localhost:3000
```

Without Supabase configured the public site still renders, using the built-in resume content as a read-only
fallback, and the admin login explains what is missing. Sign-in is never simulated.

## 2. Environment variables

| Variable | Where to find it | Exposed to browser |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key (`sb_publishable_…`). The legacy `anon` key also works (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). | yes (safe: RLS enforces permissions) |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://praveen.dev` | yes |
| `UPLOAD_MAX_IMAGE_MB` / `UPLOAD_MAX_DOCUMENT_MB` | Optional; defaults 5 / 10 MB (cannot exceed the bucket limits) | no |

**The service-role key is not used anywhere.** All admin operations run with the signed-in administrator's own
session, and Postgres Row Level Security decides what is allowed. Never add the service-role key, database password
or any secret to `NEXT_PUBLIC_*` variables or to source control. `.env.local` is git-ignored.

> `NEXT_PUBLIC_*` values are inlined at build time — rebuild/redeploy after changing them.

## 3. Supabase setup (one time)

1. **Create a project** at <https://supabase.com/dashboard>.
2. **Run the migration — once.** Open *SQL Editor*, paste the contents of
   `supabase/migrations/20261024000000_portfolio_schema.sql`, and run it. It is not idempotent: running it a
   second time fails with "already exists" errors, so run it once on a fresh project. It creates:
   - tables `profiles`, `site_settings`, `projects`, `certificates`, `achievements`, `coding_profiles`, `skills`,
     `experiences`, `education`, `contact_messages`, and the admin allowlist `admin_users`;
   - RLS policies on every table, constraints, indexes and triggers;
   - storage buckets `media` (public images) and `documents` (private resume/certificate files) with policies;
   - explicit least-privilege table and function grants (no `TRUNCATE`/`REFERENCES`/`TRIGGER` for API roles),
     so the result does not depend on the project's default grants.
3. **Seed your resume content.** Run `supabase/seed.sql` in the SQL editor. It is safe to rerun: each table is
   only seeded while it is empty, so it never overwrites dashboard edits.
4. **Lock down sign-ups.** *Authentication → Sign In / Providers → Email*: keep Email enabled and turn
   **"Allow new users to sign up" off**. (Even if someone signs up, they get no access — see section 4 — but there
   is no reason to allow it.)
5. **Create your administrator** (next section).

Using the Supabase CLI instead? `supabase link --project-ref <ref>` then `supabase db push`, and run `seed.sql`
once with `psql` or the SQL editor.

## 4. Administrator bootstrap

Admin access is granted only by a row in `public.admin_users`. That table has **no insert/update/delete policies**,
so it cannot be changed through the API — not even by an existing admin. There is no sign-up-as-admin endpoint.

1. *Authentication → Users → Add user → Create new user*: enter your email and a strong password, tick
   **Auto Confirm User**.
2. Edit the email in `supabase/bootstrap-admin.sql` and run it in the SQL editor.
3. Sign in at `/admin/login`.

To revoke access, delete the row (see the bottom of `bootstrap-admin.sql`).

## 5. Managing content

| Task | Where |
| --- | --- |
| Name, headline, bio, photo, contact details, social links | Admin → Profile |
| Upload / replace / remove resume | Admin → Profile → Resume |
| Hero text, section headings & visibility, accent color, motion, 3D on/off, footer, SEO | Admin → Site settings (save draft → preview → publish) |
| Projects (cover, screenshots, links, featured, draft/publish, order) | Admin → Projects |
| Certificates (image/PDF, credential ID, verification URL, category) | Admin → Certificates |
| Achievements and coding statistics | Admin → Achievements |
| Skills and skill categories (rename, reorder, show/hide) | Admin → Skills |
| Experience, Education | their own pages |
| Contact form messages | Admin → Messages |

- **Drafts** are only visible to you (dashboard and `/preview`). Publishing updates the public site immediately —
  admin changes invalidate the `portfolio` cache tag, so the next request renders fresh content.
- **Dates** use the precision you know: `2026`, `2026-05` or `2026-05-14`.
- **Uploads** go straight from your browser to Supabase Storage through single-use signed URLs (with progress).
  File type and size are checked in the browser, again on the server before the upload URL is issued, again by
  the bucket, and once more before the path is saved. Paths are generated by the server (`<prefix>/<uuid>.<ext>`);
  original file names are never used in storage paths. Replaced or deleted files are removed, and files uploaded
  in a form you cancel are discarded.
- **Certificates and the resume** live in the private `documents` bucket. Visitors receive short-lived signed
  URLs, and only for files referenced by *published* certificates or the published resume.
- The phone number is **hidden by default**; enable "Show phone publicly" in Profile if you want it shown.

Information the resume did not contain is intentionally left empty — repository links, demo links, screenshots,
certificate files, credential IDs/URLs and LeetCode/CodeChef profile URLs. Add them from the dashboard.
The GitHub and LinkedIn URLs were built from the handles on the resume; please confirm they are correct.

## 6. Contact form

Messages are validated on the server (Zod), protected by a honeypot field, a minimum fill time, a per-instance
rate limit, and a database trigger that caps submissions globally (30/hour). They are stored in
`contact_messages` and appear under **Admin → Messages**. Visitors cannot read messages.

**Email notifications are not sent.** To get an email per message, add a Supabase Database Webhook (or an Edge
Function) on `contact_messages` inserts that calls your email provider (e.g. Resend). The form never claims an
email was sent.

## 7. Deployment (Vercel)

1. Push the project to a Git repository and import it in Vercel (framework preset: Next.js).
2. Add the environment variables from section 2 for **Production** (and Preview if you use it).
3. Deploy. Then set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy.
4. In Supabase → *Authentication → URL Configuration*, set **Site URL** to your production URL.

Any Node.js host that supports Next.js 16 works (`npm run build && npm run start`). Content updates never require
a redeploy.

## 8. Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types and runs `tsc` |
| `npm test` | Unit tests + database/RLS tests (Vitest + PGlite) |
| `npm run test:e2e` | Playwright end-to-end tests (run `npm run build` first; `npx playwright install chromium` once) |
| `npm run seed:generate` | Regenerates `supabase/seed.sql` from `src/lib/content/resume.ts` |
| `npm run check` | lint + typecheck + tests + build |

### What the tests cover

- **Database & RLS (`tests/db`)** — the real migration and seed run in an in-process Postgres (PGlite) with a
  small emulation of Supabase's `auth`/`storage` schemas. Verifies: visitors only read published rows and the
  published settings; visitors and non-admin users cannot insert/update/delete content or upload files; users
  cannot add themselves to `admin_users`; private phone/email stay hidden unless enabled; unpublished certificate
  files cannot be accessed; contact messages are write-only for visitors; unsafe paths/URLs/dates are rejected;
  the seed is rerunnable without overwriting edits. `privileges.test.ts` checks the exact privilege matrix
  (revoked `TRUNCATE`/`REFERENCES`/`TRIGGER`, column-level contact grants, executable functions), full admin CRUD
  with triggers still firing, and certificate/resume publication rules. Every database test runs twice: with
  Supabase's default grants and with none — the migration must behave the same either way.
- **Unit (`src/**/*.test.ts`)** — admin guard (unauthenticated / non-admin / admin), Server Actions refusing
  unauthorized writes and unknown tables, safe login redirects, upload validation and storage paths, form schemas,
  the five-click logic.
- **E2E (`tests/e2e`)** — every public section renders without console errors or horizontal overflow (desktop and
  mobile), navigation, mobile menu, certificate filters, project pages, 404s, hidden phone, the five-click entry
  (and that slow or keyboard clicks don't trigger it), and that every admin/preview route redirects anonymous
  visitors to the login page.
- **CMS workflows (`tests/e2e/admin-workflows.spec.ts`)** — sign-in errors, non-admin rejection, draft → preview
  → publish → public → edit → delete, certificate upload/replace/type rejection, profile edit visible publicly,
  resume replacement served by `/resume`, logout. These need a configured **staging** Supabase project and
  `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` (optionally `E2E_NONADMIN_*`); they are skipped otherwise.

## 9. Architecture & security notes

```
src/app/                 routes (/, /projects/[slug], /admin/**, /preview, /resume, /certificates/[id]/[kind])
src/components/          hero, three (R3F scene), sections, projects, certificates, navigation, admin, ui
src/lib/actions/         Server Actions (every admin action re-verifies the session + allowlist)
src/lib/auth/            getAdminSession / requireAdmin / requireAdminPage
src/lib/data/            cached public reads, preview reads, admin reads
src/lib/supabase/        server (cookie session), public (anonymous), storage helpers
src/lib/validation/      Zod schemas shared by forms and server
src/lib/content/resume.ts  initial content (source of seed.sql and the no-Supabase fallback)
src/proxy.ts             session refresh + login redirect for /admin and /preview
supabase/                migration, seed, admin bootstrap
```

- Authorization is enforced three times: `requireAdminPage()` in every protected page/layout,
  `requireAdmin()` in every Server Action and route handler, and RLS in the database. The five-click logo is only
  a shortcut to the login page.
- Sessions use `@supabase/ssr` HTTP-only cookies; `getUser()` validates the token with Supabase Auth on every
  protected request; the proxy refreshes expiring sessions.
- The public page is served from a server cache (`'use cache'` + `cacheTag('portfolio')`) using an anonymous
  client, so drafts can never leak into the public payload; admin mutations call `updateTag('portfolio')`.
- The 3D scene is lazy-loaded after the page is idle, pauses when off-screen, lowers quality on phones and
  low-power devices, and falls back to a static illustration when WebGL is unavailable or software-rendered, when
  3D is disabled in settings, or (motion-wise) when the visitor prefers reduced motion.

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Site shows "built-in resume content" banner (dev) | Supabase env vars missing — set them and restart. |
| "Profile row is missing" in the dashboard | Run `supabase/seed.sql`. |
| Login says "does not have administrator access" | Add the user with `supabase/bootstrap-admin.sql`. |
| Upload fails with "Could not start the upload" | Re-run the migration (buckets/policies missing) and make sure you're signed in as an admin. |
| Upload rejected as too large | Raise `UPLOAD_MAX_*_MB` (max 5 MB images / 10 MB PDFs) or compress the file. |
| Images don't load after changing Supabase project | `NEXT_PUBLIC_SUPABASE_URL` is read at build time for image optimisation — rebuild. |
| Changes not visible publicly | Make sure the item is **published** (and the section is visible in Site settings). |
| `npm run test:e2e` can't connect | Run `npm run build` first; install the browser with `npx playwright install chromium`. |
