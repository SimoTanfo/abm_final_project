/** Generazione di un file iCalendar (RFC 5545) con un singolo evento, orari in UTC */

export type IcsEvent = {
  uid: string;
  start: number;
  end: number;
  summary: string;
  description?: string;
  /** Promemoria, in minuti prima dell'inizio */
  alarmMinutesBefore?: number;
  now?: number;
};

function utc(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Spezza le righe oltre 75 byte, senza tagliare caratteri UTF-8 a metà */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Date with Simone//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utc(event.now ?? Date.now())}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    ...(event.alarmMinutesBefore
      ? [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeText(event.summary)}`,
          `TRIGGER:-PT${event.alarmMinutesBefore}M`,
          "END:VALARM",
        ]
      : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Link "aggiungi a Google Calendar", utile quando il download del file non funziona (browser in-app) */
export function googleCalendarUrl(event: Pick<IcsEvent, "start" | "end" | "summary" | "description">): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.summary,
    dates: `${utc(event.start)}/${utc(event.end)}`,
    ...(event.description ? { details: event.description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
