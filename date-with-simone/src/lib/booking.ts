import "server-only";
import { DateTime } from "luxon";
import { config } from "@/config";
import { availableSlots, searchRange, type Slot } from "./availability";
import { getCalendar, type Booking } from "./calendar";
import type { Invite } from "./token";

/** In caso di più prenotazioni per lo stesso invito vince la più vecchia (poi l'id, per essere deterministici) */
function compareBookings(a: Booking, b: Booking): number {
  return a.created - b.created || a.eventId.localeCompare(b.eventId);
}

function earliest(list: Booking[]): Booking | null {
  return [...list].sort(compareBookings)[0] ?? null;
}

export async function getAvailableSlots(now = Date.now()): Promise<Slot[]> {
  const busy = await getCalendar().busy(searchRange(config, now));
  return availableSlots(config, busy, now);
}

export async function findBooking(inviteId: string): Promise<Booking | null> {
  return earliest(await getCalendar().findBookings(inviteId));
}

export type BookingDetails = { contact: string | null; message: string | null };

export type BookResult =
  | { status: "booked"; booking: Booking }
  | { status: "already_booked"; booking: Booking }
  | { status: "slot_unavailable" };

function eventDescription(invite: Invite, details: BookingDetails): string {
  const bookedAt = DateTime.now().setZone(config.timeZone).setLocale("it").toFormat("d LLLL yyyy, HH:mm");
  const lines = [`Prenotato da ${invite.name} con Date with Simone il ${bookedAt}.`, ""];
  lines.push(`Contatto: ${details.contact ?? "non indicato"}`);
  if (details.message) lines.push("", "Il suo messaggio:", details.message);
  if (invite.note) lines.push("", `La tua nota nell'invito: ${invite.note}`);
  return lines.join("\n");
}

/**
 * Prenota uno slot per un invito.
 * 1. se l'invito ha già una prenotazione, la restituisce;
 * 2. ricalcola la disponibilità con freebusy e verifica che lo slot sia ancora libero;
 * 3. crea l'evento;
 * 4. ricontrolla le prenotazioni concorrenti (doppio click, due ragazze sullo stesso orario)
 *    e, se ha perso la gara, cancella il proprio evento.
 */
export async function bookSlot(invite: Invite, startIso: string, details: BookingDetails): Promise<BookResult> {
  const calendar = getCalendar();

  const existing = await findBooking(invite.id);
  if (existing) return { status: "already_booked", booking: existing };

  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return { status: "slot_unavailable" };

  const slot = (await getAvailableSlots()).find((s) => s.start === start);
  if (!slot) return { status: "slot_unavailable" };

  const created = await calendar.createBooking({
    inviteId: invite.id,
    guestName: invite.name,
    contact: details.contact,
    start: slot.start,
    end: slot.end,
    summary: config.eventTitle(invite.name),
    description: eventDescription(invite, details),
  });

  const discard = () => calendar.deleteEvent(created.eventId).catch(() => undefined);

  // Stesso invito prenotato due volte in parallelo: tiene solo la prenotazione più vecchia
  const mine = await calendar.findBookings(invite.id);
  const winner = earliest([...mine.filter((b) => b.eventId !== created.eventId), created])!;
  if (winner.eventId !== created.eventId) {
    await discard();
    return { status: "already_booked", booking: winner };
  }

  // Un altro invito ha preso un orario sovrapposto nello stesso istante
  const buffer = config.bufferMinutes * 60_000;
  const around = await calendar.bookingsInRange({ start: slot.start - buffer, end: slot.end + buffer });
  const rivalFirst = around.some(
    (b) => b.eventId !== created.eventId && b.inviteId !== invite.id && compareBookings(b, created) < 0,
  );
  if (rivalFirst) {
    await discard();
    return { status: "slot_unavailable" };
  }

  return { status: "booked", booking: created };
}
