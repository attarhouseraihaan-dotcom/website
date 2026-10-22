-- Additive catalogue import and owner review flow.
-- Apply after 202610220001_initial_catalogue.sql.

begin;

alter table public.categories
  add column if not exists display_order integer not null default 0;

create index if not exists categories_display_order_idx
  on public.categories (display_order, name);

insert into public.categories (name, slug, active, display_order) values
  ('Attars', 'attars', true, 1),
  ('Perfumes', 'perfumes', true, 2),
  ('Bakhoor', 'bakhoor', true, 3),
  ('Agarbatti & Dhoop Sticks', 'agarbatti-dhoop-sticks', true, 4),
  ('Oudh & More', 'oudh-more', true, 5),
  ('Gift Sets', 'gift-sets', true, 6),
  ('Samples', 'samples', true, 7)
on conflict (slug) do update set
  name = excluded.name,
  active = true,
  display_order = excluded.display_order,
  updated_at = now();

drop policy if exists "categories_public_read_active" on public.categories;
create policy "categories_public_read_active" on public.categories
  for select to anon, authenticated using (
    active = true or exists (
      select 1 from public.products p
      where p.category_id = categories.id and p.status = 'active'
    )
  );

create or replace view public.public_categories
with (security_invoker = true) as
select id, name, slug, description, active, display_order
from public.categories
where active = true or exists (
  select 1 from public.products p
  where p.category_id = categories.id and p.status = 'active'
);
grant select on public.public_categories to anon, authenticated;

