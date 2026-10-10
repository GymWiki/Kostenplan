import { redirect } from "next/navigation";

// Uiterlijk past je aan door in de editor op de kop te klikken.
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}?paneel=uiterlijk`);
}
