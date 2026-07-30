-- Fix voor "new row violates row-level security policy" bij het uploaden
-- naar de product-fotos-bucket (logo's, materiaal-/extra-optiefoto's).
--
-- De bestaande policies op storage.objects (uit vóór de multi-company-
-- migratie, zie README.md) checken (storage.foldername(name))[1] tegen
-- auth.uid() — de ingelogde gebruiker. Sinds de multi-company-migratie
-- (20260714190000) schrijft uploadFoto() (app/lib/storage.ts) echter naar
-- ${companyId}/... — Company.id is altijd een losse gen_random_uuid()/cuid(),
-- nooit gelijk aan auth.uid(). Elke company-scoped upload faalde hierdoor
-- structureel, niet alleen de nieuwe (gratis) auto-branding-flow.
--
-- Vervangt de policies door een check op company-lidmaatschap i.p.v.
-- eigenaarschap van de map zelf. "CompanyMember" heeft RLS aan zonder eigen
-- policies (net als de meeste tabellen — alleen via Prisma als tabelowner
-- bereikbaar, zie de enable_rls-migraties), dus een rechtstreekse subquery
-- vanuit een storage.objects-policy (die als de "authenticated"-rol
-- draait) zou altijd leeg/false teruggeven. Vandaar een SECURITY DEFINER-
-- functie: draait met de rechten van de eigenaar (de migratie-rol, die
-- CompanyMember al buiten RLS om kan lezen), en geeft alleen een boolean
-- terug — "authenticated" krijgt zo geen rechtstreekse leestoegang tot
-- CompanyMember zelf, alleen de mogelijkheid om lidmaatschap van één
-- specifieke company te bevragen.
create or replace function public.is_company_member(company_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from "CompanyMember"
    where "companyId" = company_id
      and "userId" = auth.uid()::text
  );
$$;

revoke all on function public.is_company_member(text) from public;
grant execute on function public.is_company_member(text) to authenticated;

drop policy if exists "Eigen fotos uploaden" on storage.objects;
drop policy if exists "Eigen fotos vervangen" on storage.objects;
drop policy if exists "Eigen fotos verwijderen" on storage.objects;

create policy "Company-fotos uploaden"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-fotos'
  and public.is_company_member((storage.foldername(name))[1])
);

create policy "Company-fotos vervangen"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-fotos'
  and public.is_company_member((storage.foldername(name))[1])
);

create policy "Company-fotos verwijderen"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-fotos'
  and public.is_company_member((storage.foldername(name))[1])
);

-- Nog steeds geen SELECT-policy nodig: de bucket blijft public, dus
-- leestoegang loopt sowieso via getPublicUrl(), los van RLS. Deze migratie
-- maakt de bucket op geen enkel moment publiek-schrijfbaar — uploaden blijft
-- beperkt tot ingelogde members van de betreffende company.
