import { describe, expect, it } from "vitest";
import { berekenAfmeting } from "./logo-verklein";

describe("berekenAfmeting", () => {
  it("verkleint tot maximaal 256 px met behoud van verhouding", () => {
    expect(berekenAfmeting(1024, 512)).toEqual({ w: 256, h: 128 });
    expect(berekenAfmeting(100, 50)).toEqual({ w: 100, h: 50 });
  });
});
