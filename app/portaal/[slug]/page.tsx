import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { Calculator } from "./calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await prisma.user.findUnique({ where: { slug } });
  if (!user) return { title: "Kostencalculator" };
  return {
    title: `Kostencalculator ${user.bedrijfsnaam}`,
    description: `Bereken direct een schatting van de kosten voor jouw tuinproject bij ${user.bedrijfsnaam}.`,
  };
}

export default async function PortaalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await prisma.user.findUnique({
    where: { slug },
    include: {
      costSettings: true,
      services: {
        where: { actief: true },
        orderBy: { order: "asc" },
      },
      products: {
        where: { actief: true },
        orderBy: { order: "asc" },
        include: {
          materiaalCategorieen: {
            orderBy: { order: "asc" },
            include: {
              materialen: {
                where: { actief: true },
                orderBy: { order: "asc" },
              },
            },
          },
          extraOpties: {
            where: { actief: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!user || !user.costSettings) notFound();

  return (
    <Calculator
      bedrijfsnaam={user.bedrijfsnaam}
      email={user.email}
      costSettings={user.costSettings}
      services={user.services}
      products={user.products}
    />
  );
}
