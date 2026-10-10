import { redirect } from "next/navigation";

// Een werkzaamheid bewerk je in het paneel van de editor.
export default async function Page({ params }: { params: Promise<{ toolId: string; id: string }> }) {
  const { toolId, id } = await params;
  redirect(`/dashboard/tools/${toolId}?paneel=${encodeURIComponent(`werkzaamheid:${id}`)}`);
}
