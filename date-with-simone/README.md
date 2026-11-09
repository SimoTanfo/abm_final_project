# Date with Simone

Sito personale per invitare una ragazza a un appuntamento. Crei un link da `/admin`, lei lo apre dal telefono, sceglie un orario libero tra quelli del tuo Google Calendar e l'evento compare sul tuo calendario.

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4
- Google Calendar tramite service account (`googleapis`)
- Nessun database: inviti firmati con HMAC, Google Calendar come unica fonte di verità
- Fuso orario fisso `Europe/Rome`, ora legale e solare gestite con Luxon

Per mettere online il sito segui **[SETUP.md](./SETUP.md)**.

## Come funziona

1. **`/admin`** (password `ADMIN_PASSWORD`): scrivi il nome e una nota facoltativa, ottieni un link `/i/<token>` con i pulsanti Copia, Condividi e Anteprima. Nella stessa pagina vedi i prossimi appuntamenti e lo stato del collegamento a Google.
2. **`/i/<token>`**: verifica firma e scadenza (14 giorni), poi cerca sul calendario un evento con `inviteId` uguale a quello del token. Se c'è, mostra "Hai già scelto: ... Ci vediamo lì!". Altrimenti mostra saluto, nota e i giorni con gli orari liberi.
3. Lei sceglie giorno e ora, lascia un contatto e un messaggio se vuole, conferma.
4. Il server ricalcola la disponibilità con freebusy, crea l'evento "Appuntamento con <nome>" con contatto e messaggio nella descrizione e `extendedProperties.private.inviteId`, poi ricontrolla eventuali prenotazioni concorrenti.
5. Schermata di conferma con data e ora, pulsante **Aggiungi al mio calendario** (file `.ics` da `/i/<token>/calendar.ics`) e link di riserva a Google Calendar.

## Modificare disponibilità e testi

Tutto in [`src/config.ts`](./src/config.ts): finestra di prenotazione, preavviso, durata, buffer, passo degli slot, fasce orarie per giorno della settimana, titolo dell'evento, colore. I testi delle pagine sono nei componenti in `src/components/`.

Valori attuali:

| Regola | Valore |
| --- | --- |
| Finestra | prossimi 14 giorni |
| Preavviso minimo | 24 ore |
| Durata | 2 ore |
| Buffer | 30 minuti prima e dopo ogni evento occupato |
| Fasce | lun-ven 18:30-22:30, sab-dom 11:00-23:00 |
| Passo | uno slot ogni 30 minuti |

## Sviluppo locale

```bash
npm install
cp .env.example .env.local    # compila i valori
npm run dev                   # http://localhost:3000/admin
```

Per provare tutto senza Google c'è un calendario finto in memoria:

```bash
ADMIN_PASSWORD=prova INVITE_SECRET=$(openssl rand -hex 32) npm run dev:demo
```

La modalità demo (`CALENDAR_MOCK=1`) è ignorata nel deploy di produzione di Vercel e, quando è attiva, compare l'etichetta "Modalità demo" in fondo alla pagina.

Controlli:

```bash
npm test          # slot, ora legale/solare, token, .ics
npm run typecheck
npm run lint
npm run build
```

## Struttura

```
src/
  config.ts                     regole di disponibilità e testi base
  app/
    page.tsx                    home (solo un messaggio, nessun link all'admin)
    admin/                      login, generatore di inviti, prossimi appuntamenti
    i/[token]/page.tsx          pagina invito
    i/[token]/actions.ts        server action di prenotazione
    i/[token]/calendar.ics/     download del file .ics
  components/                   UI (BookingFlow, BookingCard, Greeting, ...)
  lib/
    availability.ts             calcolo slot, puro e testato
    booking.ts                  prenotazione con controlli anti doppia prenotazione
    calendar.ts                 Google Calendar (service account) + calendario demo
    token.ts / session.ts       firma HMAC di inviti e sessione admin
    ics.ts / format.ts          file .ics e date in italiano
tests/                          test Vitest
```

