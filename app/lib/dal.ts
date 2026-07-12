import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return { userId: session.userId };
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  return user;
});

export async function requireUser() {
  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) {
    redirect("/login");
  }
  return user;
}
