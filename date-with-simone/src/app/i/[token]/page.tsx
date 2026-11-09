import type { Metadata } from "next";
import { BookingCard } from "@/components/BookingCard";
import { BookingFlow } from "@/components/BookingFlow";
import { Frame } from "@/components/Frame";
import { Greeting } from "@/components/Greeting";
import { StatusMessage } from "@/components/StatusMessage";
import { config } from "@/config";
import { findBooking, getAvailableSlots } from "@/lib/booking";
import { durationLabel, groupByDay, type DayGroup } from "@/lib/format";
import { readInvite } from "@/lib/invite";
import { presentBooking } from "@/lib/present";
import type { Booking } from "@/lib/calendar";

export async function generateMetadata({ params }: PageProps<"/i/[token]">): Promise<Metadata> {
  const { token } = await params;
  const read = readInvite(token);
  const title = read.kind === "ok" ? `Un invito per ${read.invite.name}` : "Date with Simone";
  return {
    title,
    description: "Scegli tu quando, al resto penso io.",
    openGraph: { title, description: "Scegli tu quando, al resto penso io.", type: "website" },
  };
}

function calendarDown(path: string) {
  return (
    <Frame>
      <StatusMessage
        title="Un attimo di pazienza."
        body={`Il calendario di ${config.hostName} non risponde in questo momento. Riprova tra qualche minuto, l'invito resta valido.`}
        retry={path}
      />
    </Frame>
  );
}

export default async function InvitePage({ params }: PageProps<"/i/[token]">) {
  const { token } = await params;
  const path = `/i/${token}`;
  const read = readInvite(token);

  if (read.kind === "config_error") {
    return (
      <Frame>
        <StatusMessage
          title="Quasi pronto."
          body="Il sito non è ancora configurato del tutto. Se sei Simone, controlla le variabili d'ambiente su Vercel."
        />
      </Frame>
    );
  }

  if (read.kind === "invalid") {
    return (
      <Frame>
        <StatusMessage
          title="Questo link non torna."
          body="Forse si è tagliato mentre lo copiavi. Prova ad aprirlo di nuovo dal messaggio originale, per intero."
        />
      </Frame>
    );
  }

  const { invite, expired } = read;

  // Link monouso: se ha già scelto, mostra la sua scelta e basta
  let booking: Booking | null;
  try {
    booking = await findBooking(invite.id);
  } catch (error) {
    console.error("[invite] ricerca prenotazione fallita", error);
    return calendarDown(path);
  }

  if (booking) {
    return (
      <Frame>
        <BookingCard token={token} guestName={invite.name} booking={presentBooking(booking)} variant="existing" />
      </Frame>
    );
  }

  if (expired) {
    return (
      <Frame>
        <StatusMessage
          title={`Ciao ${invite.name}, questo invito è scaduto.`}
          body={`Gli inviti durano ${config.inviteValidityDays} giorni. Scrivi a ${config.hostName}: te ne manda uno nuovo volentieri.`}
        />
      </Frame>
    );
  }

  let days: DayGroup[];
  try {
    days = groupByDay(await getAvailableSlots());
  } catch (error) {
    console.error("[invite] lettura disponibilità fallita", error);
    return calendarDown(path);
  }

  return (
    <Frame>
      <BookingFlow
        token={token}
        guestName={invite.name}
        hostName={config.hostName}
        durationLabel={durationLabel(config.durationMinutes)}
        days={days}
        greeting={<Greeting name={invite.name} note={invite.note} />}
      />
    </Frame>
  );
}
