import { redirect } from "next/navigation";

// Aanvraagformulier past je aan door in de editor op het formulier te klikken.
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}?paneel=aanvraag`);
}
