"use server";

import { bookSlot } from "@/lib/booking";
import { readInvite } from "@/lib/invite";
import { presentBooking, type PresentedBooking } from "@/lib/present";
import { cleanText } from "@/lib/token";

export type BookActionResult =
  | { status: "booked"; booking: PresentedBooking }
  | { status: "already_booked"; booking: PresentedBooking }
  | { status: "slot_unavailable" }
  | { status: "expired" }
  | { status: "error"; message: string };

const CONTACT_MAX = 80;
const MESSAGE_MAX = 500;

export async function bookAction(
  token: unknown,
  start: unknown,
  contact: unknown,
  message: unknown,
): Promise<BookActionResult> {
  if (typeof token !== "string" || typeof start !== "string") {
    return { status: "error", message: "Richiesta non valida." };
  }
  const read = readInvite(token);
  if (read.kind !== "ok") return { status: "error", message: "Questo invito non è valido." };
  if (read.expired) return { status: "expired" };

  const details = {
    contact: typeof contact === "string" ? cleanText(contact.replace(/\s+/g, " "), CONTACT_MAX) || null : null,
    message: typeof message === "string" ? cleanText(message, MESSAGE_MAX) || null : null,
  };

  try {
    const result = await bookSlot(read.invite, start, details);
    if (result.status === "slot_unavailable") return result;
    if (result.status === "booked") return { status: "booked", booking: presentBooking(result.booking) };
    return { status: "already_booked", booking: presentBooking(result.booking) };
  } catch (error) {
    console.error("[book] errore durante la prenotazione", error);
    return {
      status: "error",
      message: "Non sono riuscito a parlare con il calendario. Riprova tra qualche minuto.",
    };
  }
}
