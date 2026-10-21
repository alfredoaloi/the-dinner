# The Dinner

L'**Invito** a una cena: un sito statico in italiano, senza backend e senza account, pubblicato gratis su GitHub Pages. Vocabolario del progetto in [GLOSSARY.md](GLOSSARY.md).

HTML, CSS e JavaScript puro (moduli ES): nessuna dipendenza, nessun build step, nessuna risorsa esterna.

## Pubblicazione: i due passi dell'organizzatore

Il sito si pubblica da solo a ogni push su `master`, ma due cose può farle solo il proprietario del repository:

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

I contenuti d'esempio sono **segnaposto** e sono marcati come tali: nel file iniziano con `SEGNAPOSTO:` e, finché `segnaposto: true`, l'Invito mostra in fondo a ogni schermata una nota discreta che lo dice. Sostituiscili e poi metti `segnaposto: false`. I test controllano che le date siano coerenti (apertura, Menù, Curiosità).

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
- La pagina chiede ai motori di ricerca di non indicizzarla (`<meta name="robots" content="noindex, nofollow">`). Non c'è un `robots.txt` di proposito: su un sito di progetto GitHub Pages (`utente.github.io/the-dinner/`) i crawler leggono solo quello della radice del dominio, e un `Disallow` impedirebbe comunque di leggere il `noindex`.
- Nessuna richiesta a domini esterni: font di sistema, nessuna CDN, nessun analytics. Lo stile è in [`src/style.css`](src/style.css); se cambi i colori, rifai i conti dei contrasti (il commento in cima al file spiega le soglie).
- Le animazioni sono leggere e si disattivano con `prefers-reduced-motion`.

Due **Invitati** il cui nome è uguale una volta normalizzato (maiuscole, spazi e accenti non contano) sono un errore: l'Invito non parte e mostra un messaggio chiaro.

## Provare le date: `?now=`

Aggiungi `?now=<data ISO>` al link per simulare la data corrente, per esempio `?now=2026-11-28T20:00:00+01:00` per vedere l'apertura. Da quell'istante il tempo scorre a velocità reale. Un valore non valido viene ignorato e si usa l'ora reale.

## Sviluppo

```
npm test        # esegue i test (node --test, nessuna dipendenza)
```

Per vedere la pagina in locale serve un server statico qualunque, per esempio `python3 -m http.server` nella cartella del repo (i moduli ES non funzionano aprendo il file direttamente).