create table if not exists public.product_import_entries (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null,
  source_collection text not null check (source_collection in ('attars-collection-1', 'attars-collection-2', 'bakhoor')),
  source_ordinal integer not null check (source_ordinal > 0),
  source_name text not null check (length(trim(source_name)) between 1 and 150),
  category_slug text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text not null check (length(trim(unit)) between 1 and 40),
  source_price numeric(12, 2) not null check (source_price >= 0),
  duplicate_group text,
  review_reason text,
  review_status text not null default 'ready'
    check (review_status in ('ready', 'pending_review', 'published', 'resolved_same', 'resolved_separate')),
  existing_product_id uuid references public.products (id) on delete set null,
  existing_product_name text,
  resolved_product_id uuid references public.products (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (batch_key, source_collection, source_ordinal)
);

create index if not exists product_import_entries_review_idx
  on public.product_import_entries (review_status, duplicate_group, source_collection, source_ordinal);

alter table public.product_import_entries enable row level security;
drop policy if exists "product_import_entries_admin_read" on public.product_import_entries;
create policy "product_import_entries_admin_read" on public.product_import_entries
  for select to authenticated using (public.is_admin());
revoke all on public.product_import_entries from public, anon, authenticated;
grant select on public.product_import_entries to authenticated;

-- One source row is retained for every supplied product line. Only entries with
-- no duplicate/conflict marker are eligible for the initial public import.
insert into public.product_import_entries (
  batch_key, source_collection, source_ordinal, source_name, category_slug,
  quantity, unit, source_price, duplicate_group, review_reason, review_status
)
select
  rows.batch_key, rows.source_collection, rows.source_ordinal, rows.source_name, rows.category_slug,
  rows.quantity, rows.unit, rows.source_price, rows.duplicate_group, rows.review_reason,
  case when rows.duplicate_group is null then 'ready' else 'pending_review' end
from jsonb_to_recordset($source_data$[
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 1,
    "source_name": "Gandam (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 2,
    "source_name": "Spark",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 120.0,
    "duplicate_group": "attars-spark",
    "review_reason": "Potential duplicate across both Attars collections; the listed prices conflict (₹120 and ₹100 per 6 ml). Confirm one price for the same product or distinguish them as separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 3,
    "source_name": "melody",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 160.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 4,
    "source_name": "vennela Musk",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 160.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 5,
    "source_name": "Boss",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 6,
    "source_name": "Musk rizali",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": "attars-musk-rizali",
    "review_reason": "Possible similar-name duplicate (Musk rizali and Musk Al Rizali). Confirm whether these entries are the same product or separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 7,
    "source_name": "aina marza",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 8,
    "source_name": "Champa Real",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 120.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 9,
    "source_name": "Dairy Milk",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 160.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 10,
    "source_name": "Ishq (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 300.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 11,
    "source_name": "impress (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 300.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 12,
    "source_name": "ameer al oudh",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 160.0,
    "duplicate_group": "attars-ameer-al-oudh",
    "review_reason": "Potential duplicate across both Attars collections; the listed prices conflict (₹160 and ₹200 per 6 ml). Confirm one price for the same product or distinguish them as separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 13,
    "source_name": "karpuram",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 14,
    "source_name": "bakoor attar (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 15,
    "source_name": "aseel (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 16,
    "source_name": "musk safi (kannuj)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 180.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 17,
    "source_name": "Arab Oudh (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 220.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 18,
    "source_name": "Strawberry",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 120.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 19,
    "source_name": "matti smell",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 20,
    "source_name": "orange",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 21,
    "source_name": "banana",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 22,
    "source_name": "pineapple",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": "attars-pineapple",
    "review_reason": "Likely duplicate across both Attars collections. Confirm whether these entries are the same product or separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 23,
    "source_name": "Lemmon",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 120.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 24,
    "source_name": "Froot punch",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 25,
    "source_name": "Berry Real",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 120.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-1",
    "source_ordinal": 26,
    "source_name": "labbaik (Premium)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 120.0,
    "duplicate_group": "attars-labbaik",
    "review_reason": "Likely duplicate/alias (Labbaik and LBK) across the two Attars collections. Confirm whether these entries are the same product or separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 1,
    "source_name": "Magnet.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 2,
    "source_name": "Rose.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 3,
    "source_name": "Dove (Best Re Coustys).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 4,
    "source_name": "CR-786.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 5,
    "source_name": "CMK - Park",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 6,
    "source_name": "Firdous (Light).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 7,
    "source_name": "Super Saudi Musk (SSM).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 250.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 8,
    "source_name": "Brown PSN.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 9,
    "source_name": "Multy (Best Seller)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 10,
    "source_name": "Lovely (My Store SPL)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 11,
    "source_name": "KTR Kastoori (My Store SPL Best Seller Repeat Costly)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 12,
    "source_name": "Kastoori (ORG).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 13,
    "source_name": "javadu",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 14,
    "source_name": "spl Javadu Mix",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 15,
    "source_name": "PSN (Best Seller Like a Body Spray)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 16,
    "source_name": "Blue wood.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 17,
    "source_name": "Ice Blue",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 18,
    "source_name": "Chocolate",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 19,
    "source_name": "Johnson (Light).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 20,
    "source_name": "Spark.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 21,
    "source_name": "Lavender",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": "attars-spark",
    "review_reason": "Potential duplicate across both Attars collections; the listed prices conflict (₹120 and ₹100 per 6 ml). Confirm one price for the same product or distinguish them as separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 22,
    "source_name": "Jaanatul Firdous.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 23,
    "source_name": "J-74. (J-)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 50.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 24,
    "source_name": "Shanaya (Arabic Smell).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 180.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 25,
    "source_name": "Liril.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 26,
    "source_name": "Coffee Oud.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 27,
    "source_name": "MS (Mys oor Musk Sandal).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 28,
    "source_name": "Jasmine (మల్లె పువ్వు)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 70.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 29,
    "source_name": "OPM (Open Mind)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 30,
    "source_name": "H&N (Long Lasting up to 8 hrs)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 31,
    "source_name": "Blue Musk (Light) - (CW)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 180.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 32,
    "source_name": "Milad - MLD",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 33,
    "source_name": "Milaf (Hard)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 180.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 34,
    "source_name": "Leechi (Too much sweet upto 8hr easy)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 35,
    "source_name": "White Oudh",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 36,
    "source_name": "Raihaan Oudh",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 37,
    "source_name": "Ameer Al Oudh.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": "attars-ameer-al-oudh",
    "review_reason": "Potential duplicate across both Attars collections; the listed prices conflict (₹160 and ₹200 per 6 ml). Confirm one price for the same product or distinguish them as separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 38,
    "source_name": "Chandanal (Sandal).",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 180.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 39,
    "source_name": "Broot Musk",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 40,
    "source_name": "Biscut.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 41,
    "source_name": "DM (Denver Musk)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 42,
    "source_name": "Musk Al Rizali (Arabic)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": "attars-musk-rizali",
    "review_reason": "Possible similar-name duplicate (Musk rizali and Musk Al Rizali). Confirm whether these entries are the same product or separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 43,
    "source_name": "Pineapple.",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": "attars-pineapple",
    "review_reason": "Likely duplicate across both Attars collections. Confirm whether these entries are the same product or separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 44,
    "source_name": "Guuci Flora",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 45,
    "source_name": "Royal Musk",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 200.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 46,
    "source_name": "Sampangi",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 50.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 47,
    "source_name": "FD",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 100.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 48,
    "source_name": "Mogali",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 50.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 49,
    "source_name": "LBK (Labbaik)",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": "attars-labbaik",
    "review_reason": "Likely duplicate/alias (Labbaik and LBK) across the two Attars collections. Confirm whether these entries are the same product or separate products."
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "attars-collection-2",
    "source_ordinal": 50,
    "source_name": "Musk Al Tahara",
    "category_slug": "attars",
    "quantity": 6,
    "unit": "ml",
    "source_price": 150.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "bakhoor",
    "source_ordinal": 1,
    "source_name": "Royal Touch",
    "category_slug": "bakhoor",
    "quantity": 1.0,
    "unit": "gram",
    "source_price": 15.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "bakhoor",
    "source_ordinal": 2,
    "source_name": "Jordan",
    "category_slug": "bakhoor",
    "quantity": 1.0,
    "unit": "gram",
    "source_price": 11.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "bakhoor",
    "source_ordinal": 3,
    "source_name": "Al Umm",
    "category_slug": "bakhoor",
    "quantity": 1.0,
    "unit": "gram",
    "source_price": 13.0,
    "duplicate_group": null,
    "review_reason": null
  },
  {
    "batch_key": "raihaan-source-catalogue-20261022",
    "source_collection": "bakhoor",
    "source_ordinal": 4,
    "source_name": "Turkish",
    "category_slug": "bakhoor",
    "quantity": 1.0,
    "unit": "gram",
    "source_price": 12.0,
    "duplicate_group": null,
    "review_reason": null
  }
]
$source_data$::jsonb) as rows(
  batch_key text,
  source_collection text,
  source_ordinal integer,
  source_name text,
  category_slug text,
  quantity numeric,
  unit text,
  source_price numeric,
  duplicate_group text,
  review_reason text
)
on conflict (batch_key, source_collection, source_ordinal) do nothing;

