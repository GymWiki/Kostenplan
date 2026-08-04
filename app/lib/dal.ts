import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { prisma } from "@/app/lib/prisma";
import { resolveActiveMembership } from "@/app/lib/active-company";

// Onthoudt welk bedrijf de gebruiker laatst actief had gekozen (zie de
// bedrijfsswitcher en switchActiveCompanyAction). Alleen relevant zodra
// iemand lid is van 2+ bedrijven — requireActiveCompany() hieronder valt
// terug op het oudste bedrijf als deze cookie ontbreekt, geen match heeft
// met een echt lidmaatschap, of nog nooit gezet is.
export const ACTIEF_BEDRIJF_COOKIE = "kostenplan_actief_bedrijf";

export const verifySupabaseUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
});

// Cached per request: the dashboard layout and every nested dashboard page
// each call requireUser() independently, so without this every single
// dashboard page load would re-query the User row from Postgres twice (once
// for the layout, once for the page) instead of once. Relies on
// verifySupabaseUser() above also being cached and returning the same
// object reference within a request, which is what cache() dedupes on.
//
// Bewust GEEN Company hier aanmaken: de auth-actie (registerAction /
// signInWithGoogleAction) maakt alleen het Supabase Auth-account aan, geen
// Company — dat gebeurt pas op /onboarding/bedrijf, voor zowel Google- als
// e-mail/wachtwoord-gebruikers. requireActiveCompany() hieronder stuurt een
// gebruiker zonder bedrijf daar naartoe, waar createCompanyAction een echte,
// door de gebruiker gekozen naam aan de Company hangt.
const ensureProfile = cache(async (authUser: { id: string; email?: string }) => {
  return prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, email: authUser.email ?? "" },
    update: {},
  });
});

export async function requireUser() {
  const authUser = await verifySupabaseUser();
  return ensureProfile(authUser);
}

// Het bedrijf waarvan de ingelogde gebruiker momenteel de data ziet, plus de
// volledige lijst van bedrijven waar diegene lid van is (voor de
// bedrijfsswitcher — zo hoeft die geen aparte query te doen). Kiest het
// bedrijf uit de ACTIEF_BEDRIJF_COOKIE als die overeenkomt met een echt
// lidmaatschap; anders het oudste (eerste) lidmaatschap. Voor bestaande,
// gemigreerde gebruikers met precies één bedrijf levert dat altijd exact
// hetzelfde bedrijf op, ongeacht de cookie.
export const requireActiveCompany = cache(async () => {
  const user = await requireUser();
  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { company: true },
  });

  // Gebruikers die niet via registerAction zijn binnengekomen (Google-login,
  // of een account rechtstreeks aangemaakt in Supabase Auth) hebben nog geen
  // Company — stuur ze naar de onboarding-pagina om er zelf één aan te maken
  // in plaats van automatisch iets te verzinnen op basis van hun e-mailadres.
  if (memberships.length === 0) {
    redirect("/onboarding/bedrijf");
  }

  const cookieStore = await cookies();
  const gekozenId = cookieStore.get(ACTIEF_BEDRIJF_COOKIE)?.value;
  const actief = resolveActiveMembership(memberships, gekozenId);

  // Lazy einde-van-pauze-check (zie Company.gepauzeerdTot): een gepauzeerd
  // abonnement heeft geen cronjob die op tijd afloopt, dus dit is het moment
  // waarop we dat inhalen — bij de eerstvolgende keer dat iemand van dit
  // bedrijf iets in het dashboard opent nadat de pauze is verstreken.
  let company = actief.company;
  if (company.gepauzeerdTot && company.gepauzeerdTot < new Date()) {
    company = await prisma.company.update({
      where: { id: company.id },
      data: { subscriptionTier: "GRATIS", gepauzeerdTot: null },
    });
  }

  return {
    user,
    company,
    alleBedrijven: memberships.map((m) => (m.company.id === company.id ? company : m.company)),
  };
});

export async function getArbeidStapEenheid(companyId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { companyId },
    select: { arbeidStapEenheid: true },
  });
  return costSettings?.arbeidStapEenheid ?? "UUR";
}

// Cost-settings fields de "Kosten"-sectie van het productformulier nodig
// heeft: wat de company-brede standaardtarieven zijn (om te tonen als het
// product niet afwijkt) en waar de link naar Kosteninstellingen naartoe
// wijst.
export async function getProductPricingSettings(companyId: string) {
  const costSettings = await prisma.costSettings.findUnique({
    where: { companyId },
    select: {
      arbeidEnabled: true,
      arbeidStapEenheid: true,
      arbeidTariefUur: true,
      arbeidTariefDagdeel: true,
      arbeidTariefDag: true,
      arbeidAfronden: true,
      transportEnabled: true,
      transportTarief: true,
      voorrijEnabled: true,
      voorrijTarief: true,
      materiaalEnabled: true,
      btwPercentage: true,
    },
  });
  return (
    costSettings ?? {
      arbeidEnabled: true,
      arbeidStapEenheid: "UUR" as const,
      arbeidTariefUur: 45,
      arbeidTariefDagdeel: 180,
      arbeidTariefDag: 360,
      arbeidAfronden: false,
      transportEnabled: true,
      transportTarief: 0,
      voorrijEnabled: true,
      voorrijTarief: 35,
      materiaalEnabled: true,
      btwPercentage: 21,
    }
  );
}
