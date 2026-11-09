# Setup: Google Calendar + Vercel

Tempo stimato: 15 minuti. Ti servono un account Google (quello del calendario) e l'account Vercel collegato a GitHub.

## 1. Progetto Google Cloud e Calendar API

1. Apri [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate).
2. Nome progetto: `date-with-simone`. Clicca **Crea** e aspetta la notifica.
3. In alto a sinistra controlla che sia selezionato il progetto appena creato.
4. Apri [la pagina della Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) e clicca **Abilita**.

## 2. Service account e chiave JSON

1. Apri [Crea service account](https://console.cloud.google.com/iam-admin/serviceaccounts/create).
2. Nome: `date-with-simone`. Clicca **Crea e continua**.
3. Ruoli e accesso: non serve niente. Clicca **Continua**, poi **Fine**.
4. Nella lista [Service account](https://console.cloud.google.com/iam-admin/serviceaccounts) clicca sull'email appena creata (tipo `date-with-simone@date-with-simone-123456.iam.gserviceaccount.com`). **Copiala**: ti serve al passo 3.
5. Scheda **Chiavi** > **Aggiungi chiave** > **Crea nuova chiave** > **JSON** > **Crea**. Si scarica un file `.json`.
6. Tieni il file al sicuro e non metterlo mai su GitHub. Dopo il passo 4 puoi cancellarlo.

> Se la creazione della chiave è bloccata da una policy (`iam.disableServiceAccountKeyCreation`), il progetto è sotto un'organizzazione Google Workspace. Con un normale account Gmail non succede. In quel caso crea il progetto con il tuo account personale, senza organizzazione.

## 3. Condividi il tuo Google Calendar con il service account

1. Apri [Impostazioni di Google Calendar](https://calendar.google.com/calendar/r/settings).
2. Nella colonna a sinistra, sotto **Impostazioni dei miei calendari**, clicca sul tuo calendario (quello con il tuo nome).
3. Sezione **Condividi con persone o gruppi specifici** > **Aggiungi persone e gruppi**.
4. Incolla l'email del service account, permesso **Apporta modifiche agli eventi**, clicca **Invia**. Se Google avvisa che l'indirizzo è esterno, conferma.
5. Più in basso, sezione **Integra calendario**: l'**ID calendario** è il tuo indirizzo Gmail. È il valore di `GOOGLE_CALENDAR_ID`.

## 4. Deploy su Vercel

Il codice è nella cartella `date-with-simone/` del branch `claude/date-with-simone-app-1fmu1x` di `simotanfo/abm_final_project`. Scegli una delle due strade.

### Strada A, consigliata: repo dedicato `date-with-simone`

Dal terminale del tuo computer (serve la [GitHub CLI](https://cli.github.com/), già loggata):

```bash
git clone --branch claude/date-with-simone-app-1fmu1x --single-branch \
  https://github.com/simotanfo/abm_final_project.git /tmp/dws
cd /tmp/dws/date-with-simone
git init -b main && git add . && git commit -m "Date with Simone"
gh repo create date-with-simone --private --source . --push
```

Poi su [vercel.com/new](https://vercel.com/new) importa `date-with-simone`. Root Directory: lascia quella di default.

### Strada B: deploy direttamente da questo repo

1. Su [vercel.com/new](https://vercel.com/new) importa `simotanfo/abm_final_project`.
2. **Root Directory** > **Edit** > scegli `date-with-simone`.
3. Dopo il primo deploy: **Settings** > **Git** > **Production Branch** = `claude/date-with-simone-app-1fmu1x` (oppure fai il merge del branch su `main`).

### Variabili d'ambiente (in entrambi i casi)

Nella schermata di import apri **Environment Variables** (oppure dopo: progetto > **Settings** > **Environment Variables**) e aggiungi:

| Nome | Valore |
| --- | --- |
| `ADMIN_PASSWORD` | una password lunga, la usi per entrare in `/admin` |
| `INVITE_SECRET` | almeno 32 caratteri casuali, vedi sotto |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | il campo `client_email` del file JSON |
| `GOOGLE_PRIVATE_KEY` | il campo `private_key` del file JSON, da `-----BEGIN PRIVATE KEY-----` a `-----END PRIVATE KEY-----` compresi |
| `GOOGLE_CALENDAR_ID` | il tuo indirizzo Gmail |

Per `INVITE_SECRET`, da terminale:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Note su `GOOGLE_PRIVATE_KEY`: puoi incollarla così come appare nel JSON (con i `\n` scritti) oppure con gli a capo veri. Le virgolette intorno sono accettate ma non servono.

Clicca **Deploy**. Se hai aggiunto o cambiato variabili dopo il deploy, vai su **Deployments** > menu `...` dell'ultimo deploy > **Redeploy**: le variabili valgono solo per i deploy nuovi.

> Cambiare `INVITE_SECRET` invalida tutti i link già mandati. Cambiare `ADMIN_PASSWORD` ti fa uscire da `/admin` su tutti i dispositivi.

## 5. Prova

1. Apri `https://<il-tuo-progetto>.vercel.app/admin` ed entra con la password.
2. Nella colonna **Collegamento** deve comparire "Google Calendar risponde correttamente". Se c'è un errore, guarda la tabella sotto.
3. Crea un invito con il tuo nome, aprilo, prenota uno slot.
4. Controlla che l'evento "Appuntamento con ..." compaia sul tuo Google Calendar.
5. Cancella l'evento di prova dal calendario: il link torna prenotabile.

## Problemi comuni

| Errore in /admin | Causa e soluzione |
| --- | --- |
| `freebusy: notFound` | Calendario non condiviso con il service account (passo 3) o `GOOGLE_CALENDAR_ID` sbagliato. |
| `Google Calendar API has not been used in project ...` | API non abilitata (passo 1.4) nel progetto del service account. |
| `invalid_grant`, `DECODER routines::unsupported` o `secretOrPrivateKey` | `GOOGLE_PRIVATE_KEY` incompleta: deve includere le righe BEGIN e END. |
| `403 ... writer access` | Hai condiviso con un permesso più basso: serve "Apporta modifiche agli eventi". |
| "Quasi pronto" su `/admin` | Mancano `ADMIN_PASSWORD` o `INVITE_SECRET` (o il secret è più corto di 32 caratteri). Aggiungile e fai Redeploy. |

## Dominio personalizzato (facoltativo)

Progetto Vercel > **Settings** > **Domains** > aggiungi il dominio e segui le istruzioni DNS. I link creati da `/admin` usano automaticamente il dominio da cui apri la pagina.
