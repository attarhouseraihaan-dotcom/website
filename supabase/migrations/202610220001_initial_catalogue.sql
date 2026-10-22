-- Raihaan Attar House catalogue and administrator access.
-- Apply once in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role) values (new.id, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, role)
select id, 'customer' from auth.users
on conflict (id) do nothing;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (length(trim(name)) between 1 and 150),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'review', 'active', 'archived')),
  featured boolean not null default false,
  best_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_name_idx on public.products (status, name);
create index if not exists products_category_status_idx on public.products (category_id, status);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 80),
  unit text check (unit is null or length(trim(unit)) <= 40),
  price numeric(12, 2) not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  details text,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint offers_valid_window check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create table if not exists public.site_settings (
  key text primary key check (length(trim(key)) between 1 and 80),
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

grant select on public.categories, public.products, public.product_variants, public.offers, public.site_settings to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants, public.offers, public.site_settings to authenticated;

insert into public.site_settings (key, value, is_public) values
  ('business', '{"name":"Raihaan Attar House – Undi","tagline":"Be Special With Good Smell","location":"Raihaan Attar House, Bhimavaram Road, Near Church, Undi, Andhra Pradesh – 534199","landmark":"","whatsapp":"9959901869","enquiries":"9346001869","instagram":"https://www.instagram.com/raihaanattarhouse_undi/"}'::jsonb, true),
  ('seo', '{"site_title":"Raihaan Attar House – Undi","description":"Explore the Raihaan Attar House fragrance catalogue in Undi. Browse products and enquire directly on WhatsApp.","social_image":"/images/raihaan-hero.png"}'::jsonb, true)
on conflict (key) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.offers enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "categories_public_read_active" on public.categories;
create policy "categories_public_read_active" on public.categories
  for select to anon, authenticated using (active = true);
drop policy if exists "categories_admin_manage" on public.categories;
create policy "categories_admin_manage" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_public_read_active" on public.products;
create policy "products_public_read_active" on public.products
  for select to anon, authenticated using (status = 'active');
drop policy if exists "products_admin_manage" on public.products;
create policy "products_admin_manage" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variants_public_read_active_product" on public.product_variants;
create policy "variants_public_read_active_product" on public.product_variants
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.status = 'active')
  );
drop policy if exists "variants_admin_manage" on public.product_variants;
create policy "variants_admin_manage" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "offers_public_read_current" on public.offers;
create policy "offers_public_read_current" on public.offers
  for select to anon, authenticated using (
    active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
  );
drop policy if exists "offers_admin_manage" on public.offers;
create policy "offers_admin_manage" on public.offers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_public_read" on public.site_settings;
create policy "settings_public_read" on public.site_settings
  for select to anon, authenticated using (is_public = true);
drop policy if exists "settings_admin_manage" on public.site_settings;
create policy "settings_admin_manage" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Product and variant changes are one transaction. Direct callers must be admins;
-- the browser never receives a service-role credential.
create or replace function public.admin_save_product(p_product jsonb, p_variants jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
  product_name text;
  product_slug text;
  product_status text;
  item jsonb;
  item_label text;
  item_price numeric;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_product) <> 'object' or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Invalid product data';
  end if;
  product_name := trim(coalesce(p_product->>'name', ''));
  product_slug := trim(coalesce(p_product->>'slug', ''));
  product_status := coalesce(p_product->>'status', 'draft');
  if length(product_name) not between 1 and 150 or product_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Enter a valid product name and slug';
  end if;
  if product_status not in ('draft', 'review', 'active', 'archived') then
    raise exception 'Invalid product status';
  end if;
  if product_status = 'active' and jsonb_array_length(p_variants) = 0 then
    raise exception 'Active products need at least one verified size and price';
  end if;

  if nullif(p_product->>'id', '') is null then
    insert into public.products (name, slug, description, category_id, image_url, status, featured, best_seller)
    values (
      product_name, product_slug, nullif(trim(coalesce(p_product->>'description', '')), ''),
      nullif(p_product->>'category_id', '')::uuid, nullif(trim(coalesce(p_product->>'image_url', '')), ''),
      product_status, coalesce((p_product->>'featured')::boolean, false), coalesce((p_product->>'best_seller')::boolean, false)
    ) returning id into v_product_id;
  else
    v_product_id := (p_product->>'id')::uuid;
    update public.products set
      name = product_name,
      slug = product_slug,
      description = nullif(trim(coalesce(p_product->>'description', '')), ''),
      category_id = nullif(p_product->>'category_id', '')::uuid,
      image_url = nullif(trim(coalesce(p_product->>'image_url', '')), ''),
      status = product_status,
      featured = coalesce((p_product->>'featured')::boolean, false),
      best_seller = coalesce((p_product->>'best_seller')::boolean, false),
      updated_at = now()
    where id = v_product_id;
    if not found then raise exception 'Product not found'; end if;
  end if;

  delete from public.product_variants where product_variants.product_id = v_product_id;
  for item in select value from jsonb_array_elements(p_variants)
  loop
    item_label := trim(coalesce(item->>'label', ''));
    if length(item_label) not between 1 and 80 then raise exception 'Each option needs a name'; end if;
    item_price := nullif(item->>'price', '')::numeric;
    if item_price is null or item_price < 0 then raise exception 'Each option needs a valid non-negative price'; end if;
    insert into public.product_variants (product_id, label, unit, price)
    values (v_product_id, item_label, nullif(trim(coalesce(item->>'unit', '')), ''), item_price);
  end loop;
  return v_product_id;
end;
$$;

revoke all on function public.admin_save_product(jsonb, jsonb) from public;
grant execute on function public.admin_save_product(jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