## Scelte fatte

Dove la richiesta lasciava una scelta aperta ho preso la strada più semplice e robusta:

- **Dove sta il codice.** Da questa sessione non potevo creare repository GitHub né collegare Vercel, quindi l'app è nella cartella `date-with-simone/` del branch `claude/date-with-simone-app-1fmu1x`. SETUP.md spiega come spostarla in un repo dedicato in un minuto oppure come fare il deploy dalla sottocartella.
- **Cache Components disattivato.** Next 16 lo propone attivo, ma ogni pagina qui dipende da token, cookie e calendario: il rendering dinamico classico è più semplice e prevedibile.
- **La nota è un messaggio per lei.** Il token è firmato ma non cifrato, quindi chi ha il link può leggerne il contenuto. Per questo la nota compare nell'invito sotto il saluto (e nella descrizione dell'evento), e l'admin avvisa di non scriverci niente di privato.
- **Uno slot deve stare tutto dentro la fascia.** Con 2 ore di durata, nei feriali gli inizi possibili sono 18:30, 19:00, 19:30, 20:00 e 20:30. Nel weekend dalle 11:00 alle 21:00.
- **Finestra di 14 giorni** misurata dall'inizio dello slot rispetto ad adesso.
- **Disponibilità solo da freebusy.** I titoli dei tuoi eventi non vengono mai letti né mandati al browser. Freebusy considera solo gli eventi "Occupato": gli eventi tutto il giorno, che Google crea come "Libero", non bloccano nulla finché non li segni come occupati.
- **Link monouso.** Prima di mostrare gli slot e prima di prenotare si cerca un evento con `privateExtendedProperty inviteId=<id>`. La ricerca avviene prima del controllo di scadenza, così lei vede la sua scelta anche dopo i 14 giorni. Se cancelli l'evento dal calendario, il link torna prenotabile (se non è scaduto).
- **Doppia prenotazione senza database.** Dopo aver creato l'evento il server rilegge il calendario: se lo stesso invito ha due eventi (doppio tap) o un altro invito ha preso un orario sovrapposto nello stesso istante, tiene l'evento creato per primo e cancella l'altro. Chi perde vede "Questo orario non è più libero" e la lista aggiornata.
- **Niente invito email a lei.** Un service account non può aggiungere invitati senza Google Workspace e delega a livello di dominio. Lei riceve il file `.ics` e il link a Google Calendar; il contatto che lascia finisce nella descrizione dell'evento e nella lista in `/admin`.
- **File .ics** con orari in UTC (nessun problema di fuso), promemoria 2 ore prima, servito con `Content-Type: text/calendar` inline perché su iPhone apre direttamente "Aggiungi al calendario". Il link a Google Calendar è la riserva per i browser interni delle app (Hinge, Instagram) che a volte bloccano i download.
- **Sessione admin** in un cookie `httpOnly` firmato, valido 30 giorni, con chiave derivata da `INVITE_SECRET` e `ADMIN_PASSWORD`: cambiando la password escono tutti. Ogni password sbagliata attende quasi un secondo per rallentare i tentativi.
- **Privacy.** `noindex` su tutto il sito, `robots.txt` che blocca i crawler, `Referrer-Policy: no-referrer` perché il token non finisca nei log di altri siti.
- **Permessi Google.** Lo scope è `auth/calendar`: il service account vede solo i calendari che gli hai condiviso esplicitamente.
- **Design.** Tutto in italiano, mobile first, chiaro o scuro in base al telefono. Cormorant Garamond per i titoli (un invito ha il tono di un biglietto scritto), Geist per il testo, un solo accento rosa. Le animazioni sono solo CSS e si spengono con "riduci movimento".
- **Il tuo nome** è in `config.hostName`: cambiandolo si aggiornano tutti i testi, il titolo del file `.ics` e la firma della nota.
