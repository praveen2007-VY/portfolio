-- =============================================================================
-- Portfolio schema: content tables, admin allowlist, RLS, storage buckets.
--
-- Security model
--   * Administrators are listed in public.admin_users. That table has NO
--     insert/update/delete policies, so it can only be changed by the database
--     owner (SQL editor / migrations), never through the public API.
--   * public.is_admin() is the single authorization predicate used by every
--     write policy, including Storage.
--   * Anonymous visitors can read published rows only.
--   * profiles is not directly readable by anonymous users; the public view of
--     the profile goes through get_public_profile(), which hides the phone
--     number / email unless the matching show_* flag is enabled.
--   * Table and function privileges are granted explicitly at the end of this
--     file (least privilege), independent of project default grants.
--
-- Run ONCE on a fresh project (SQL Editor or `supabase db push`). It is not
-- idempotent: running it again fails with "already exists" errors.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Dates with the precision we actually know: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'.
-- Lexicographic ordering matches chronological ordering.
create domain public.partial_date as text
  check (value ~ '^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$');

create domain public.http_url as text
  check (value ~ '^https?://[^\s]+$' and char_length(value) <= 2048);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Administrator allowlist
-- ---------------------------------------------------------------------------

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A signed-in user may see whether they themselves are an admin. Nobody can
-- write to this table through the API (no insert/update/delete policies).
create policy "admin_users: read own row"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete, truncate on public.admin_users from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profile (single row)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                uuid primary key default gen_random_uuid(),
  singleton         boolean not null default true unique check (singleton),
  full_name         text not null check (char_length(full_name) between 1 and 120),
  headline          text check (char_length(headline) <= 240),
  about             text check (char_length(about) <= 6000),
  focus_areas       text[] not null default '{}' check (cardinality(focus_areas) <= 12),
  location          text check (char_length(location) <= 120),
  email             text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  show_email        boolean not null default true,
  phone             text check (phone ~ '^[0-9+()\-\s]{6,24}$'),
  show_phone        boolean not null default false,
  avatar_path       text check (avatar_path ~ '^profile/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  resume_path       text check (resume_path ~ '^resume/[0-9a-f-]{36}\.pdf$'),
  resume_file_name  text check (char_length(resume_file_name) <= 120),
  resume_updated_at timestamptz,
  github_url        public.http_url,
  linkedin_url      public.http_url,
  leetcode_url      public.http_url,
  codechef_url      public.http_url,
  website_url       public.http_url,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: admin read" on public.profiles for select
  to authenticated using ((select public.is_admin()));
create policy "profiles: admin update" on public.profiles for update
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- No insert/delete policies: the single profile row is created by seed.sql.

-- Returns the id of the portfolio owner's profile, used as the default
-- profile_id for content rows.
create or replace function public.portfolio_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.profiles limit 1;
$$;

revoke execute on function public.portfolio_profile_id() from public, anon;
grant execute on function public.portfolio_profile_id() to authenticated;

-- Public projection of the profile. Private contact details are returned only
-- when explicitly enabled by the owner.
create or replace function public.get_public_profile()
returns table (
  full_name         text,
  headline          text,
  about             text,
  focus_areas       text[],
  location          text,
  email             text,
  phone             text,
  avatar_path       text,
  has_resume        boolean,
  resume_updated_at timestamptz,
  github_url        text,
  linkedin_url      text,
  leetcode_url      text,
  codechef_url      text,
  website_url       text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.full_name,
    p.headline,
    p.about,
    p.focus_areas,
    p.location,
    case when p.show_email then p.email end,
    case when p.show_phone then p.phone end,
    p.avatar_path,
    p.resume_path is not null,
    p.resume_updated_at,
    p.github_url,
    p.linkedin_url,
    p.leetcode_url,
    p.codechef_url,
    p.website_url
  from public.profiles p
  limit 1;
$$;

revoke execute on function public.get_public_profile() from public;
grant execute on function public.get_public_profile() to anon, authenticated;

-- Resume location for the public download route. Only returns a path when a
-- resume has been uploaded; the file itself is served through a short-lived
-- signed URL.
create or replace function public.get_public_resume()
returns table (resume_path text, resume_file_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.resume_path, p.resume_file_name
  from public.profiles p
  where p.resume_path is not null
  limit 1;
$$;

revoke execute on function public.get_public_resume() from public;
grant execute on function public.get_public_resume() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Site settings: one 'draft' row edited in the dashboard and one 'published'
-- row served publicly. Publishing copies draft -> published.
-- ---------------------------------------------------------------------------

create table public.site_settings (
  id              uuid primary key default gen_random_uuid(),
  variant         text not null unique check (variant in ('draft', 'published')),
  hero_eyebrow    text check (char_length(hero_eyebrow) <= 120),
  hero_greeting   text not null default '' check (char_length(hero_greeting) <= 120),
  hero_title      text not null default '' check (char_length(hero_title) <= 200),
  hero_highlight  text check (char_length(hero_highlight) <= 120),
  hero_intro      text check (char_length(hero_intro) <= 800),
  sections        jsonb not null default '{}'::jsonb check (jsonb_typeof(sections) = 'object'),
  accent          text not null default 'cobalt'
                    check (accent in ('cobalt', 'electric', 'indigo', 'ocean', 'violet')),
  animation_level text not null default 'full' check (animation_level in ('full', 'reduced')),
  enable_3d       boolean not null default true,
  coding_summary  text check (char_length(coding_summary) <= 200),
  footer_text     text check (char_length(footer_text) <= 300),
  seo_title       text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 300),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

create policy "site_settings: public read published" on public.site_settings for select
  to anon, authenticated using (variant = 'published' or (select public.is_admin()));
create policy "site_settings: admin update" on public.site_settings for update
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------

create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null default public.portfolio_profile_id()
                     references public.profiles (id) on delete restrict,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title            text not null check (char_length(title) between 1 and 160),
  summary          text check (char_length(summary) <= 400),
  description      text check (char_length(description) <= 8000),
  problem          text check (char_length(problem) <= 3000),
  solution         text check (char_length(solution) <= 3000),
  features         text[] not null default '{}' check (cardinality(features) <= 30),
  tech_stack       text[] not null default '{}' check (cardinality(tech_stack) <= 30),
  category         text check (char_length(category) <= 60),
  cover_path       text check (cover_path ~ '^projects/covers/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  screenshot_paths text[] not null default '{}' check (cardinality(screenshot_paths) <= 12),
  repo_url         public.http_url,
  demo_url         public.http_url,
  video_url        public.http_url,
  start_date       public.partial_date,
  end_date         public.partial_date,
  is_featured      boolean not null default false,
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.certificates (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null default public.portfolio_profile_id()
                   references public.profiles (id) on delete restrict,
  title          text not null check (char_length(title) between 1 and 200),
  issuer         text not null check (char_length(issuer) between 1 and 120),
  issue_date     public.partial_date,
  expiry_date    public.partial_date,
  credential_id  text check (char_length(credential_id) <= 120),
  credential_url public.http_url,
  image_path     text check (image_path ~ '^certificates/images/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  pdf_path       text check (pdf_path ~ '^certificates/pdfs/[0-9a-f-]{36}\.pdf$'),
  category       text check (char_length(category) <= 60),
  description    text check (char_length(description) <= 2000),
  is_published   boolean not null default false,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (expiry_date is null or issue_date is null or expiry_date >= issue_date)
);

create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null default public.portfolio_profile_id()
                 references public.profiles (id) on delete restrict,
  title        text not null check (char_length(title) between 1 and 200),
  organization text check (char_length(organization) <= 120),
  highlight    text check (char_length(highlight) <= 60),
  description  text check (char_length(description) <= 2000),
  category     text check (char_length(category) <= 60),
  achieved_on  public.partial_date,
  link_url     public.http_url,
  image_path   text check (image_path ~ '^achievements/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.coding_profiles (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null default public.portfolio_profile_id()
                    references public.profiles (id) on delete restrict,
  platform        text not null check (char_length(platform) between 1 and 60),
  username        text check (char_length(username) <= 60),
  profile_url     public.http_url,
  problems_solved integer check (problems_solved >= 0),
  max_rating      integer check (max_rating >= 0),
  note            text check (char_length(note) <= 200),
  is_published    boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.skills (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null default public.portfolio_profile_id()
                 references public.profiles (id) on delete restrict,
  name         text not null check (char_length(name) between 1 and 60),
  category     text not null check (char_length(category) between 1 and 60),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (category, name)
);

create table public.experiences (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null default public.portfolio_profile_id()
                    references public.profiles (id) on delete restrict,
  role            text not null check (char_length(role) between 1 and 120),
  organization    text not null check (char_length(organization) between 1 and 160),
  location        text check (char_length(location) <= 120),
  employment_type text check (char_length(employment_type) <= 60),
  start_date      public.partial_date,
  end_date        public.partial_date,
  is_current      boolean not null default false,
  summary         text check (char_length(summary) <= 1000),
  highlights      text[] not null default '{}' check (cardinality(highlights) <= 20),
  technologies    text[] not null default '{}' check (cardinality(technologies) <= 30),
  is_published    boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.education (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null default public.portfolio_profile_id()
                 references public.profiles (id) on delete restrict,
  degree       text not null check (char_length(degree) between 1 and 160),
  field        text check (char_length(field) <= 160),
  institution  text not null check (char_length(institution) between 1 and 200),
  location     text check (char_length(location) <= 120),
  start_date   public.partial_date,
  end_date     public.partial_date,
  grade        text check (char_length(grade) <= 40),
  grade_label  text check (char_length(grade_label) <= 40),
  coursework   text[] not null default '{}' check (cardinality(coursework) <= 30),
  description  text check (char_length(description) <= 2000),
  is_published boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- Shared triggers, indexes and policies for the content tables.
do $$
declare
  t text;
begin
  foreach t in array array['projects', 'certificates', 'achievements', 'coding_profiles',
                           'skills', 'experiences', 'education']
  loop
    execute format(
      'create trigger %1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at()', t);
    execute format(
      'create index %1$s_published_order_idx on public.%1$I (is_published, sort_order)', t);
    execute format('create index %1$s_profile_idx on public.%1$I (profile_id)', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: public read published" on public.%1$I for select
         to anon, authenticated using (is_published or (select public.is_admin()))', t);
    execute format(
      'create policy "%1$s: admin insert" on public.%1$I for insert
         to authenticated with check ((select public.is_admin()))', t);
    execute format(
      'create policy "%1$s: admin update" on public.%1$I for update
         to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
    execute format(
      'create policy "%1$s: admin delete" on public.%1$I for delete
         to authenticated using ((select public.is_admin()))', t);
  end loop;
end;
$$;

-- Keep published_at in sync for projects.
create or replace function public.projects_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_published and (tg_op = 'INSERT' or not old.is_published) then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger projects_published_at before insert or update on public.projects
  for each row execute function public.projects_published_at();

-- ---------------------------------------------------------------------------
-- Contact messages: visitors may insert (validated + rate limited by the DB),
-- only admins can read or manage them.
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 80),
  email      text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message    text not null check (char_length(message) between 10 and 4000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_messages_created_idx on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

create policy "contact_messages: anyone can submit" on public.contact_messages for insert
  to anon, authenticated with check (is_read = false);
create policy "contact_messages: admin read" on public.contact_messages for select
  to authenticated using ((select public.is_admin()));
create policy "contact_messages: admin update" on public.contact_messages for update
  to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "contact_messages: admin delete" on public.contact_messages for delete
  to authenticated using ((select public.is_admin()));

-- Visitors may only supply these three columns.
revoke insert on public.contact_messages from anon, authenticated;
grant insert (name, email, message) on public.contact_messages to anon, authenticated;

-- Global flood protection that also applies to direct API calls.
create or replace function public.contact_messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.contact_messages
      where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many messages. Please try again later.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger contact_messages_rate_limit before insert on public.contact_messages
  for each row execute function public.contact_messages_rate_limit();

-- ---------------------------------------------------------------------------
-- Storage
--   media     : public bucket for images shown on the site (profile photo,
--               project covers/screenshots, achievement images).
--   documents : private bucket for the resume and certificate files. Files are
--               served through short-lived signed URLs, and anonymous users can
--               only sign files referenced by published content.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('documents', 'documents', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_public_document(object_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.certificates c
    where c.is_published and (c.image_path = object_path or c.pdf_path = object_path)
  ) or exists (
    select 1 from public.profiles p where p.resume_path = object_path
  );
$$;

revoke execute on function public.is_public_document(text) from public;
grant execute on function public.is_public_document(text) to anon, authenticated;

create policy "media: admin read" on storage.objects for select
  to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "media: admin insert" on storage.objects for insert
  to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media: admin update" on storage.objects for update
  to authenticated using (bucket_id = 'media' and (select public.is_admin()))
  with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media: admin delete" on storage.objects for delete
  to authenticated using (bucket_id = 'media' and (select public.is_admin()));

create policy "documents: read published or admin" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'documents' and ((select public.is_admin()) or public.is_public_document(name)));
create policy "documents: admin insert" on storage.objects for insert
  to authenticated with check (bucket_id = 'documents' and (select public.is_admin()));
create policy "documents: admin update" on storage.objects for update
  to authenticated using (bucket_id = 'documents' and (select public.is_admin()))
  with check (bucket_id = 'documents' and (select public.is_admin()));
create policy "documents: admin delete" on storage.objects for delete
  to authenticated using (bucket_id = 'documents' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privilege hardening (least privilege, independent of project defaults)
--
-- Supabase projects normally grant ALL on new public tables and EXECUTE on new
-- functions to anon/authenticated, relying on RLS to restrict rows. RLS does
-- not apply to TRUNCATE, and some projects do not auto-grant at all, so the
-- privileges for every object created above are reset and granted explicitly.
-- Only objects created by this migration are touched.
--
-- Row access is still decided by the RLS policies above; these grants only
-- define which operations each role may attempt.
--   anon          : read site settings + content (RLS: published only),
--                   submit contact messages (3 columns), call public functions.
--   authenticated : the above, plus write access on content/profile/settings/
--                   messages — RLS limits every write (and profile reads) to
--                   administrators listed in admin_users.
-- No sequences or views are created by this migration (UUID keys only).
-- Storage privileges are managed by Supabase; access is governed by the
-- storage.objects policies above.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on table
  public.admin_users, public.profiles, public.site_settings,
  public.projects, public.certificates, public.achievements, public.coding_profiles,
  public.skills, public.experiences, public.education, public.contact_messages
  from anon, authenticated;

-- Published content and settings (rows filtered by RLS).
grant select on table
  public.site_settings, public.projects, public.certificates, public.achievements,
  public.coding_profiles, public.skills, public.experiences, public.education
  to anon, authenticated;

-- Administrator CRUD (RLS: is_admin()).
grant insert, update, delete on table
  public.projects, public.certificates, public.achievements, public.coding_profiles,
  public.skills, public.experiences, public.education
  to authenticated;

-- Profile and settings: admins only via RLS. Visitors and ordinary users read
-- the profile exclusively through get_public_profile().
grant select, update on table public.profiles to authenticated;
grant update on table public.site_settings to authenticated;

-- Admin allowlist: a signed-in user may only read their own row (RLS).
grant select on table public.admin_users to authenticated;

-- Contact messages: anyone may submit three columns; admins read, mark as
-- read and delete (RLS).
grant insert (name, email, message) on table public.contact_messages to anon, authenticated;
grant select, delete on table public.contact_messages to authenticated;
grant update (is_read) on table public.contact_messages to authenticated;

-- Functions: nothing is executable by default; grant only what policies, the
-- public site and column defaults need. Trigger functions need no grant (the
-- EXECUTE privilege is checked when a trigger is created, not when it fires).
revoke all on function
  public.set_updated_at(), public.is_admin(), public.portfolio_profile_id(),
  public.get_public_profile(), public.get_public_resume(),
  public.projects_published_at(), public.contact_messages_rate_limit(),
  public.is_public_document(text)
  from public, anon, authenticated;

grant execute on function
  public.is_admin(), public.get_public_profile(), public.get_public_resume(),
  public.is_public_document(text)
  to anon, authenticated;
grant execute on function public.portfolio_profile_id() to authenticated;
