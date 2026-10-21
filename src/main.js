// Strato di presentazione dell'Invito: sottile e senza test.
// Legge URL e orologio, chiede la vista a computeView e la disegna.
// Il nome dell'Invitato è ricordato nel browser (src/memoria.js) solo dopo un Ingresso riuscito.
import { config } from './config.js';
import { creaMemoria } from './memoria.js';
import { computeView } from './view.js';
import { creaTempoMancante } from './tempo.js';

/**
 * Orologio dell'Invito. Con `?now=<data ISO>` valida, l'istante indicato è il
 * punto di partenza e poi il tempo scorre a velocità reale; altrimenti ora reale.
 */
function creaOrologio(ricerca) {
  const simulato = Date.parse(new URLSearchParams(ricerca).get('now') ?? '');
  if (Number.isNaN(simulato)) {
    return () => Date.now();
  }
  const partenza = Date.now();
  return () => simulato + (Date.now() - partenza);
}

const adesso = creaOrologio(window.location.search);
const radice = document.getElementById('invito');
const memoria = creaMemoria(() => window.localStorage);

let nomeScritto = memoria.leggi();
let nomeDaMemoria = nomeScritto !== undefined; // il nome viene dal browser, non dall'Ingresso di questa visita
let tentativo = 0;
let chiaveDisegnata;
let aggiornaCountdown = () => {};
let aggiornaMenu = () => {};
let aggiornaCuriosita = () => {};

function crea(tag, testo, classe) {
  const el = document.createElement(tag);
  if (testo !== undefined) el.textContent = testo;
  if (classe) el.className = classe;
  return el;
}

/** Un countdown che si aggiorna sul posto; `leggi(vista)` restituisce il Tempo (o il testo finale) da mostrare. */
function countdown(etichetta, leggi) {
  const { elemento, aggiorna } = creaTempoMancante(etichetta);
  elemento.id = 'countdown';
  aggiornaCountdown = (vista) => aggiorna(leggi(vista));
  return elemento;
}

/**
 * La sezione Menù: finché è bloccata mostra solo il teaser con il countdown allo
 * sblocco; dall'istante di sblocco mostra il contenuto. Si aggiorna sul posto
 * (`aggiornaMenu`), quindi passa da teaser a contenuto senza ridisegnare la pagina.
 */
function sezioneMenu() {
  const sezione = crea('section', undefined, 'menu');
  let sbloccatoMostrato; // assente finché la sezione non è stata disegnata
  let aggiornaTempo = () => {};

  aggiornaMenu = ({ menu }) => {
    if (menu.sbloccato !== sbloccatoMostrato) {
      sbloccatoMostrato = menu.sbloccato;
      const titolo = crea('h2', 'Menù');
      if (menu.sbloccato) {
        aggiornaTempo = () => {};
        sezione.replaceChildren(titolo, crea('p', menu.contenuto));
      } else {
        const { elemento, aggiorna } = creaTempoMancante('Tempo che manca allo sblocco del Menù');
        aggiornaTempo = aggiorna;
        sezione.replaceChildren(titolo, crea('p', 'Il Menù è ancora un segreto. Si sblocca tra:'), elemento);
      }
    }
    if (!menu.sbloccato) aggiornaTempo(menu.manca);
  };
  return sezione;
}

/** L'Ingresso: campo del nome con etichetta, più l'eventuale messaggio di rifiuto. */
function modulo(messaggioRifiuto) {
  const form = crea('form', undefined, 'ingresso');
  form.noValidate = true;

  const etichetta = crea('label', 'Il tuo nome');
  etichetta.htmlFor = 'nome';
  const campo = crea('input');
  campo.id = 'nome';
  campo.name = 'nome';
  campo.type = 'text';
  campo.autocomplete = 'off';
  campo.autocapitalize = 'words';
  campo.spellcheck = false;
  const bottone = crea('button', 'Entra');
  bottone.type = 'submit';

  form.append(etichetta, campo, bottone);
  if (messaggioRifiuto) {
    const rifiuto = crea('div', undefined, 'rifiuto');
    rifiuto.setAttribute('role', 'alert');
    rifiuto.append(crea('strong', 'Accesso negato'), crea('span', messaggioRifiuto));
    form.append(rifiuto);
  }

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    nomeScritto = campo.value;
    nomeDaMemoria = false;
    tentativo += 1;
    disegna(true);
  });
  return { form, campo };
}

/** Il link "non sei tu?": cancella il nome ricordato e riporta all'Ingresso. */
function nonSeiTu() {
  const bottone = crea('button', 'non sei tu?', 'non-sei-tu');
  bottone.type = 'button';
  bottone.addEventListener('click', () => {
    memoria.dimentica();
    nomeScritto = undefined;
    nomeDaMemoria = false;
    disegna(true);
  });
  return bottone;
}

/**
 * La sezione Curiosità: quelle sbloccate in ordine di data, poi (se ne restano) il teaser
 * con il tempo mancante alla prossima. Si aggiorna sul posto con `aggiornaCuriosita(vista)`:
 * la lista si ridisegna solo quando se ne sblocca una nuova.
 */
