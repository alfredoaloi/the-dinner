# The Dinner

L'**Invito** a una cena: una pagina statica in italiano, senza backend e senza account, pubblicato gratis su GitHub Pages. Vocabolario del progetto in [GLOSSARY.md](GLOSSARY.md).

HTML, CSS e JavaScript puro (moduli ES): nessuna dipendenza, nessun build step, nessuna risorsa esterna.

## Pubblicazione: i due passi dell'organizzatore

L'Invito si pubblica da solo a ogni push su `master`, ma due cose può farle solo il proprietario del repository:

1. **Rendere pubblico il repository.** Oggi è privato; su un account Free GitHub Pages richiede un repo pubblico. Su GitHub: *Settings* > *General* > *Danger Zone* > *Change visibility* > *Make public*. Da quel momento tutto ciò che sta nel repo è pubblico: non scriverci mai l'indirizzo di casa.
2. **Attivare Pages con sorgente "GitHub Actions".** Su GitHub: *Settings* > *Pages* > *Build and deployment* > *Source* > **GitHub Actions**.

Fatti i due passi, il prossimo push su `master` (o un avvio manuale del workflow dalla scheda *Actions*) pubblica l'Invito su `https://<utente>.github.io/the-dinner/`.

Il workflow (`.github/workflows/deploy.yml`) prima esegue i test; solo se passano pubblica i file statici (`index.html` e `src/`).

## Come cambiare i contenuti

Tutti i contenuti stanno in **un solo file**: [`src/config.js`](src/config.js). Non serve toccare altro.

- `cena`: data e ora della cena, in un solo campo, con l'offset del fuso Europe/Rome (`+01:00` ora solare, `+02:00` ora legale).
- `apertura`: da quando l'Invito è aperto. Deve essere 2 settimane prima della cena.
- `invitati`: per ogni **Invitato** un `nome` e un **Messaggio personalizzato**.
- `curiosita`: per ogni **Curiosità** un `testo` e una data di `sblocco` esplicita.
- `menu`: `contenuto` e `sblocco` (1 settimana prima della cena).
- `messaggioRifiuto` e `messaggioFinale` ("Si mangia!").

I contenuti d'esempio sono **segnaposto** e sono marcati come tali: nel file iniziano con `SEGNAPOSTO:` e, finché `segnaposto: true`, l'Invito mostra in fondo a ogni schermata una nota discreta che lo dice. Sostituiscili e poi metti `segnaposto: false`. I test controllano che le date siano coerenti (apertura, Menù, Curiosità), che ogni offset `+01:00`/`+02:00` sia quello giusto per quel giorno e che i marcatori `SEGNAPOSTO:` spariscano quando metti `segnaposto: false`.

## Da sostituire prima di condividere il link

Tutto in [`src/config.js`](src/config.js). Spunta ogni voce:

- [ ] **Data della cena** (`cena`): data e ora vere, con offset `+01:00` (ora solare) o `+02:00` (ora legale).
- [ ] **Data di apertura** (`apertura`): esattamente 2 settimane prima della cena.
- [ ] **Invitati** (`invitati`): i nomi veri, uno principale per persona, senza alias. Due nomi uguali una volta normalizzati bloccano l'Invito.
- [ ] **Messaggi personalizzati**: un `messaggio` vero per ogni Invitato.
- [ ] **Curiosità** (`curiosita`): i testi veri, ciascuno con la sua data di `sblocco` tra l'apertura e la cena.
- [ ] **Menù** (`menu`): il `contenuto` vero e lo `sblocco`, esattamente 1 settimana prima della cena.
- [ ] **Date di sblocco**: ricontrollale tutte dopo aver cambiato la cena (i test falliscono se non tornano).
- [ ] **Segnaposto**: togli i `SEGNAPOSTO:` dai testi e metti `segnaposto: false` (così sparisce la nota in fondo alla pagina).
- [ ] Prova ogni fase con `?now=` (vedi sotto), poi `npm test`.

Non scrivere mai l'indirizzo di casa: il repository è pubblico e l'Invito non lo mostra, né deve mostrarlo. Se vuoi dirlo agli amici, fallo in chat.

## Anteprima del link, indicizzazione, risorse esterne

