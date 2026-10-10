import { redirect } from "next/navigation";

// Werkzaamheden pas je aan in de editor.
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}`);
}
