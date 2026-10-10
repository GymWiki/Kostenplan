import type { Metadata } from "next";
import { requireUser } from "@/app/lib/dal";
import { Importeren } from "./importeren";

export const metadata: Metadata = { title: "Je voorbeeld overnemen", robots: { index: false, follow: false } };

// Na het inloggen of registreren: het voorbeeld uit de browser overnemen in het
// account. Alleen met inlog (proxy.ts stuurt anderen naar /login).
export default async function ImporterenPage() {
  await requireUser();
  return (
    <main id="main-content" className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <Importeren />
    </main>
  );
}
