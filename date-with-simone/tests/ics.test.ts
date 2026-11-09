import { describe, expect, it } from "vitest";
import { buildIcs, foldLine, googleCalendarUrl } from "@/lib/ics";
import { normalizePrivateKey } from "@/lib/env";
import { dayLabel, timeLabel } from "@/lib/format";

describe("file .ics", () => {
  const start = Date.parse("2026-11-14T19:00:00.000Z");
  const ics = buildIcs({
    uid: "abc@date-with-simone",
    start,
    end: start + 2 * 3600_000,
    summary: "Appuntamento con Simone",
    description: "Ci vediamo lì, a presto; davvero\nciao",
    alarmMinutesBefore: 120,
    now: start - 86_400_000,
  });

  it("usa orari UTC e righe CRLF", () => {
    expect(ics).toContain("DTSTART:20261114T190000Z\r\n");
    expect(ics).toContain("DTEND:20261114T210000Z\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("TRIGGER:-PT120M");
  });

  it("fa l'escape del testo", () => {
    expect(ics).toContain(String.raw`DESCRIPTION:Ci vediamo lì\, a presto\; davvero\nciao`);
  });

  it("spezza le righe lunghe a 75 byte", () => {
    const folded = foldLine("DESCRIPTION:" + "è".repeat(100));
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.split("\r\n").slice(1).every((l) => l.startsWith(" "))).toBe(true);
  });

  it("crea il link per Google Calendar", () => {
    const url = new URL(googleCalendarUrl({ start, end: start + 7_200_000, summary: "Appuntamento" }));
    expect(url.searchParams.get("dates")).toBe("20261114T190000Z/20261114T210000Z");
  });
});

describe("utilità", () => {
  it("normalizza la chiave privata con \\n escapati o virgolette", () => {
    const pem = "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n";
    expect(normalizePrivateKey(JSON.stringify(pem).slice(1, -1))).toBe(pem);
    expect(normalizePrivateKey(JSON.stringify(pem))).toBe(pem);
    expect(normalizePrivateKey(pem)).toBe(pem.trim());
  });

  it("formatta le date in italiano, ora di Roma", () => {
    const ms = Date.parse("2026-11-14T19:00:00.000Z");
    expect(dayLabel(ms)).toBe("Sabato 14 novembre");
    expect(timeLabel(ms)).toBe("20:00");
  });
});
