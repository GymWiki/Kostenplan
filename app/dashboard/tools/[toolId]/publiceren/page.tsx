import { redirect } from "next/navigation";

// Publiceren zit in "Zet op mijn website".
export default async function Page({ params }: { params: Promise<{ toolId: string }> }) {
  const { toolId } = await params;
  redirect(`/dashboard/tools/${toolId}?paneel=website`);
}
