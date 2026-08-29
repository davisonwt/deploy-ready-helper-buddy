-- Field / Hearth / Forge are BUSINESS types, not seed kinds — a farmer is
-- a Field business; everything they sow inherits it. Nullable: existing
-- businesses have no kind until their owner picks one (Profile → My
-- businesses, or the one-time inline picker on /sow/product).
alter table public.companies add column kind text;
alter table public.companies add constraint companies_kind_check
  check (kind is null or kind in ('field', 'hearth', 'forge', 'shop'));
