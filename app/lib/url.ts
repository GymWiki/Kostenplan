import "server-only";
import { headers } from "next/headers";

export async function getBaseUrl() {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function getPortalUrl(slug: string) {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/portaal/${slug}`;
}
