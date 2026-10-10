import { redirect } from "next/navigation";

// Abonnement is een sectie van Profiel geworden. Query (gewijzigd, checkout)
// blijft behouden zodat terugkeer vanuit Mollie dezelfde melding toont.
export default async function AbonnementRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) if (typeof v === "string") params.set(k, v);
  const q = params.toString();
  redirect(`/dashboard/profiel${q ? `?${q}` : ""}#abonnement`);
}