with repeated_source_names as (
  select id,
    count(*) over (partition by regexp_replace(lower(trim(source_name)), '[^a-z0-9]+', '', 'g'), quantity, unit) as match_count,
    first_value(id) over (partition by regexp_replace(lower(trim(source_name)), '[^a-z0-9]+', '', 'g'), quantity, unit
      order by source_collection, source_ordinal) as first_id
  from public.product_import_entries
  where batch_key = 'raihaan-source-catalogue-20261022'
    and review_status = 'ready' and duplicate_group is null
)
update public.product_import_entries e set
  duplicate_group = 'repeated-source:' || repeated_source_names.first_id::text,
  review_reason = 'Repeated normalized name and size in the source list. Confirm whether these are the same product or separate products.',
  review_status = 'pending_review'
from repeated_source_names
where repeated_source_names.id = e.id and repeated_source_names.match_count > 1;

-- Match names exactly after case/punctuation normalization only to flag
-- collisions. A match is never merged or updated by this import.
with candidates as (
  select e.id as entry_id, p.id as product_id, p.name as product_name,
    row_number() over (partition by e.id order by p.created_at, p.id) as match_rank
  from public.product_import_entries e
  join public.products p on regexp_replace(lower(trim(p.name)), '[^a-z0-9]+', '', 'g') =
    regexp_replace(lower(trim(e.source_name)), '[^a-z0-9]+', '', 'g')
  where e.batch_key = 'raihaan-source-catalogue-20261022'
    and e.review_status in ('ready', 'pending_review')
)
update public.product_import_entries e set
  existing_product_id = candidates.product_id,
  existing_product_name = candidates.product_name,
  duplicate_group = coalesce(e.duplicate_group, 'existing-product:' || candidates.product_id::text),
  review_reason = concat_ws(' ', nullif(e.review_reason, ''), 'A matching existing product is already in the catalogue: ' || candidates.product_name || '.'),
  review_status = 'pending_review'
