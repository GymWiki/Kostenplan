import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Vereist voor Google OAuth-verificatie van de "Inloggen met Google"-functie
// (zie signInWithGoogleAction in app/lib/actions/auth.ts): een pagina die
// zonder JavaScript leesbaar is en uitlegt welke Google-gegevens de app
// opvraagt en waarom. Alleen de standaard OpenID Connect-scopes (openid,
// email, profile) worden gebruikt — er wordt geen custom scope aangevraagd
// in signInWithOAuth(), dus geen toegang tot Gmail, Drive, Contacten,
// Agenda of andere Google-diensten.
export function GoogleDataSection() {
  return (
    <section className="border-y border-border bg-secondary/40 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Hoe gebruiken we jouw Google-gegevens?
            </h2>
            <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Kostenplan gebruikt Google alleen voor &ldquo;Inloggen met Google&rdquo; op de
                inlog- en registratiepagina. We vragen daarbij uitsluitend je naam, e-mailadres
                en profielfoto op (de standaard OpenID Connect-gegevens die Google deelt bij een
                inlog) — geen toegang tot je Gmail, Drive, Contacten, Agenda of andere
                Google-diensten.
              </p>
              <p>
                Deze gegevens gebruiken we uitsluitend om je account aan te maken en je
                vervolgens snel en veilig te laten inloggen, zonder dat je een apart wachtwoord
                hoeft te onthouden.
              </p>
              <p>
                We delen deze gegevens nooit met derden. Lees precies hoe we omgaan met je
                gegevens in ons{" "}
                <Link href="/privacybeleid" className="font-medium text-primary hover:underline">
                  privacybeleid
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
