import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: (f: () => void) => f() }));

const send = vi.fn();
vi.mock("web-push", () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => send(...a) } }));

const verwijder = vi.fn(async (_a?: unknown) => ({}));
const abonnementen = [
  { id: "a1", endpoint: "https://push.test/1", p256dh: "k1", auth: "s1" },
  { id: "a2", endpoint: "https://push.test/2", p256dh: "k2", auth: "s2" },
];
vi.mock("@/app/lib/prisma", () => ({
  prismaBasis: { pushAbonnement: { findMany: vi.fn(async () => abonnementen), delete: (a: unknown) => verwijder(a) } },
}));

const { pushBeschikbaar, stuurPush } = await import("./versturen");

beforeEach(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  send.mockReset();
  verwijder.mockClear();
});
afterEach(() => {
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
});

describe("push", () => {
  it("is niet beschikbaar zonder sleutels en verstuurt dan niets", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(pushBeschikbaar()).toBe(false);
    expect(await stuurPush("c1", { titel: "t", tekst: "x", url: "/" })).toEqual({ verstuurd: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("stuurt naar alle toestellen van het bedrijf", async () => {
    send.mockResolvedValue({});
    const r = await stuurPush("c1", { titel: "Nieuwe aanvraag", tekst: "Piet", url: "/dashboard/leads?lead=l1" });
    expect(r.verstuurd).toBe(2);
    expect(JSON.parse(send.mock.calls[0][1])).toMatchObject({ titel: "Nieuwe aanvraag", url: "/dashboard/leads?lead=l1" });
  });

  it("ruimt een verlopen toestel (410) op en gaat door met de rest", async () => {
    send.mockRejectedValueOnce({ statusCode: 410 }).mockResolvedValueOnce({});
    const r = await stuurPush("c1", { titel: "t", tekst: "x", url: "/" });
    expect(r.verstuurd).toBe(1);
    expect(verwijder).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("laat een andere fout nooit door naar de aanroeper", async () => {
    send.mockRejectedValue({ statusCode: 500 });
    await expect(stuurPush("c1", { titel: "t", tekst: "x", url: "/" })).resolves.toEqual({ verstuurd: 0 });
    expect(verwijder).not.toHaveBeenCalled();
  });
});