from candidates
where candidates.entry_id = e.id and candidates.match_rank = 1;

do $$
declare
  entry record;
  existing_id uuid;
  product_id uuid;
  product_slug text;
  product_base_slug text;
  variant_label text;
begin
  for entry in
    select * from public.product_import_entries
    where batch_key = 'raihaan-source-catalogue-20261022' and review_status = 'ready'
    order by source_collection, source_ordinal
  loop
    product_base_slug := trim(both '-' from regexp_replace(lower(trim(entry.source_name)), '[^a-z0-9]+', '-', 'g'));
    if product_base_slug = '' then
      product_base_slug := 'catalogue-' || entry.source_collection || '-' || entry.source_ordinal::text;
    end if;

    -- Punctuation and case are ignored only for collision detection. Source
    -- spelling stays untouched, and a match always goes to admin review.
    select p.id into existing_id
    from public.products p
    where regexp_replace(lower(trim(p.name)), '[^a-z0-9]+', '', 'g') =
          regexp_replace(lower(trim(entry.source_name)), '[^a-z0-9]+', '', 'g')
    limit 1;

    if existing_id is not null then
      update public.product_import_entries set
        duplicate_group = 'existing-product:' || existing_id::text,
        review_reason = 'A matching product already exists. Review the existing product before importing a second public card.',
        review_status = 'pending_review',
        existing_product_id = existing_id,
        existing_product_name = (select p.name from public.products p where p.id = existing_id)
      where id = entry.id;
      continue;
    end if;

    product_slug := product_base_slug;
    if exists (select 1 from public.products where slug = product_slug) then
      update public.product_import_entries set
        duplicate_group = 'slug-collision:' || entry.id::text,
        review_reason = 'The generated URL slug is already in use. Review the public name before importing this source entry.',
        review_status = 'pending_review'
      where id = entry.id;
      continue;
    end if;

    insert into public.products (category_id, name, slug, status)
    select c.id, entry.source_name, product_slug, 'active'
    from public.categories c where c.slug = entry.category_slug
    returning id into product_id;
    if product_id is null then
      raise exception 'Category % was not found for source entry %', entry.category_slug, entry.source_name;
    end if;

    variant_label := case when entry.quantity = trunc(entry.quantity)
      then trunc(entry.quantity)::text else entry.quantity::text end;
    insert into public.product_variants (product_id, label, unit, price)
    values (product_id, variant_label, entry.unit, entry.source_price);

    update public.product_import_entries set
      review_status = 'published', resolved_product_id = product_id
    where id = entry.id;
  end loop;
end;
$$;

