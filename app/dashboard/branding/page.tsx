import { redirect } from "next/navigation";

// Oude route (huisstijl stond eerst op een eigen pagina).
export default function BrandingRedirect() {
  redirect("/dashboard/profiel/huisstijl");
}
