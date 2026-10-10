import "server-only";

import { prisma } from "@/app/lib/prisma";
import { logGastGebeurtenis } from "@/app/lib/gast-log";

// Na het koppelen: het gast-bedrijf wordt een gewoon bedrijf (geen vervaldatum
// meer). Alleen aangeroepen vanuit /auth/callback; bewust géén server action.
export async function rondGastKoppelingAf(userId: string, via: "google" | "email") {
  const r = await prisma.company.updateMany({
    where: { createdBy: userId, gastVerlooptOp: { not: null } },
    data: { gastVerlooptOp: null },
  });
  if (r.count > 0) await logGastGebeurtenis(via === "google" ? "account_gemaakt_google" : "account_gemaakt_email", { userId });
}
