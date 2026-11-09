import "server-only";
import { google, type calendar_v3 } from "googleapis";
import { config } from "@/config";
import type { Interval } from "./availability";
import { ConfigError, getGoogleCredentials, isMockCalendar } from "./env";

/** Marcatore salvato su ogni evento creato dall'app */
export const APP_TAG = "date-with-simone";

export type Booking = {
  eventId: string;
  inviteId: string;
  guestName: string;
  contact: string | null;
  start: number;
  end: number;
  /** Creazione dell'evento, ms epoch. Serve a decidere chi vince in caso di prenotazioni simultanee. */
  created: number;
};

export type NewBooking = {
  inviteId: string;
  guestName: string;
  contact: string | null;
  start: number;
  end: number;
  summary: string;
  description: string;
};

export interface CalendarBackend {
  /** Intervalli occupati (solo eventi "occupato"; gli eventi "libero" sono ignorati da freebusy) */
  busy(range: Interval): Promise<Interval[]>;
  /** Prenotazioni attive create da un certo invito */
  findBookings(inviteId: string): Promise<Booking[]>;
  /** Prenotazioni dell'app che si sovrappongono all'intervallo */
  bookingsInRange(range: Interval): Promise<Booking[]>;
  upcomingBookings(now: number, limit?: number): Promise<Booking[]>;
  createBooking(input: NewBooking): Promise<Booking>;
  deleteEvent(eventId: string): Promise<void>;
}

export class CalendarAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarAccessError";
  }
}

const iso = (ms: number) => new Date(ms).toISOString();

/* ---------------------------------------------------------------- Google */

function eventToBooking(ev: calendar_v3.Schema$Event): Booking | null {
  const props = ev.extendedProperties?.private ?? {};
  const startRaw = ev.start?.dateTime ?? ev.start?.date;
  const endRaw = ev.end?.dateTime ?? ev.end?.date;
  if (!ev.id || !props.inviteId || !startRaw || !endRaw || ev.status === "cancelled") return null;
  return {
    eventId: ev.id,
    inviteId: props.inviteId,
    guestName: props.guestName ?? ev.summary ?? "",
    contact: props.contact || null,
    start: Date.parse(startRaw),
    end: Date.parse(endRaw),
    created: ev.created ? Date.parse(ev.created) : 0,
  };
}

function bookings(items: calendar_v3.Schema$Event[] | undefined): Booking[] {
  return (items ?? []).map(eventToBooking).filter((b): b is Booking => b !== null);
}

function describeGoogleError(error: unknown): string {
  const e = error as { code?: number; message?: string; response?: { data?: { error?: { message?: string } } } };
  const detail = e.response?.data?.error?.message ?? e.message ?? String(error);
  return e.code ? `${e.code}: ${detail}` : detail;
}

class GoogleCalendar implements CalendarBackend {
  private api: calendar_v3.Calendar;
  private calendarId: string;

  constructor() {
    const { email, privateKey, calendarId } = getGoogleCredentials();
    const auth = new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
    this.api = google.calendar({ version: "v3", auth });
    this.calendarId = calendarId;
  }

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw new CalendarAccessError(describeGoogleError(error));
    }
  }

  async busy(range: Interval): Promise<Interval[]> {
    const res = await this.call(() =>
      this.api.freebusy.query({
        requestBody: {
          timeMin: iso(range.start),
          timeMax: iso(range.end),
          timeZone: config.timeZone,
          items: [{ id: this.calendarId }],
        },
      }),
    );
    const calendars = res.data.calendars ?? {};
    const entry = calendars[this.calendarId] ?? Object.values(calendars)[0];
    if (!entry) throw new CalendarAccessError("freebusy: calendario non trovato nella risposta");
    if (entry.errors?.length) {
      const reasons = entry.errors.map((e) => e.reason).join(", ");
      throw new CalendarAccessError(
        `freebusy: ${reasons}. Hai condiviso il calendario con il service account?`,
      );
    }
    return (entry.busy ?? [])
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: Date.parse(b.start!), end: Date.parse(b.end!) }));
  }

  async findBookings(inviteId: string): Promise<Booking[]> {
    const res = await this.call(() =>
      this.api.events.list({
        calendarId: this.calendarId,
        privateExtendedProperty: [`inviteId=${inviteId}`],
        singleEvents: true,
        showDeleted: false,
        maxResults: 10,
      }),
    );
    return bookings(res.data.items);
  }

  async bookingsInRange(range: Interval): Promise<Booking[]> {
    const res = await this.call(() =>
      this.api.events.list({
        calendarId: this.calendarId,
        privateExtendedProperty: [`app=${APP_TAG}`],
        timeMin: iso(range.start),
        timeMax: iso(range.end),
        singleEvents: true,
        showDeleted: false,
        maxResults: 50,
      }),
    );
    return bookings(res.data.items);
  }

  async upcomingBookings(now: number, limit = 20): Promise<Booking[]> {
    const res = await this.call(() =>
      this.api.events.list({
        calendarId: this.calendarId,
        privateExtendedProperty: [`app=${APP_TAG}`],
        timeMin: iso(now),
        singleEvents: true,
        orderBy: "startTime",
        showDeleted: false,
        maxResults: limit,
      }),
    );
    return bookings(res.data.items);
  }

  async createBooking(input: NewBooking): Promise<Booking> {
    const res = await this.call(() =>
      this.api.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary: input.summary,
          description: input.description,
          start: { dateTime: iso(input.start), timeZone: config.timeZone },
          end: { dateTime: iso(input.end), timeZone: config.timeZone },
          transparency: "opaque",
          ...(config.eventColorId ? { colorId: config.eventColorId } : {}),
          reminders: { useDefault: true },
          extendedProperties: {
            private: {
              app: APP_TAG,
              inviteId: input.inviteId,
              guestName: input.guestName,
              ...(input.contact ? { contact: input.contact } : {}),
            },
          },
        },
      }),
    );
    const booking = eventToBooking(res.data);
    if (!booking) throw new CalendarAccessError("Evento creato ma risposta inattesa da Google");
    return booking;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.call(() => this.api.events.delete({ calendarId: this.calendarId, eventId }));
  }
}

