import { redirect } from "next/navigation";

// Een nieuwe rekentool maak je in het Rekentools-overzicht ("+ Nieuwe rekentool").
export default function NieuweToolRedirect() {
  redirect("/dashboard/tools");
}
