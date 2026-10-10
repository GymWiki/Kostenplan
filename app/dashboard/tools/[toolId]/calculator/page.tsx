import { redirect } from "next/navigation";

// Het voorbeeld van je rekentool is nu de editor zelf.
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}`);
}
