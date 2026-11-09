import { config } from "@/config";
import { findBooking } from "@/lib/booking";
import { buildIcs } from "@/lib/ics";
import { readInvite } from "@/lib/invite";
import { guestEventDescription } from "@/lib/present";

/** File .ics della prenotazione, per "Aggiungi al mio calendario" */
export async function GET(_request: Request, ctx: RouteContext<"/i/[token]/calendar.ics">) {
  const { token } = await ctx.params;
  const read = readInvite(token);
  if (read.kind !== "ok") return new Response("Invito non valido", { status: 404 });

  let booking;
  try {
    booking = await findBooking(read.invite.id);
  } catch (error) {
    console.error("[ics] ricerca prenotazione fallita", error);
    return new Response("Calendario non raggiungibile, riprova tra poco", { status: 503 });
  }
  if (!booking) return new Response("Nessun appuntamento per questo invito", { status: 404 });

  const ics = buildIcs({
    uid: `${read.invite.id}@date-with-simone`,
    start: booking.start,
    end: booking.end,
    summary: config.guestEventTitle(config.hostName),
    description: guestEventDescription,
    alarmMinutesBefore: 120,
  });

  const filename = `appuntamento-con-${config.hostName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`;
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