create or replace function public._create_product_from_import_entry(
  p_entry_id uuid,
  p_product_name text,
  p_price numeric,
  p_reuse_existing boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entry public.product_import_entries%rowtype;
  v_product_id uuid;
  v_existing_product_name text;
  variant_id uuid;
  category_id uuid;
  product_base_slug text;
  product_slug text;
  suffix integer := 2;
  variant_label text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select * into entry
  from public.product_import_entries
  where id = p_entry_id and review_status = 'pending_review'
  for update;
  if not found then raise exception 'Source entry is no longer pending review'; end if;
  if length(trim(coalesce(p_product_name, ''))) not between 1 and 150 then
    raise exception 'Enter a public product name';
  end if;
  if p_price is null or p_price < 0 then raise exception 'Enter a valid non-negative price'; end if;

  variant_label := case when entry.quantity = trunc(entry.quantity)
    then trunc(entry.quantity)::text else entry.quantity::text end;

  if p_reuse_existing then
    if entry.existing_product_id is not null then
      select id, name into v_product_id, v_existing_product_name
      from public.products where id = entry.existing_product_id for update;
      if not found then raise exception 'The matching existing product no longer exists'; end if;
    else
      select p.id, p.name into v_product_id, v_existing_product_name
      from public.products p
      where regexp_replace(lower(trim(p.name)), '[^a-z0-9]+', '', 'g') =
        regexp_replace(lower(trim(p_product_name)), '[^a-z0-9]+', '', 'g')
      order by p.created_at, p.id limit 1 for update;
    end if;
  end if;

  if v_product_id is not null then
    if regexp_replace(lower(trim(v_existing_product_name)), '[^a-z0-9]+', '', 'g') <>
       regexp_replace(lower(trim(p_product_name)), '[^a-z0-9]+', '', 'g') then
      raise exception 'This source matches an existing product. Keep its name to update its confirmed variant, or resolve as separate with a distinct name.';
    end if;
    select pv.id into variant_id
    from public.product_variants pv
    where pv.product_id = v_product_id
      and pv.label = variant_label and pv.unit = entry.unit
    order by created_at
    limit 1
    for update;
    if variant_id is null then
      insert into public.product_variants (product_id, label, unit, price)
      values (v_product_id, variant_label, entry.unit, p_price);
    else
      update public.product_variants set price = p_price
      where id = variant_id;
    end if;
    update public.products set status = 'active', updated_at = now() where id = v_product_id;
    return v_product_id;
  end if;

  if exists (
    select 1 from public.products p
    where regexp_replace(lower(trim(p.name)), '[^a-z0-9]+', '', 'g') =
          regexp_replace(lower(trim(p_product_name)), '[^a-z0-9]+', '', 'g')
  ) then
    raise exception 'A product with a matching name already exists. Review that product or choose a distinct public name.';
  end if;
  select id into category_id from public.categories where slug = entry.category_slug;
  if category_id is null then raise exception 'The source category no longer exists'; end if;

  product_base_slug := trim(both '-' from regexp_replace(lower(trim(p_product_name)), '[^a-z0-9]+', '-', 'g'));
  if product_base_slug = '' then product_base_slug := 'catalogue-product'; end if;
  product_slug := product_base_slug;
  while exists (select 1 from public.products where slug = product_slug) loop
    product_slug := product_base_slug || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  insert into public.products (category_id, name, slug, status)
  values (category_id, trim(p_product_name), product_slug, 'active')
  returning id into v_product_id;
  insert into public.product_variants (product_id, label, unit, price)
  values (v_product_id, variant_label, entry.unit, p_price);
  return v_product_id;
end;
$$;

revoke all on function public._create_product_from_import_entry(uuid, text, numeric, boolean) from public, anon, authenticated;

create or replace function public.admin_resolve_product_import_group(
  p_duplicate_group text,
  p_resolution text,
  p_products jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  entry record;
  item jsonb;
  item_id uuid;
  product_id uuid;
  product_ids jsonb := '[]'::jsonb;
  entry_count integer;
  payload_count integer;
  existing_count integer;
  existing_rows integer;
  category_count integer;
  quantity_count integer;
  unit_count integer;
  product_name text;
  product_price numeric;
  normalized_names integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_resolution not in ('same', 'separate') then raise exception 'Choose same or separate products'; end if;
  if jsonb_typeof(p_products) <> 'array' then raise exception 'Product decisions must be an array'; end if;

  perform id from public.product_import_entries
  where duplicate_group = p_duplicate_group and review_status = 'pending_review'
  for update;
  select count(*) into entry_count from public.product_import_entries
  where duplicate_group = p_duplicate_group and review_status = 'pending_review';
  if entry_count = 0 then raise exception 'This review group is no longer pending'; end if;
  payload_count := jsonb_array_length(p_products);

  if p_resolution = 'same' then
    if payload_count <> 1 then raise exception 'One confirmed product name and price are required'; end if;
    item := p_products -> 0;
    product_name := trim(coalesce(item->>'name', ''));
    product_price := nullif(item->>'price', '')::numeric;
    if product_name = '' or product_price is null or product_price < 0 then
      raise exception 'Enter the confirmed public name and one valid price';
    end if;
    select count(distinct category_slug), count(distinct quantity), count(distinct unit),
      count(distinct existing_product_id), count(*) filter (where existing_product_id is not null)
    into category_count, quantity_count, unit_count, existing_count, existing_rows
    from public.product_import_entries
    where duplicate_group = p_duplicate_group and review_status = 'pending_review';
    if category_count <> 1 or quantity_count <> 1 or unit_count <> 1 then
      raise exception 'These source entries do not share the same category, size, and unit';
    end if;
    if existing_rows > 0 and (existing_rows <> entry_count or existing_count <> 1) then
      raise exception 'The entries point to different existing products; resolve them separately';
    end if;
    select id into item_id from public.product_import_entries
    where duplicate_group = p_duplicate_group and review_status = 'pending_review'
    order by source_collection, source_ordinal limit 1;
    product_id := public._create_product_from_import_entry(item_id, product_name, product_price, existing_rows = entry_count);
    update public.product_import_entries set
      review_status = 'resolved_same', resolved_product_id = product_id,
      reviewed_by = auth.uid(), reviewed_at = now()
    where duplicate_group = p_duplicate_group and review_status = 'pending_review';
    return jsonb_build_object('resolution', 'same', 'product_id', product_id, 'source_entries', entry_count);
  end if;

  if payload_count <> entry_count then raise exception 'Confirm a name and price for each source entry'; end if;
  select count(distinct regexp_replace(lower(trim(coalesce(value->>'name', ''))), '[^a-z0-9]+', '', 'g'))
  into normalized_names from jsonb_array_elements(p_products);
  if normalized_names <> entry_count then raise exception 'Separate products need distinct public names'; end if;

  for entry in
    select * from public.product_import_entries
    where duplicate_group = p_duplicate_group and review_status = 'pending_review'
    order by source_collection, source_ordinal
  loop
    select value into item from jsonb_array_elements(p_products)
    where value->>'source_entry_id' = entry.id::text;
    if item is null then raise exception 'Each source entry must have its own confirmed product'; end if;
    product_name := trim(coalesce(item->>'name', ''));
    product_price := nullif(item->>'price', '')::numeric;
    if product_name = '' or product_price is null or product_price < 0 then
      raise exception 'Enter a distinct public name and valid source price for every entry';
    end if;
    product_id := public._create_product_from_import_entry(entry.id, product_name, product_price, false);
    update public.product_import_entries set
      review_status = 'resolved_separate', resolved_product_id = product_id,
      reviewed_by = auth.uid(), reviewed_at = now()
    where id = entry.id;
    product_ids := product_ids || jsonb_build_array(product_id);
  end loop;
  return jsonb_build_object('resolution', 'separate', 'product_ids', product_ids, 'source_entries', entry_count);
end;
$$;

revoke all on function public.admin_resolve_product_import_group(text, text, jsonb) from public, anon;
grant execute on function public.admin_resolve_product_import_group(text, text, jsonb) to authenticated;

commit;
