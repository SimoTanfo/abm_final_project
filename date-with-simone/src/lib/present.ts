import { config } from "@/config";
import { bookingView, type BookingView } from "./format";
import { googleCalendarUrl } from "./ics";

export type PresentedBooking = BookingView & { googleUrl: string };

export const guestEventDescription = `Ci vediamo lì. Al resto pensa ${config.hostName}.`;

/** Dati di una prenotazione pronti per il client: etichette in italiano e link a Google Calendar */
export function presentBooking(booking: { start: number; end: number }): PresentedBooking {
  return {
    ...bookingView(booking.start, booking.end),
    googleUrl: googleCalendarUrl({
      start: booking.start,
      end: booking.end,
      summary: config.guestEventTitle(config.hostName),
      description: guestEventDescription,
    }),
  };
}