- Titolo e descrizione dell'anteprima (in `index.html`) sono generici: non anticipano messaggi, nomi, Menù né indirizzo. Se li cambi, tienili così.
- La pagina chiede ai motori di ricerca di non indicizzarla (`<meta name="robots" content="noindex, nofollow">`). Non c'è un `robots.txt` di proposito: con GitHub Pages in versione "progetto" (`utente.github.io/the-dinner/`) i crawler leggono solo quello della radice del dominio, e un `Disallow` impedirebbe comunque di leggere il `noindex`.
- Nessuna richiesta a domini esterni: font di sistema, nessuna CDN, nessun analytics. Lo stile è in [`src/style.css`](src/style.css); se cambi i colori, vedi "Palette e contrasti" qui sotto.
- Le animazioni sono leggere e si disattivano con `prefers-reduced-motion` (con il movimento ridotto i palloncini stanno fermi).
- La cornice di festa (festone, sei palloncini che ondeggiano, coriandoli fissi) è markup statico in `index.html`, dentro `<div class="festa">`, fuori da `<main id="invito">` che `src/main.js` ridisegna: così non riparte né si sposta al tick di ogni secondo o a un cambio di vista. È solo SVG/CSS inline, stile in `src/style.css` (sezione "Cornice di festa"), e riusa i colori di `:root` (le trasparenze di aloni e ombre sono `color-mix()` di quelle stesse variabili). Sul telefono quattro palloncini sbucano ai bordi e due salgono dal margine in basso. Non copre mai la scheda: sta dietro (`z-index`) ed è inerte (`pointer-events: none`, `aria-hidden`).
- All'Ingresso riuscito parte un solo scoppio di coriandoli (circa due secondi), una volta per caricamento della pagina: non riparte al tick, con un nome ricordato né a un secondo Ingresso. I pezzi li crea `scoppio()` in `src/main.js` nello strato vuoto `<div class="scoppio">` di `index.html` (ritagliato, inerte) e li toglie a fine animazione. Con il movimento ridotto non parte affatto.

Due **Invitati** il cui nome è uguale una volta normalizzato (maiuscole, spazi e accenti non contano) sono un errore: l'Invito non parte e mostra un messaggio chiaro.

## Palette e contrasti

L'Invito è chiaro e festoso e ha **solo il tema chiaro**: nessuna variante scura, nemmeno se il dispositivo è in modo scuro (`color-scheme` e `theme-color` in `index.html` sono chiaro/crema). Le variabili colore stanno nel blocco `:root` di [`src/style.css`](src/style.css).

- Sfondo crema (`#fff4e0`), scheda bianca con bordo morbido, testo blu notte (`#1c2352`, mai nero), pulsanti corallo con testo blu notte.
- Accenti vivaci: corallo, giallo sole, turchese, rosa, viola. Corallo, giallo, turchese e rosa sono solo decorazione o sfondo di tessere (con testo blu notte), perché su bianco non bastano come testo (2.8, 1.5, 2.2 e 2.4:1). Per il testo normale si usano il viola e le varianti scure (`--corallo-scuro`, `--turchese-scuro`, `--rosa-scuro`).
- Font di sistema, nessuna risorsa esterna: stack arrotondato per i titoli, stack di sistema per il testo.

Contrasti calcolati (WCAG 2.x), soglie 4.5:1 per il testo normale e 3:1 per testo grande, bordi dei campi e anello del focus:

| Coppia | Contrasto |
| --- | --- |
| testo su scheda (su scheda in rilievo, su sfondo) | 14.9 (14.1, 13.6) |
| testo tenue su scheda (su scheda in rilievo) | 7.3 (6.9) |
| testo del pulsante su pulsante | 5.3 |
| bordo dei campi su scheda (su scheda in rilievo) | 4.6 (4.4) |
| anello del focus su scheda (su scheda in rilievo, su sfondo) | 6.9 (6.6, 6.4) |
| testo del rifiuto su sfondo del rifiuto | 5.7 |
| viola / corallo scuro / turchese scuro / rosa scuro su scheda | 6.9 / 5.3 / 6.1 / 5.9 |
| testo blu notte sulle tessere corallo / giallo / turchese / rosa | 5.3 / 9.7 / 6.9 / 6.3 |

[`test/contrasti.test.js`](test/contrasti.test.js) legge le variabili da `:root` e fallisce se una di queste coppie scende sotto soglia: se cambi un colore, lancia `npm test` e aggiorna le cifre qui e nel commento in cima a `src/style.css`.

## Provare le date: `?now=`

Aggiungi `?now=<data ISO>` al link per simulare la data corrente, per esempio `?now=2026-11-28T20:00:00+01:00` per vedere l'apertura. Da quell'istante il tempo scorre a velocità reale. Sono accettate solo date o data-ora ISO 8601 (per esempio `2026-11-28` o `2026-11-28T20:00:00+01:00`); qualunque altro valore (`?now=1`, `?now=2026`, testo libero) viene ignorato e si usa l'ora reale.

## Sviluppo

```
npm test        # esegue i test (node --test, nessuna dipendenza)
```

Per vedere la pagina in locale serve un server statico qualunque, per esempio `python3 -m http.server` nella cartella del repo (i moduli ES non funzionano aprendo il file direttamente).