/* ------------------------------------------------------------------ Mock */

type MockEvent = Booking & { opaque: boolean; isBooking: boolean };

const HOUR = 3_600_000;

function seedMockEvents(now: number): MockEvent[] {
  // Qualche impegno finto per vedere gli slot esclusi in modalità demo
  const day = (offset: number, hour: number) => {
    const d = new Date(now + offset * 24 * HOUR);
    d.setUTCHours(hour, 0, 0, 0);
    return d.getTime();
  };
  const busy = (start: number, hours: number, opaque = true): MockEvent => ({
    eventId: `seed-${start}`,
    inviteId: "",
    guestName: "",
    contact: null,
    start,
    end: start + hours * HOUR,
    created: 0,
    opaque,
    isBooking: false,
  });
  return [
    busy(day(2, 17), 3),
    busy(day(3, 18), 2),
    busy(day(5, 10), 4),
    busy(day(6, 0), 24, false),
    busy(day(8, 16), 5),
  ];
}

class MockCalendar implements CalendarBackend {
  private get events(): MockEvent[] {
    const g = globalThis as unknown as { __dwsMockEvents?: MockEvent[] };
    g.__dwsMockEvents ??= seedMockEvents(Date.now());
    return g.__dwsMockEvents;
  }

  async busy(range: Interval) {
    return this.events
      .filter((e) => e.opaque && e.start < range.end && e.end > range.start)
      .map(({ start, end }) => ({ start, end }));
  }

  async findBookings(inviteId: string) {
    return this.events.filter((e) => e.isBooking && e.inviteId === inviteId);
  }

  async bookingsInRange(range: Interval) {
    return this.events.filter((e) => e.isBooking && e.start < range.end && e.end > range.start);
  }

  async upcomingBookings(now: number, limit = 20) {
    return this.events
      .filter((e) => e.isBooking && e.end > now)
      .sort((a, b) => a.start - b.start)
      .slice(0, limit);
  }

  async createBooking(input: NewBooking) {
    const event: MockEvent = {
      eventId: `mock-${Math.random().toString(36).slice(2)}`,
      inviteId: input.inviteId,
      guestName: input.guestName,
      contact: input.contact,
      start: input.start,
      end: input.end,
      created: Date.now(),
      opaque: true,
      isBooking: true,
    };
    this.events.push(event);
    console.info(`[mock calendar] creato "${input.summary}"\n${input.description}`);
    return event;
  }

  async deleteEvent(eventId: string) {
    const idx = this.events.findIndex((e) => e.eventId === eventId);
    if (idx >= 0) this.events.splice(idx, 1);
  }
}

/* --------------------------------------------------------------- Factory */

let instance: CalendarBackend | null = null;

export function getCalendar(): CalendarBackend {
  if (instance) return instance;
  instance = isMockCalendar() ? new MockCalendar() : new GoogleCalendar();
  return instance;
}

export function isConfigError(error: unknown): boolean {
  return error instanceof ConfigError;
}
