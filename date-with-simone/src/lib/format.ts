import { DateTime } from "luxon";
import { config } from "@/config";
import type { Slot } from "./availability";

const zone = config.timeZone;

function local(ms: number): DateTime {
  return DateTime.fromMillis(ms, { zone }).setLocale("it");
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "Sabato 14 novembre" */
export function dayLabel(ms: number): string {
  return capitalize(local(ms).toFormat("cccc d LLLL"));
}

/** "20:00" */
export function timeLabel(ms: number): string {
  return local(ms).toFormat("HH:mm");
}

export type DayGroup = {
  key: string;
  weekdayShort: string;
  dayNumber: string;
  monthShort: string;
  label: string;
  slots: { start: string; time: string }[];
};

/** Raggruppa gli slot per giorno locale, con etichette già pronte in italiano */
export function groupByDay(slots: Slot[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const slot of slots) {
    const dt = local(slot.start);
    const key = dt.toISODate()!;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        weekdayShort: dt.toFormat("ccc").replace(".", ""),
        dayNumber: dt.toFormat("d"),
        monthShort: dt.toFormat("LLL").replace(".", ""),
        label: dayLabel(slot.start),
        slots: [],
      };
      groups.set(key, group);
    }
    group.slots.push({ start: new Date(slot.start).toISOString(), time: timeLabel(slot.start) });
  }
  return [...groups.values()];
}

export type BookingView = {
  start: string;
  end: string;
  dayLabel: string;
  timeLabel: string;
  endTimeLabel: string;
};

export function bookingView(start: number, end: number): BookingView {
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    dayLabel: dayLabel(start),
    timeLabel: timeLabel(start),
    endTimeLabel: timeLabel(end),
  };
}

/** "Ogni appuntamento dura circa 2 ore." */
export function durationLabel(minutes: number): string {
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? `${hours} ${hours === 1 ? "ora" : "ore"}` : `${minutes} minuti`;
  return `Ogni appuntamento dura circa ${text}.`;
}