function sezioneCuriosita() {
  const sezione = crea('section', undefined, 'curiosita');
  const lista = crea('ul', undefined, 'lista-curiosita');
  const teaser = crea('div', undefined, 'teaser-curiosita');
  const { elemento: tempo, aggiorna: aggiornaTempo } = creaTempoMancante('Tempo che manca alla prossima Curiosità');
  teaser.append(crea('p', 'La prossima Curiosità si sblocca tra:'), tempo);
  sezione.append(crea('h2', 'Curiosità'), lista, teaser);

  let mostrate = -1;
  aggiornaCuriosita = ({ curiosita: { sbloccate, prossima } }) => {
    if (sbloccate.length !== mostrate) {
      mostrate = sbloccate.length;
      lista.replaceChildren(...sbloccate.map((testo) => crea('li', testo)));
    }
    lista.hidden = sbloccate.length === 0;
    teaser.hidden = prossima === undefined;
    if (prossima) aggiornaTempo(prossima);
    sezione.hidden = sbloccate.length === 0 && prossima === undefined; // nessuna Curiosità in configurazione
  };
  return sezione;
}

/** La riga di stato in alto: spia, etichetta "Area riservata" e un timbro che dice a che punto siamo. */
function rigaDiStato(testoTimbro, riconosciuto = false) {
  const spia = crea('span', undefined, 'spia');
  spia.setAttribute('aria-hidden', 'true');
  const etichetta = crea('p', undefined, 'etichetta');
  etichetta.append(spia, 'Area riservata');
  const timbro = crea('p', testoTimbro, riconosciuto ? 'timbro timbro-ok' : 'timbro');
  const riga = crea('div', undefined, 'stato');
  riga.append(etichetta, timbro);
  return riga;
}

/** Nota discreta, visibile finché i contenuti in src/config.js sono ancora segnaposto. */
function notaSegnaposto() {
  return crea(
    'p',
    "Contenuti segnaposto: date, nomi e testi sono di prova e l'organizzatore deve ancora sostituirli.",
    'nota-segnaposto',
  );
}

function disegnaVista(vista) {
  const titolo = crea('h1', 'Un invito a cena');
  const contenuto = [titolo];
  let riga;
  let campoDaFocalizzare;

  switch (vista.kind) {
    case 'chiuso':
      riga = rigaDiStato('Accesso chiuso');
      contenuto.push(
        crea('p', "L'Invito non è ancora aperto: gli addetti stanno ancora apparecchiando."),
        crea('p', 'Torna tra:', 'didascalia'),
        countdown("Tempo che manca all'apertura dell'Invito", (v) => v.mancaAllApertura),
      );
      break;
    case 'ingresso':
    case 'rifiutato': {
      riga = rigaDiStato(vista.kind === 'rifiutato' ? 'Non in lista' : 'Solo amici');
      contenuto.push(crea('p', 'Area a numero chiuso. Scrivi il tuo nome per entrare: niente password, ci fidiamo (quasi).'));
      const { form, campo } = modulo(vista.kind === 'rifiutato' ? vista.messaggio : undefined);
      contenuto.push(form);
      campoDaFocalizzare = campo;
      break;
    }
    case 'dentro': {
      riga = rigaDiStato('Accesso consentito', true);
      const didascalia = crea('p', 'Alla cena mancano:', 'didascalia');
      const conto = countdown('Tempo che manca alla cena', (v) => (v.cena.siMangia ? v.cena.messaggio : v.cena.manca));
      const aggiornaTempoCena = aggiornaCountdown;
      aggiornaCountdown = (v) => {
        aggiornaTempoCena(v);
        didascalia.hidden = v.cena.siMangia; // "Si mangia!" non ha bisogno di didascalia
      };
      contenuto.push(crea('p', vista.messaggio, 'messaggio'), didascalia, conto, sezioneMenu(), sezioneCuriosita(), nonSeiTu());
      break;
    }
  }
  if (config.segnaposto) contenuto.push(notaSegnaposto());

  radice.replaceChildren(riga, ...contenuto);
  return campoDaFocalizzare;
}

/**
 * Ricalcola la vista. Ridisegna tutto solo se la vista è cambiata (o dopo un
 * tentativo all'Ingresso); altrimenti aggiorna sul posto il countdown, così
 * il tick di ogni secondo non cancella quello che l'Invitato sta scrivendo.
 */
function disegna(dopoTentativo = false) {
  const vista = computeView(config, adesso(), nomeScritto);
  if (vista.kind === 'rifiutato' && nomeDaMemoria) {
    // Il nome ricordato non è più in lista: lo si dimentica e si torna all'Ingresso.
    memoria.dimentica();
    nomeScritto = undefined;
    nomeDaMemoria = false;
    return disegna(dopoTentativo);
  }
  if (vista.kind === 'dentro' && dopoTentativo && !nomeDaMemoria) {
    memoria.salva(nomeScritto); // solo dopo un Ingresso riuscito
  }
  const chiave = `${vista.kind}:${vista.kind === 'dentro' ? vista.messaggio : tentativo}`;
  if (chiave !== chiaveDisegnata) {
    chiaveDisegnata = chiave;
    aggiornaCountdown = () => {};
    aggiornaMenu = () => {};
    aggiornaCuriosita = () => {};
    const campo = disegnaVista(vista);
    if (campo && dopoTentativo) campo.focus();
  }
  aggiornaCountdown(vista);
  if (vista.kind === 'dentro') {
    aggiornaMenu(vista);
    aggiornaCuriosita(vista);
  }
}

try {
  disegna();
  setInterval(disegna, 1000);
} catch (errore) {
  // Configurazione non valida (per esempio Invitati duplicati): errore chiaro a schermo.
  radice.replaceChildren(crea('h1', 'Invito non disponibile'), crea('p', errore.message));
  throw errore;
}
