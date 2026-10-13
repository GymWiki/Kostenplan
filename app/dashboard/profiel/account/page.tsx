import type { Metadata } from "next";
import { InstellingenPagina } from "@/app/components/instellingen/instellingen-pagina";
import { laadProfiel } from "@/app/lib/profiel/laad";
import { AccountForm } from "../account-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPagina() {
  const { user } = await laadProfiel();
  return (
    <InstellingenPagina titel="Account">
      <div className="rounded-xl border border-border bg-card p-4">
        <AccountForm email={user.email} />
      </div>
    </InstellingenPagina>
  );
}
