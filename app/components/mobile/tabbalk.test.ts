import { describe, expect, it } from "vitest";
import { verbergtTabbalk } from "./tabbalk";

describe("verbergtTabbalk", () => {
  it.each([
    "/dashboard/facturen/cmabc123",
    "/dashboard/leads/abc/offerte",
    "/dashboard/tools/abc",
    "/dashboard/tools/abc/editor",
  ])("verbergt de tabbalk op %s (daar staat een actiebalk)", (pad) => {
    expect(verbergtTabbalk(pad)).toBe(true);
  });
  it.each(["/dashboard", "/dashboard/leads", "/dashboard/facturen", "/dashboard/tools", "/dashboard/tools/nieuw", "/dashboard/profiel"])("toont de tabbalk op %s", (pad) => {
    expect(verbergtTabbalk(pad)).toBe(false);
  });
});
