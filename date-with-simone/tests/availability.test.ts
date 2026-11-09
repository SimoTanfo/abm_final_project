import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { config } from "@/config";
import { availableSlots, candidateSlots } from "@/lib/availability";

const zone = "Europe/Rome";
const rome = (iso: string) => DateTime.fromISO(iso, { zone }).toMillis();
const fmt = (ms: number) => DateTime.fromMillis(ms, { zone }).toFormat("yyyy-MM-dd HH:mm");
const onDay = (slots: { start: number }[], day: string) =>
  slots.map((s) => fmt(s.start)).filter((s) => s.startsWith(day)).map((s) => s.slice(11));

describe("slot candidati", () => {
  const now = rome("2026-11-09T10:00"); // lunedì
  const slots = candidateSlots(config, now);

  it("feriali: 18:30-22:30 con appuntamento di 2 ore, ogni 30 minuti", () => {
    expect(onDay(slots, "2026-11-10")).toEqual(["18:30", "19:00", "19:30", "20:00", "20:30"]);
  });

  it("weekend: 11:00-23:00", () => {
    const sat = onDay(slots, "2026-11-14");
    expect(sat[0]).toBe("11:00");
    expect(sat.at(-1)).toBe("21:00");
    expect(sat).toHaveLength(21);
    expect(onDay(slots, "2026-11-15")).toHaveLength(21);
  });

  it("rispetta il preavviso minimo di 24 ore", () => {
    expect(onDay(slots, "2026-11-09")).toEqual([]);
    expect(slots[0].start).toBeGreaterThanOrEqual(now + 24 * 3600_000);
  });

  it("non va oltre 14 giorni", () => {
    const last = slots.at(-1)!;
    expect(last.start).toBeLessThanOrEqual(now + 14 * 24 * 3600_000);
    expect(fmt(last.start)).toBe("2026-11-22 21:00"); // domenica 22, ultimo slot del giorno
    expect(onDay(slots, "2026-11-23")).toEqual([]);
  });

  it("ogni slot dura 2 ore", () => {
    for (const s of slots) expect(s.end - s.start).toBe(2 * 3600_000);
  });

  it("non dipende dal fuso del server", () => {
    // Il test gira con TZ=America/New_York (vedi package.json): gli orari restano quelli di Roma
    expect(onDay(slots, "2026-11-10")[0]).toBe("18:30");
  });
});

describe("ora legale e solare", () => {
  it("passaggio all'ora legale (28 marzo 2027)", () => {
    const slots = candidateSlots(config, rome("2027-03-20T12:00"));
    const sat = slots.find((s) => fmt(s.start) === "2027-03-27 11:00")!;
    const sun = slots.find((s) => fmt(s.start) === "2027-03-28 11:00")!;
    expect(new Date(sat.start).toISOString()).toBe("2027-03-27T10:00:00.000Z"); // CET, UTC+1
    expect(new Date(sun.start).toISOString()).toBe("2027-03-28T09:00:00.000Z"); // CEST, UTC+2
    expect(onDay(slots, "2027-03-28")).toHaveLength(21);
  });

  it("ritorno all'ora solare (25 ottobre 2026)", () => {
    const slots = candidateSlots(config, rome("2026-10-20T12:00"));
    const sat = slots.find((s) => fmt(s.start) === "2026-10-24 11:00")!;
    const sun = slots.find((s) => fmt(s.start) === "2026-10-25 11:00")!;
    expect(new Date(sat.start).toISOString()).toBe("2026-10-24T09:00:00.000Z");
    expect(new Date(sun.start).toISOString()).toBe("2026-10-25T10:00:00.000Z");
    expect(onDay(slots, "2026-10-25")).toHaveLength(21);
  });
});

describe("conflitti con il calendario", () => {
  const now = rome("2026-11-09T10:00");

  it("applica 30 minuti di buffer prima e dopo un evento occupato", () => {
    const busy = [{ start: rome("2026-11-11T21:00"), end: rome("2026-11-11T22:00") }];
    const slots = availableSlots(config, busy, now);
    // 18:30-20:30 + 30 min di margine finisce alle 21:00: va bene. Dalle 19:00 in poi no.
    expect(onDay(slots, "2026-11-11")).toEqual(["18:30"]);
  });

  it("un impegno al mattino libera solo gli slot abbastanza distanti", () => {
    const busy = [{ start: rome("2026-11-14T10:00"), end: rome("2026-11-14T13:00") }];
    const sat = onDay(availableSlots(config, busy, now), "2026-11-14");
    expect(sat[0]).toBe("13:30");
  });

  it("un evento occupato tutto il giorno blocca la giornata", () => {
    const busy = [{ start: rome("2026-11-15T00:00"), end: rome("2026-11-16T00:00") }];
    const slots = availableSlots(config, busy, now);
    expect(onDay(slots, "2026-11-15")).toEqual([]);
    expect(onDay(slots, "2026-11-14")).toHaveLength(21);
  });
});
