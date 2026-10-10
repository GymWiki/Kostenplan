import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/app/lib/gast-opruimen-db", () => ({
  opruimenMogelijk: () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL),
  echteOpruimAfhankelijkheden: () => {
    throw new Error("mag niet aangeroepen worden zonder sleutel");
  },
}));

import { GET } from "./route";

const verzoek = (auth?: string) => new NextRequest("http://localhost/api/cron/gast-opruimen", { headers: auth ? { authorization: auth } : {} });

describe("gast-opruimen cron zonder configuratie", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.restoreAllMocks();
  });

  it("slaat over zonder CRON_SECRET (geen crash)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await GET(verzoek());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ overgeslagen: true });
  });

  it("slaat over zonder SUPABASE_SERVICE_ROLE_KEY", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.CRON_SECRET = "s";
    const res = await GET(verzoek("Bearer s"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ overgeslagen: true });
  });

  it("weigert een verkeerd geheim", async () => {
    process.env.CRON_SECRET = "s";
    expect((await GET(verzoek("Bearer fout"))).status).toBe(401);
  });
});
