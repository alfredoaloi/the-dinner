// Strato di presentazione dell'Invito: sottile e senza test.
// Legge URL e orologio, chiede la vista a computeView e la disegna.
// Il nome dell'Invitato è ricordato nel browser (src/memoria.js) solo dopo un Ingresso riuscito.
import { config } from './config.js';
import { creaMemoria } from './memoria.js';
import { computeView } from './view.js';

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

function crea(tag, testo, classe) {
  const el = document.createElement(tag);
  if (testo !== undefined) el.textContent = testo;
  if (classe) el.className = classe;
  return el;
}

function formatoTempo({ giorni, ore, minuti, secondi }) {
  return `${giorni}g ${ore}h ${minuti}m ${secondi}s`;
}

/** Un countdown che si aggiorna sul posto; `leggi(vista)` restituisce il testo da mostrare. */
function countdown(leggi) {
  const el = crea('p', '', 'countdown');
  el.id = 'countdown';
  el.setAttribute('role', 'timer');
  aggiornaCountdown = (vista) => {
    el.textContent = leggi(vista);
  };
  return el;
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
    const rifiuto = crea('p', messaggioRifiuto, 'rifiuto');
    rifiuto.setAttribute('role', 'alert');
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

function disegnaVista(vista) {
  const titolo = crea('h1', 'Un invito a cena');
  const etichetta = crea('p', 'Area riservata', 'etichetta');
  const contenuto = [etichetta, titolo];
  let campoDaFocalizzare;

  switch (vista.kind) {
    case 'chiuso':
      contenuto.push(
        crea('p', "L'Invito non è ancora aperto. Torna tra:"),
        countdown((v) => formatoTempo(v.mancaAllApertura)),
      );
      break;
    case 'ingresso':
    case 'rifiutato': {
      contenuto.push(crea('p', 'Scrivi il tuo nome per entrare.'));
      const { form, campo } = modulo(vista.kind === 'rifiutato' ? vista.messaggio : undefined);
      contenuto.push(form);
      campoDaFocalizzare = campo;
      break;
    }
    case 'dentro':
      contenuto.push(
        crea('p', vista.messaggio, 'messaggio'),
        countdown((v) => (v.cena.siMangia ? v.cena.messaggio : formatoTempo(v.cena.manca))),
        nonSeiTu(),
      );
      break;
  }

  radice.replaceChildren(...contenuto);
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
    const campo = disegnaVista(vista);
    if (campo && dopoTentativo) campo.focus();
  }
  aggiornaCountdown(vista);
}

try {
  disegna();
  setInterval(disegna, 1000);
} catch (errore) {
  // Configurazione non valida (per esempio Invitati duplicati): errore chiaro a schermo.
  radice.replaceChildren(crea('h1', 'Invito non disponibile'), crea('p', errore.message));
  throw errore;
}
