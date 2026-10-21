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

I contenuti d'esempio sono **segnaposto** e sono marcati come tali: sostituiscili e poi metti `segnaposto: false`. I test controllano che le date siano coerenti (apertura, Menù, Curiosità).

Due **Invitati** il cui nome è uguale una volta normalizzato (maiuscole, spazi e accenti non contano) sono un errore: l'Invito non parte e mostra un messaggio chiaro.

## Provare le date: `?now=`

Aggiungi `?now=<data ISO>` al link per simulare la data corrente, per esempio `?now=2026-11-28T20:00:00+01:00` per vedere l'apertura. Da quell'istante il tempo scorre a velocità reale. Un valore non valido viene ignorato e si usa l'ora reale.

## Sviluppo

```
npm test        # esegue i test (node --test, nessuna dipendenza)
```

Per vedere la pagina in locale serve un server statico qualunque, per esempio `python3 -m http.server` nella cartella del repo (i moduli ES non funzionano aprendo il file direttamente).
