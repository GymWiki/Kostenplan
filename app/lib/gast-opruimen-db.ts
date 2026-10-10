import "server-only";

import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/app/lib/prisma";
import type { OpruimAfhankelijkheden } from "@/app/lib/gast-opruimen";

const BUCKET = "product-fotos";

// Admin-client voor Storage en auth.users. Vereist SUPABASE_SERVICE_ROLE_KEY
// (alleen server-side, nooit NEXT_PUBLIC). Zonder die sleutel stopt de job
// liever met een duidelijke fout dan bestanden achter te laten.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY ontbreekt: opruimen van gasten kan niet draaien.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function echteOpruimAfhankelijkheden(): OpruimAfhankelijkheden {
  const admin = adminClient();
  return {
    async zoekVerlopenGasten(grens) {
      const rijen = await prisma.$queryRaw<{ id: string }[]>`
        select id::text as id from auth.users where is_anonymous = true and created_at < ${grens}
      `;
      return rijen.map((r) => r.id);
    },
    bedrijvenVan: (userId) => prisma.company.findMany({ where: { createdBy: userId, gastVerlooptOp: { not: null } }, select: { id: true } }),
    async verwijderBestanden(companyId) {
      let totaal = 0;
      // Elke upload staat onder <companyId>/; in delen verwijderen.
      for (let ronde = 0; ronde < 20; ronde++) {
        const { data, error } = await admin.storage.from(BUCKET).list(companyId, { limit: 100 });
        if (error) throw new Error(`Storage lijst mislukt: ${error.message}`);
        if (!data || data.length === 0) break;
        const { error: wisFout } = await admin.storage.from(BUCKET).remove(data.map((f) => `${companyId}/${f.name}`));
        if (wisFout) throw new Error(`Storage verwijderen mislukt: ${wisFout.message}`);
        totaal += data.length;
      }
      return totaal;
    },
    async verwijderBedrijf(companyId) {
      await prisma.company.delete({ where: { id: companyId } });
    },
    async verwijderGebruiker(userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(`auth-gebruiker verwijderen mislukt: ${error.message}`);
    },
  };
}
