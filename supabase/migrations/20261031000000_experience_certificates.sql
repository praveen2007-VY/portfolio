-- Add optional internship certificate columns to experiences table
alter table public.experiences
  add column if not exists certificate_title text check (char_length(certificate_title) <= 200),
  add column if not exists certificate_organization text check (char_length(certificate_organization) <= 160),
  add column if not exists certificate_date public.partial_date,
  add column if not exists certificate_url public.http_url,
  add column if not exists certificate_image_path text check (certificate_image_path ~ '^certificates/images/[0-9a-f-]{36}\.(jpg|png|webp|avif)$'),
  add column if not exists certificate_pdf_path text check (certificate_pdf_path ~ '^certificates/pdfs/[0-9a-f-]{36}\.pdf$');

-- Update is_public_document to also allow reading documents attached to published experiences
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
    select 1 from public.experiences e
    where e.is_published and (e.certificate_image_path = object_path or e.certificate_pdf_path = object_path)
  ) or exists (
    select 1 from public.profiles p where p.resume_path = object_path
  );
$$;

-- Reload schema cache in PostgREST
notify pgrst, 'reload schema';
