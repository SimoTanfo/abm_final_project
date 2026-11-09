/**
 * Configurazione di "Date with Simone".
 * Modifica questi valori per cambiare disponibilità, durata e testi principali.
 * Gli orari sono sempre espressi nel fuso orario indicato in `timeZone`.
 */

export type TimeRange = {
  /** Ora di inizio della fascia, formato "HH:MM" */
  start: string;
  /** Ora di fine della fascia, formato "HH:MM". L'appuntamento deve finire entro quest'ora. */
  end: string;
};

/** Giorni della settimana ISO: 1 = lunedì ... 7 = domenica */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const weekday: TimeRange[] = [{ start: "18:30", end: "22:30" }];
const weekend: TimeRange[] = [{ start: "11:00", end: "23:00" }];

export const config = {
  /** Il tuo nome, usato nei testi dell'invito */
  hostName: "Simone",

  /** Fuso orario fisso. Ora legale e solare sono gestite automaticamente. */
  timeZone: "Europe/Rome",

  /** Quanti giorni in avanti mostrare gli slot */
  bookingWindowDays: 14,

  /** Preavviso minimo, in ore, tra adesso e l'inizio di uno slot */
  minNoticeHours: 24,

  /** Durata dell'appuntamento in minuti */
  durationMinutes: 120,

  /** Margine libero richiesto prima e dopo ogni evento occupato del calendario, in minuti */
  bufferMinutes: 30,

  /** Ogni quanti minuti può iniziare uno slot */
  slotStepMinutes: 30,

  /** Validità di un link di invito, in giorni */
  inviteValidityDays: 14,

  /**
   * Fasce orarie per giorno della settimana (1 = lunedì, 7 = domenica).
   * Uno slot è valido solo se inizia E finisce dentro una fascia.
   * Puoi mettere più fasce nello stesso giorno, o un array vuoto per escluderlo.
   */
  weeklyHours: {
    1: weekday,
    2: weekday,
    3: weekday,
    4: weekday,
    5: weekday,
    6: weekend,
    7: weekend,
  } satisfies Record<IsoWeekday, TimeRange[]>,

  /** Titolo dell'evento creato sul tuo calendario */
  eventTitle: (guestName: string) => `Appuntamento con ${guestName}`,

  /** Titolo dell'evento nel file .ics che scarica lei */
  guestEventTitle: (hostName: string) => `Appuntamento con ${hostName}`,

  /**
   * Colore dell'evento su Google Calendar (id da "1" a "11"), oppure null per il colore del calendario.
   * "4" = Fenicottero (rosa).
   */
  eventColorId: "4" as string | null,
} as const;

export type AppConfig = typeof config;
