import { describe, expect, it } from "vitest";
import { formatteerIban, isGeldigBtwId, isGeldigEmail, isGeldigIban, isGeldigKvk, isGeldigPostcode, normaliseerPostcode } from "./validatie";

describe("validatie bedrijfsgegevens", () => {
  it("KvK: precies 8 cijfers", () => {
    expect(isGeldigKvk("12345678")).toBe(true);
    expect(isGeldigKvk("1234 5678")).toBe(true);
    expect(isGeldigKvk("1234567")).toBe(false);
    expect(isGeldigKvk("123456789")).toBe(false);
    expect(isGeldigKvk("1234567a")).toBe(false);
  });
  it("btw-id: NL + 9 cijfers + B + 2 cijfers", () => {
    expect(isGeldigBtwId("NL123456789B01")).toBe(true);
    expect(isGeldigBtwId("nl 1234.56789 b01")).toBe(true);
    expect(isGeldigBtwId("NL123456789B1")).toBe(false);
    expect(isGeldigBtwId("NL12345678B01")).toBe(false);
    expect(isGeldigBtwId("BE123456789B01")).toBe(false);
  });
  it("IBAN: lengte en mod 97", () => {
    expect(isGeldigIban("NL91 ABNA 0417 1643 00")).toBe(true);
    expect(isGeldigIban("NL91ABNA0417164300")).toBe(true);
    expect(isGeldigIban("NL91ABNA0417164301")).toBe(false);
    expect(isGeldigIban("NL91ABNA04171643")).toBe(false);
    expect(isGeldigIban("DE89370400440532013000")).toBe(true);
    expect(formatteerIban("nl91abna0417164300")).toBe("NL91 ABNA 0417 1643 00");
  });
  it("e-mail en postcode", () => {
    expect(isGeldigEmail("jan@devries.nl")).toBe(true);
    expect(isGeldigEmail("jan@devries")).toBe(false);
    expect(isGeldigPostcode("1234 AB")).toBe(true);
    expect(isGeldigPostcode("1234AB")).toBe(true);
    expect(isGeldigPostcode("12345")).toBe(false);
    expect(normaliseerPostcode("1234ab")).toBe("1234 AB");
  });
});
