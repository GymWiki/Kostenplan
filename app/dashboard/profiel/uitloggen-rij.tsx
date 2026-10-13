import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/lib/actions/auth";
import { rijBasis } from "@/app/components/instellingen/settings";
import { cn } from "@/app/lib/cn";

// Gewone lijstregel met rode tekst en icoon (geen eigen kaart).
export function UitloggenRij() {
  return (
    <li className="border-b border-border last:border-b-0">
      <form action={logoutAction}>
        <button type="submit" className={cn(rijBasis, "cursor-pointer text-destructive hover:bg-destructive/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-destructive")}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold">Uitloggen</span>
        </button>
      </form>
    </li>
  );
}
