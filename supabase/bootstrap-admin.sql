-- =============================================================================
-- One-time administrator bootstrap. Run in the Supabase SQL editor (it runs as
-- the database owner, so it is the only way to change public.admin_users —
-- there is no API endpoint that can grant admin access).
--
-- 1. Authentication -> Users -> "Add user" -> create your account with
--    "Auto Confirm User" enabled.
-- 2. Replace the email below and run this script.
-- =============================================================================

insert into public.admin_users (user_id, note)
select id, 'Portfolio owner'
from auth.users
where email = 'you@example.com'          -- <-- your login email
on conflict (user_id) do nothing;

-- Verify (should return exactly one row):
select u.email, a.created_at
from public.admin_users a
join auth.users u on u.id = a.user_id;

-- To revoke access later:
-- delete from public.admin_users where user_id = (select id from auth.users where email = 'you@example.com');
