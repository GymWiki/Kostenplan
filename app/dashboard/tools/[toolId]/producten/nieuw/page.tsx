import { redirect } from "next/navigation";

// Een werkzaamheid toevoegen doe je in de editor.
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}?paneel=toevoegen`);
}
