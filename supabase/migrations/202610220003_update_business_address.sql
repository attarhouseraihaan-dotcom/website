-- Update the public business address supplied by the owner.
-- Apply after 202610220001_initial_catalogue.sql.

begin;

update public.site_settings
set value = jsonb_set(
      jsonb_set(value, '{location}', to_jsonb('Raihaan Attar House, Bhimavaram Road, Near Church, Undi, Andhra Pradesh – 534199'::text), true),
      '{landmark}',
      to_jsonb(''::text),
      true
    ),
    is_public = true,
    updated_at = now()
where key = 'business';

commit;
