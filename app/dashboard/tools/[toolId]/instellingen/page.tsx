import { redirect } from "next/navigation";

// Naam wijzigen, dupliceren en verwijderen zitten in het menu van de editor.
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}`);
}
