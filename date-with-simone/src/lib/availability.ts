import { DateTime } from "luxon";
import type { AppConfig, IsoWeekday } from "@/config";

/** Intervallo di tempo in millisecondi epoch, fine esclusa */
export type Interval = { start: number; end: number };
export type Slot = Interval;

export type AvailabilityRules = Pick<
  AppConfig,
  | "timeZone"
  | "bookingWindowDays"
  | "minNoticeHours"
  | "durationMinutes"
  | "bufferMinutes"
  | "slotStepMinutes"
  | "weeklyHours"
>;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function atLocalTime(day: DateTime, hhmm: string): DateTime {
  const [hour, minute] = hhmm.split(":").map(Number);
  if (hour === 24) return day.plus({ days: 1 }).set({ hour: 0, minute, second: 0, millisecond: 0 });
  return day.set({ hour, minute, second: 0, millisecond: 0 });
}

/** Intervallo [timeMin, timeMax] da chiedere a freebusy per coprire tutti gli slot possibili */
export function searchRange(rules: AvailabilityRules, now: number): Interval {
  return {
    start: now,
    end: now + (rules.bookingWindowDays + 1) * DAY + rules.durationMinutes * MINUTE + rules.bufferMinutes * MINUTE,
  };
}

/**
 * Tutti gli slot teorici secondo le fasce orarie, prima di guardare il calendario.
 * Le date sono calcolate nel fuso `rules.timeZone`, quindi le fasce restano
 * corrette anche nei giorni di cambio tra ora legale e solare.
 */
export function candidateSlots(rules: AvailabilityRules, now: number): Slot[] {
  const zone = rules.timeZone;
  const earliest = now + rules.minNoticeHours * HOUR;
  const latest = now + rules.bookingWindowDays * DAY;
  const duration = rules.durationMinutes;
  const step = Math.max(5, rules.slotStepMinutes);

  const seen = new Set<number>();
  const slots: Slot[] = [];
  let day = DateTime.fromMillis(now, { zone }).startOf("day");
  const lastDay = DateTime.fromMillis(latest, { zone }).startOf("day");

  while (day <= lastDay) {
    const ranges = rules.weeklyHours[day.weekday as IsoWeekday] ?? [];
    for (const range of ranges) {
      const rangeStart = atLocalTime(day, range.start);
      let rangeEnd = atLocalTime(day, range.end);
      if (rangeEnd <= rangeStart) rangeEnd = rangeEnd.plus({ days: 1 });

      for (let t = rangeStart; t.plus({ minutes: duration }) <= rangeEnd; t = t.plus({ minutes: step })) {
        const start = t.toMillis();
        if (start < earliest || start > latest || seen.has(start)) continue;
        seen.add(start);
        slots.push({ start, end: start + duration * MINUTE });
      }
    }
    day = day.plus({ days: 1 });
  }

  return slots.sort((a, b) => a.start - b.start);
}

/** true se lo slot, allargato del buffer, si sovrappone a un intervallo occupato */
export function conflicts(slot: Slot, busy: Interval[], bufferMinutes: number): boolean {
  const from = slot.start - bufferMinutes * MINUTE;
  const to = slot.end + bufferMinutes * MINUTE;
  return busy.some((b) => b.start < to && b.end > from);
}

export function availableSlots(rules: AvailabilityRules, busy: Interval[], now: number): Slot[] {
  return candidateSlots(rules, now).filter((slot) => !conflicts(slot, busy, rules.bufferMinutes));
}
