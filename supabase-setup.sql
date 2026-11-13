-- Configuration Supabase pour la page communaute.html
-- À exécuter dans Supabase > SQL Editor. Crée un bucket privé et des règles
-- qui empêchent l'accès public aux photos non approuvées.

create extension if not exists pgcrypto;

create table if not exists public.gp_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.gp_photos (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  note text not null default '' check (char_length(note) <= 300),
  caption text not null default '' check (char_length(caption) <= 300),
  storage_path text not null unique,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.gp_admins enable row level security;
alter table public.gp_photos enable row level security;

create policy "Admins can read their own admin record" on public.gp_admins
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Anyone can submit a photo for moderation" on public.gp_photos
  for insert to anon, authenticated with check (published = false);

create policy "Anyone can see approved photos" on public.gp_photos
  for select to anon, authenticated using (published = true);

create policy "Admins can see all submissions" on public.gp_photos
  for select to authenticated using (
    exists (select 1 from public.gp_admins a where a.user_id = (select auth.uid()))
  );

create policy "Admins can update submissions" on public.gp_photos
  for update to authenticated using (
    exists (select 1 from public.gp_admins a where a.user_id = (select auth.uid()))
  ) with check (
    exists (select 1 from public.gp_admins a where a.user_id = (select auth.uid()))
  );

create policy "Admins can delete submissions" on public.gp_photos
  for delete to authenticated using (
    exists (select 1 from public.gp_admins a where a.user_id = (select auth.uid()))
  );

grant select on public.gp_admins to authenticated;
grant select, insert on public.gp_photos to anon, authenticated;
grant update, delete on public.gp_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gp-screenshots', 'gp-screenshots', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

create policy "Visitors can upload image submissions" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'gp-screenshots');

create policy "Visitors can view approved images only" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'gp-screenshots' and exists (
      select 1 from public.gp_photos p where p.storage_path = name and p.published = true
    )
  );

create policy "Admins can view all submitted images" on storage.objects
  for select to authenticated using (
    bucket_id = 'gp-screenshots' and exists (
      select 1 from public.gp_admins a where a.user_id = (select auth.uid())
    )
  );

create policy "Admins can delete submitted images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'gp-screenshots' and exists (
      select 1 from public.gp_admins a where a.user_id = (select auth.uid())
    )
  );

-- Après avoir créé un utilisateur dans Supabase > Authentication > Users,
-- autorisez-le comme administrateur en remplaçant son UUID ci-dessous :
-- insert into public.gp_admins (user_id) values ('UUID-DE-L-UTILISATEUR');
