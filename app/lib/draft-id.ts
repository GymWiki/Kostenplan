// Los van draft.ts (dat zod meetrekt) zodat de landingspagina geen zod in de browser laadt.
export function nieuweId(): string {
  const c = globalThis.crypto;
  return c?.randomUUID ? c.randomUUID() : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
